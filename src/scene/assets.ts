import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { Box3, Vector3, type Group } from 'three';
import { AssetStore } from '../core/assets';
import { manifest } from '../data/manifest';
import type { FoodStage } from '../data/foods';
import { applyFoodMaterials } from './food-materials';
export interface ModelAsset { scene: Group; center: Vector3; size: Vector3 }
export function createModelStore(stages: readonly FoodStage[] = manifest) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  return new AssetStore<ModelAsset>(stages.length, async index => {
    const gltf = await loader.loadAsync(stages[index]!.url);
    applyFoodMaterials(gltf.scene);
    const bounds = new Box3().setFromObject(gltf.scene);
    return { scene: gltf.scene, center: bounds.getCenter(new Vector3()), size: bounds.getSize(new Vector3()) };
  });
}
