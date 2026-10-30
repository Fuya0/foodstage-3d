export type AssetEntry<T> =
  | { readonly status: 'pending' | 'loading' }
  | { readonly status: 'ready'; readonly asset: T }
  | { readonly status: 'error'; readonly error: unknown };
export type AssetLoader<T> = (index: number) => Promise<T>;

/** Per-instance parsed-asset cache. Loader failures resolve as error entries, never rejected promises. */
export class AssetStore<T> {
  private snapshot: readonly AssetEntry<T>[];
  private readonly listeners = new Set<() => void>();
  private readonly requests = new Map<number, Promise<AssetEntry<T>>>();

  constructor(private readonly count: number, private readonly loader: AssetLoader<T>) {
    if (!Number.isInteger(count) || count < 1) throw new RangeError('Asset count must be a positive integer');
    this.snapshot = Object.freeze(Array.from({ length: count }, () => Object.freeze({ status: 'pending' as const })));
  }

  /** Stable between status changes; safe to pass directly to useSyncExternalStore. */
  getSnapshot = (): readonly AssetEntry<T>[] => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  };

  /** Loads on demand. Errors stay cached until retry; success resumes sequential background preload. */
  load(index: number): Promise<AssetEntry<T>> {
    this.validate(index);
    const active = this.requests.get(index);
    if (active) return active;
    const entry = this.snapshot[index]!;
    if (entry.status === 'ready' || entry.status === 'error') return Promise.resolve(entry);
    return this.request(index);
  }

  /** Retry only failed entries; pending/loading/ready entries retain load's dedup/cache semantics. */
  retry(index: number): Promise<AssetEntry<T>> {
    this.validate(index);
    return this.snapshot[index]!.status === 'error' ? this.request(index) : this.load(index);
  }

  private validate(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.count) throw new RangeError('Invalid asset index');
  }

  private publish(index: number, entry: AssetEntry<T>): void {
    const next = [...this.snapshot];
    next[index] = Object.freeze(entry);
    this.snapshot = Object.freeze(next);
    for (const listener of this.listeners) listener();
  }

  private request(index: number): Promise<AssetEntry<T>> {
    // Defer loader invocation so both synchronous throws and async parsing failures use one path.
    const request = Promise.resolve().then(() => this.loader(index)).then(
      asset => this.settle(index, { status: 'ready', asset }),
      error => this.settle(index, { status: 'error', error }),
    );
    this.requests.set(index, request);
    this.publish(index, { status: 'loading' });
    return request;
  }

  private settle(index: number, entry: AssetEntry<T>): AssetEntry<T> {
    this.requests.delete(index);
    this.publish(index, entry);
    if (entry.status === 'ready') this.preloadNext();
    return this.snapshot[index]!;
  }

  private preloadNext(): void {
    // Stop at the first unresolved stage: no skipping failures or parallel background downloads.
    const index = this.snapshot.findIndex(entry => entry.status !== 'ready');
    if (index >= 0 && this.snapshot[index]!.status === 'pending') void this.load(index);
  }
}
