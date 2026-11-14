import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { loadPreview, loadPreviewWindow } from './menu-preview-asset';

function model(): GLTF {
  const scene = new Group();
  scene.add(new Mesh(new BoxGeometry(2, 1, 1), new MeshStandardMaterial()));
  return { scene, scenes: [scene], animations: [], cameras: [], asset: { version: '2.0' }, parser: {} as GLTF['parser'], userData: {} };
}
afterEach(() => vi.restoreAllMocks());

describe('shared preview requests', () => {
  it('limits network concurrency to two across overlapping stale windows', async () => {
    const finish: (() => void)[] = [];
    let active = 0;
    let peak = 0;
    vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(() => {
      active++;
      peak = Math.max(peak, active);
      return new Promise(resolve => finish.push(() => { active--; resolve(model()); }));
    });
    const first = loadPreviewWindow(['window-a', 'window-b', 'window-c'], () => {}, () => {}, id => `/${id}.glb`);
    first();
    loadPreviewWindow(['window-d', 'window-e'], () => {}, () => {}, id => `/${id}.glb`);
    expect(finish).toHaveLength(2);
    finish.shift()!();
    await vi.waitFor(() => expect(finish).toHaveLength(2));
    finish.shift()!();
    await vi.waitFor(() => expect(finish).toHaveLength(2));
    expect(peak).toBe(2);
    finish.forEach(done => done());
  });
  it('loads visible requests two at a time and stops a stale window before dispatching more', async () => {
    const finish: (() => void)[] = [];
    const request = vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockImplementation(() => new Promise(resolve => finish.push(() => resolve(model()))));
    const loaded: string[] = [];
    const stop = loadPreviewWindow(['queue-a', 'queue-b', 'queue-c'], id => loaded.push(id), () => {}, id => `/${id}.glb`);
    expect(request).toHaveBeenCalledTimes(2);
    finish[0]!();
    await vi.waitFor(() => expect(request).toHaveBeenCalledTimes(3));
    expect(loaded).toEqual(['queue-a']);
    stop();
    finish[1]!();
    finish[2]!();
    await Promise.resolve();
    expect(loaded).toEqual(['queue-a']);
  });
  it('deduplicates concurrent and completed requests without fetching desktop assets', async () => {
    const request = vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockResolvedValue(model());
    const first = loadPreview('classic-burger');
    expect(loadPreview('classic-burger')).toBe(first);
    const asset = await first;
    expect(loadPreview('classic-burger')).toBe(first);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0]![0]).toMatch(/^\/models-mobile\//);
    expect(asset.scale).toBe(1);
    expect(asset.radius).toBeGreaterThan(0);
  });
  it('allows reactivation after a failed request instead of caching a rejection forever', async () => {
    const request = vi.spyOn(GLTFLoader.prototype, 'loadAsync').mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(model());
    await expect(loadPreview('retry-preview', '/retry-preview.glb')).rejects.toThrow('offline');
    await expect(loadPreview('retry-preview', '/retry-preview.glb')).resolves.toHaveProperty('scale', 1);
    expect(request).toHaveBeenCalledTimes(2);
  });
});
