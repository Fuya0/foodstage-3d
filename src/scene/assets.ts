import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box3, Vector3, type Group } from 'three';
import { AssetStore } from '../core/assets';
import { manifest } from '../data/manifest';
export interface ModelAsset { scene: Group; center: Vector3; size: Vector3 }
export function createModelStore() {
  const loader = new GLTFLoader();
  return new AssetStore<ModelAsset>(manifest.length, async index => {
    const gltf = await loader.loadAsync(manifest[index]!.url);
    const bounds = new Box3().setFromObject(gltf.scene);
    return { scene: gltf.scene, center: bounds.getCenter(new Vector3()), size: bounds.getSize(new Vector3()) };
  });
}
