import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { manifest } from '../data/manifest';
import { createModelStore, modelUrlForViewport } from './assets';

describe('model resolution selection', () => {
  it('uses high-detail models for wide viewports', () => {
    expect(modelUrlForViewport('/models-mobile/burger-0.glb', 1440)).toBe('/models-desktop/burger-0.glb');
  });

  it('loads fries desktop variants at the desktop breakpoint', () => {
    expect(modelUrlForViewport('/models-mobile/rosemary-fries-2.glb', 768)).toBe('/models-desktop/rosemary-fries-2.glb');
    expect(modelUrlForViewport('/models-mobile/rosemary-fries-2.glb', 767)).toBe('/models-mobile/rosemary-fries-2.glb');
  });

  it('selects pizza variants at the desktop breakpoint', () => {
    expect(modelUrlForViewport('/models-mobile/pepperoni-pizza-2.glb', 768)).toBe('/models-desktop/pepperoni-pizza-2.glb');
    expect(modelUrlForViewport('/models-mobile/pepperoni-pizza-2.glb', 390)).toBe('/models-mobile/pepperoni-pizza-2.glb');
  });

  it('keeps small viewports on lightweight models', () => {
    expect(modelUrlForViewport('/models-mobile/burger-0.glb', 390)).toBe('/models-mobile/burger-0.glb');
  });

  it('selects desktop variants for newly registered foods', () => {
    expect(modelUrlForViewport('/models-mobile/dessert-0.glb', 1440)).toBe('/models-desktop/dessert-0.glb');
  });

  it('does not rewrite custom model URLs', () => {
    expect(modelUrlForViewport('/model/custom.glb', 1440)).toBe('/model/custom.glb');
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
    expect(url).toBe('/models-mobile/burger-0.glb');
    expect(options.signal).toBeInstanceOf(AbortSignal);
    expect(parse).toHaveBeenCalledWith(bytes, '/models-mobile/');
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
    expect(await store.load(0)).toMatchObject({ status: 'error', error: new Error('Failed to load model /models-mobile/burger-0.glb: 503') });
    expect(parse).not.toHaveBeenCalled();
    expect(await store.retry(0)).toMatchObject({ status: 'ready' });
    expect(fetchModel).toHaveBeenCalledTimes(2);
  });
});
