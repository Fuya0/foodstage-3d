import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { manifest } from '../data/manifest';
import { foodById } from '../data/foods';
import { getReadyPreview, loadPreview } from './menu-preview-asset';
import { createModelStore } from './assets';

describe('shared runtime model requests', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it.each([
    { width: 390, id: 'classic-burger', url: '/models-runtime/burger-0.glb' },
    { width: 1440, id: 'pepperoni-pizza', url: '/models-runtime/pepperoni-pizza-0.glb' },
  ])('requests the same canonical model for preview and tasting at $width px', async ({ width, id, url }) => {
    vi.stubGlobal('window', { innerWidth: width });
    const bytes = new ArrayBuffer(8);
    const fetchModel = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => bytes });
    vi.stubGlobal('fetch', fetchModel);
    const scene = new Group();
    scene.add(new Mesh(new BoxGeometry(2, 1, 1), new MeshStandardMaterial()));
    const parse = vi.spyOn(GLTFLoader.prototype, 'parseAsync').mockResolvedValue({ scene } as GLTF);
    const previewRequest = vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockResolvedValue({ scene } as GLTF);
    const store = createModelStore(foodById(id).stages.slice(0, 1));
    expect(await store.load(0)).toMatchObject({ status: 'ready', asset: { scene } });
    await expect(loadPreview(id)).resolves.toHaveProperty('scale', 1);
    expect(fetchModel).toHaveBeenCalledTimes(1);
    expect(fetchModel.mock.calls[0]![0]).toBe(url);
    expect(previewRequest).toHaveBeenCalledExactlyOnceWith(url);
    expect(parse).toHaveBeenCalledWith(bytes, '/models-runtime/');
  });

  it('loads an explicit custom stage URL without sampling the viewport', async () => {
    vi.stubGlobal('window', { get innerWidth(): never { throw new Error('Viewport must not select model files'); } });
    const fetchModel = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    vi.stubGlobal('fetch', fetchModel);
    vi.spyOn(GLTFLoader.prototype, 'parseAsync').mockResolvedValue({ scene: new Group() } as GLTF);
    const store = createModelStore([{ ...manifest[0]!, url: '/model/custom.glb' }]);
    expect(await store.load(0)).toMatchObject({ status: 'ready' });
    expect(fetchModel.mock.calls[0]![0]).toBe('/model/custom.glb');
  });
});

describe('cancelable tasting models', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('uses a session signal and keeps the model resource base path when parsing', async () => {
    const bytes = new ArrayBuffer(8);
    const fetchModel = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => bytes });
    vi.stubGlobal('fetch', fetchModel);
    const scene = new Group();
    const parse = vi.spyOn(GLTFLoader.prototype, 'parseAsync').mockResolvedValue({ scene } as GLTF);
    const store = createModelStore(manifest.slice(0, 1));
    expect(await store.load(0)).toMatchObject({ status: 'ready', asset: { scene } });
    const [url, options] = fetchModel.mock.calls[0]!;
    expect(url).toBe('/models-runtime/burger-0.glb');
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(parse).toHaveBeenCalledWith(bytes, '/models-runtime/');
  });

  it('does not parse a downloaded body if the screen exits while it is being read', async () => {
    let finish!: (bytes: ArrayBuffer) => void;
    let reading!: () => void;
    const body = new Promise<ArrayBuffer>(resolve => { finish = resolve; });
    const started = new Promise<void>(resolve => { reading = resolve; });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: () => { reading(); return body; } }));
    const parse = vi.spyOn(GLTFLoader.prototype, 'parseAsync');
    const store = createModelStore(manifest.slice(0, 1));
    const request = store.load(0);
    await started;
    store.stop();
    finish(new ArrayBuffer(8));
    expect(await request).toEqual({ status: 'pending' });
    expect(parse).not.toHaveBeenCalled();
  });

  it('disposes a parse that finishes after exit and does not preload another stage', async () => {
    let finish!: (gltf: GLTF) => void;
    let parsing!: () => void;
    const parsed = new Promise<GLTF>(resolve => { finish = resolve; });
    const started = new Promise<void>(resolve => { parsing = resolve; });
    const fetchModel = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    vi.stubGlobal('fetch', fetchModel);
    vi.spyOn(GLTFLoader.prototype, 'parseAsync').mockImplementation(() => { parsing(); return parsed; });
    const geometry = new BoxGeometry();
    const texture = new Texture();
    const material = new MeshStandardMaterial({ map: texture, normalMap: texture });
    const scene = new Group();
    scene.add(new Mesh(geometry, material), new Mesh(geometry, material));
    const geometryDispose = vi.spyOn(geometry, 'dispose');
    const materialDispose = vi.spyOn(material, 'dispose');
    const textureDispose = vi.spyOn(texture, 'dispose');
    const store = createModelStore();
    const request = store.load(0);
    await started;
    store.stop();
    finish({ scene } as GLTF);
    expect(await request).toEqual({ status: 'pending' });
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
    expect(fetchModel).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().every(entry => entry.status === 'pending')).toBe(true);
  });

  it('keeps HTTP failures retryable without parsing the error response', async () => {
    const fetchModel = vi.fn().mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
    vi.stubGlobal('fetch', fetchModel);
    const parse = vi.spyOn(GLTFLoader.prototype, 'parseAsync').mockResolvedValue({ scene: new Group() } as GLTF);
    const store = createModelStore(manifest.slice(0, 1));
    expect(await store.load(0)).toMatchObject({ status: 'error', error: new Error('Failed to load model /models-runtime/burger-0.glb: 503') });
    expect(parse).not.toHaveBeenCalled();
    expect(await store.retry(0)).toMatchObject({ status: 'ready' });
    expect(fetchModel).toHaveBeenCalledTimes(2);
  });
});


describe('borrowing an already prepared first stage', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it('skips a second download and parse, and never disposes the preview-owned model', async () => {
    const url = '/models-runtime/prepared-cache-regression.glb';
    const scene = new Group(), geometry = new BoxGeometry(2, 1, 1);
    scene.add(new Mesh(geometry, new MeshStandardMaterial()));
    vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockResolvedValue({ scene } as GLTF);
    const parse = vi.spyOn(GLTFLoader.prototype, 'parseAsync');
    const fetchModel = vi.fn(); vi.stubGlobal('fetch', fetchModel);
    const dispose = vi.spyOn(geometry, 'dispose');
    await loadPreview('completed-cache', url);
    const ready = getReadyPreview(url);
    expect(ready).toMatchObject({ url, asset: { scene } });
    const store = createModelStore([{ ...manifest[0]!, url }], ready);
    expect(await store.load(0)).toMatchObject({ status: 'ready', asset: { scene } });
    expect(parse).not.toHaveBeenCalled(); expect(fetchModel).not.toHaveBeenCalled();
    store.stop(); expect(dispose).not.toHaveBeenCalled();
  });
  it('never exposes an in-flight preview as a borrowed model', async () => {
    const url = '/models-runtime/pending-cache-regression.glb';
    let finish!: (value: GLTF) => void;
    vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const pending = loadPreview('pending-cache', url);
    expect(getReadyPreview(url)).toBeUndefined();
    const scene = new Group(); scene.add(new Mesh(new BoxGeometry(), new MeshStandardMaterial()));
    finish({ scene } as GLTF); await pending;
    expect(getReadyPreview(url)).toMatchObject({ url, asset: { scene } });
  });
});
