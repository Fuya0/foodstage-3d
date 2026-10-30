import { describe, expect, it } from 'vitest';
import { AssetStore } from './assets';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

describe('AssetStore', () => {
  it('deduplicates in-flight requests, publishes stable immutable snapshots and reuses ready assets', async () => {
    const pending = deferred<{ scene: string }>();
    let calls = 0;
    const store = new AssetStore(1, () => { calls++; return pending.promise; });
    const before = store.getSnapshot();
    expect(before[0]?.status).toBe('pending');
    expect(store.getSnapshot()).toBe(before);
    const first = store.load(0);
    expect(store.load(0)).toBe(first);
    expect(store.retry(0)).toBe(first);
    expect(store.getSnapshot()[0]?.status).toBe('loading');
    const loading = store.getSnapshot();
    expect(loading).not.toBe(before);
    expect(before[0]?.status).toBe('pending');
    const asset = { scene: 'parsed GLB' };
    pending.resolve(asset);
    expect(await first).toMatchObject({ status: 'ready', asset });
    expect(store.getSnapshot()[0]).toMatchObject({ status: 'ready', asset });
    expect(loading[0]?.status).toBe('loading');
    expect(Object.isFrozen(store.getSnapshot())).toBe(true);
    expect(Object.isFrozen(store.getSnapshot()[0])).toBe(true);
    await store.load(0);
    await store.retry(0);
    expect(calls).toBe(1);
  });

  it('loads the first asset on demand then preloads the remainder sequentially', async () => {
    const requests = [deferred<string>(), deferred<string>(), deferred<string>(), deferred<string>()];
    const order: number[] = [];
    const store = new AssetStore(4, index => { order.push(index); return requests[index]!.promise; });
    expect(order).toEqual([]);
    const first = store.load(0);
    await flush();
    expect(order).toEqual([0]);
    requests[0]!.resolve('zero');
    await first;
    await flush();
    expect(order).toEqual([0, 1]);
    requests[1]!.resolve('one');
    await flush();
    expect(order).toEqual([0, 1, 2]);
    requests[2]!.resolve('two');
    await flush();
    expect(order).toEqual([0, 1, 2, 3]);
    requests[3]!.resolve('three');
    await flush();
    expect(store.getSnapshot().map(item => item.status)).toEqual(['ready', 'ready', 'ready', 'ready']);
  });

  it('stores parse failures without rejecting; retry alone starts a new request and resumes preload', async () => {
    let attempts = 0;
    const parseError = new Error('GLB parse failed');
    const order: number[] = [];
    const store = new AssetStore(3, async index => {
      order.push(index);
      if (index === 1 && attempts++ === 0) throw parseError;
      return `asset-${index}`;
    });
    await store.load(0);
    await flush();
    expect(store.getSnapshot()[1]).toEqual({ status: 'error', error: parseError });
    expect(order).toEqual([0, 1]);
    expect(await store.load(1)).toEqual({ status: 'error', error: parseError });
    expect(order).toEqual([0, 1]);
    expect(await store.retry(1)).toEqual({ status: 'ready', asset: 'asset-1' });
    await flush();
    expect(store.getSnapshot()[2]).toEqual({ status: 'ready', asset: 'asset-2' });
    expect(order).toEqual([0, 1, 1, 2]);
  });

  it('captures synchronous loader throws and leaves ignored load promises handled', async () => {
    const error = new Error('synchronous parser failure');
    const store = new AssetStore<string>(1, () => { throw error; });
    void store.load(0);
    await flush();
    expect(store.getSnapshot()[0]).toEqual({ status: 'error', error });
  });

  it('notifies subscribers only while subscribed and isolates a new store from old results', async () => {
    const pending = deferred<string>();
    const old = new AssetStore(1, () => pending.promise);
    const current = new AssetStore(1, async () => 'new');
    const statuses: string[] = [];
    const unsubscribe = old.subscribe(() => statuses.push(old.getSnapshot()[0]!.status));
    const oldLoad = old.load(0);
    expect(statuses).toEqual(['loading']);
    unsubscribe();
    unsubscribe();
    pending.resolve('old');
    await oldLoad;
    expect(statuses).toEqual(['loading']);
    expect(current.getSnapshot()[0]?.status).toBe('pending');
    await current.load(0);
    expect(current.getSnapshot()[0]).toEqual({ status: 'ready', asset: 'new' });
  });

  it('rejects invalid store sizes and indices synchronously before loading', () => {
    expect(() => new AssetStore(0, async () => '')).toThrow(RangeError);
    const store = new AssetStore(4, async () => '');
    for (const index of [-1, 4, 1.5, NaN]) {
      expect(() => store.load(index)).toThrow(RangeError);
      expect(() => store.retry(index)).toThrow(RangeError);
    }
  });
});
