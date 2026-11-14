import { Box3, Mesh, Vector3, type Group } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { foodById } from '../data/foods';
import { applyFoodMaterials } from './food-materials';

export interface PreviewAsset { scene: Group; center: Vector3; scale: number; radius: number }

const models = new Map<string, Promise<PreviewAsset>>();
const networkQueue: (() => void)[] = [];
let activeRequests = 0;
const MAX_PREVIEW_REQUESTS = 2;

function withPreviewRequest<T>(request: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      activeRequests++;
      void request().then(resolve, reject).finally(() => {
        activeRequests--;
        networkQueue.shift()?.();
      });
    };
    if (activeRequests < MAX_PREVIEW_REQUESTS) run();
    else networkQueue.push(run);
  });
}

export function loadPreviewWindow(ids: readonly string[], onLoad: (id: string, asset: PreviewAsset) => void, onError: (id: string) => void, urlFor?: (id: string) => string) {
  let stopped = false;
  let cursor = 0;
  async function worker() {
    while (!stopped && cursor < ids.length) {
      const id = ids[cursor++]!;
      try {
        const asset = await loadPreview(id, urlFor?.(id));
        if (!stopped) onLoad(id, asset);
      } catch { if (!stopped) onError(id); }
    }
  }
  void worker();
  void worker();
  return () => { stopped = true; };
}

export function loadPreview(foodId: string, previewModelUrl?: string): Promise<PreviewAsset> {
  const cacheKey = previewModelUrl ?? foodId;
  const existing = models.get(cacheKey);
  if (existing) return existing;
  const request = (async () => {
    // Stage-based foods always use their small variant here, including on desktop.
    const url = previewModelUrl ?? foodById(foodId).stages[0]?.url.replace('/models-desktop/', '/models-mobile/');
    if (!url) throw new Error('Missing food model');
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const gltf = await withPreviewRequest(() => loader.loadAsync(url));
    applyFoodMaterials(gltf.scene);
    const bounds = new Box3().setFromObject(gltf.scene);
    const size = bounds.getSize(new Vector3());
    const extent = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(extent) || extent <= 0) throw new Error('Empty food model');
    const center = bounds.getCenter(new Vector3());
    // Fit the actual mesh rather than the empty corners of its bounding box.
    // Computed once per cached asset; a sphere remains safe at every yaw angle.
    const point = new Vector3();
    let radiusSquared = 0;
    gltf.scene.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const positions = object.geometry.getAttribute('position');
      if (!positions) return;
      for (let i = 0; i < positions.count; i++) {
        point.fromBufferAttribute(positions, i).applyMatrix4(object.matrixWorld);
        radiusSquared = Math.max(radiusSquared, point.distanceToSquared(center));
      }
    });
    const radius = radiusSquared > 0 ? Math.sqrt(radiusSquared) * 2 / extent : size.length() / extent;
    return { scene: gltf.scene, center, scale: 2 / extent, radius };
  })();
  models.set(cacheKey, request);
  // Permit another activation to retry a failed request.
  void request.catch(() => { if (models.get(cacheKey) === request) models.delete(cacheKey); });
  return request;
}
