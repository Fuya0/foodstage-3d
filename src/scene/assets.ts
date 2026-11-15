import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { Box3, LoaderUtils, Mesh, Texture, Vector3, type BufferGeometry, type Group, type Material } from 'three';
import { AssetStore } from '../core/assets';
import { manifest } from '../data/manifest';
import type { FoodStage } from '../data/foods';
import { applyFoodMaterials } from './food-materials';
export interface ModelAsset { scene: Group; center: Vector3; size: Vector3 }

/** Pick an asset variant once when the play screen mounts, keeping the cache stable. */
export function modelUrlForViewport(url: string, viewportWidth: number): string {
  return viewportWidth >= 768 && /^\/models-mobile\/[a-z0-9]+(?:-[a-z0-9]+)*-[0-9]+\.glb$/.test(url)
    ? url.replace('/models-mobile/', '/models-desktop/')
    : url;
}

function disposeCancelledModel(scene: Group): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  const images = new Set<ImageBitmap>();
  scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  for (const material of materials) {
    for (const value of Object.values(material)) if (value instanceof Texture) textures.add(value);
    material.dispose();
  }
  for (const geometry of geometries) geometry.dispose();
  for (const texture of textures) {
    if (typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap) images.add(texture.image);
    texture.dispose();
  }
  for (const image of images) image.close();
}

export function createModelStore(stages: readonly FoodStage[] = manifest) {
  const viewportWidth = typeof window === 'undefined' ? 0 : window.innerWidth;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return new AssetStore<ModelAsset>(stages.length, async (index, signal) => {
    const url = modelUrlForViewport(stages[index]!.url, viewportWidth);
    // Isolate the session's fetch: Three's FileLoader shares same-URL requests with menu previews.
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`Failed to load model ${url}: ${response.status}`);
    const data = await response.arrayBuffer();
    signal.throwIfAborted();
    const gltf = await loader.parseAsync(data, LoaderUtils.extractUrlBase(url));
    // GLB parsing cannot be interrupted, so discard a late result before material work or prefetch.
    if (signal.aborted) {
      disposeCancelledModel(gltf.scene);
      signal.throwIfAborted();
    }
    applyFoodMaterials(gltf.scene);
    const bounds = new Box3().setFromObject(gltf.scene);
    return { scene: gltf.scene, center: bounds.getCenter(new Vector3()), size: bounds.getSize(new Vector3()) };
  });
}
