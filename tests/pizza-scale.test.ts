import { readFileSync } from 'node:fs';
import { Box3, Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { foodById } from '../src/data/foods';

type Triple = [number, number, number];
interface BoundsDocument {
  accessors: { min: Triple; max: Triple; componentType: number; normalized?: boolean }[];
  meshes: { primitives: { attributes: { POSITION: number } }[] }[];
  nodes: { mesh?: number; children?: number[]; matrix?: number[]; translation?: Triple; rotation?: [number, number, number, number]; scale?: Triple }[];
  scenes: { nodes: number[] }[];
  scene?: number;
}

/** Accessor bounds precede normalization; node transforms undo position quantization. */
function worldMeshWidth(gltf: BoundsDocument): number {
  const bounds = new Box3();
  const normalized = (value: number, componentType: number): number => {
    switch (componentType) {
      case 5120: return Math.max(value / 127, -1);
      case 5121: return value / 255;
      case 5122: return Math.max(value / 32767, -1);
      case 5123: return value / 65535;
      case 5125: return value / 4294967295;
      default: return value;
    }
  };
  function visit(index: number, parent: Matrix4) {
    const node = gltf.nodes[index]!;
    const local = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
      new Vector3(...(node.translation ?? [0, 0, 0])),
      new Quaternion(...(node.rotation ?? [0, 0, 0, 1])),
      new Vector3(...(node.scale ?? [1, 1, 1])),
    );
    const world = new Matrix4().multiplyMatrices(parent, local);
    if (node.mesh !== undefined) {
      for (const primitive of gltf.meshes[node.mesh]!.primitives) {
        const accessor = gltf.accessors[primitive.attributes.POSITION]!;
        const decode = (values: Triple) => new Vector3(...values.map(value => accessor.normalized ? normalized(value, accessor.componentType) : value) as Triple);
        // applyMatrix4 transforms all eight corners, including rotated/scaled ancestors.
        bounds.union(new Box3(decode(accessor.min), decode(accessor.max)).applyMatrix4(world));
      }
    }
    for (const child of node.children ?? []) visit(child, world);
  }
  for (const root of gltf.scenes[gltf.scene ?? 0]!.nodes) visit(root, new Matrix4());
  if (bounds.isEmpty()) throw new Error('Model has no world-space mesh bounds');
  return bounds.getSize(new Vector3()).x;
}

function meshWidth(path: string): number {
  const buffer = readFileSync(path);
  return worldMeshWidth(JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString()));
}

describe('world-space GLB bounds', () => {
  const mesh = { primitives: [{ attributes: { POSITION: 0 } }] };
  it.each([
    { componentType: 5123, min: 0, max: 65535, scale: 0.3 },
    { componentType: 5122, min: -32768, max: 32767, scale: 0.15 },
  ])('decodes normalized $componentType bounds before node scaling', ({ componentType, min, max, scale }) => {
    expect(worldMeshWidth({
      accessors: [{ componentType, normalized: true, min: [min, 0, 0], max: [max, 0, 0] }],
      meshes: [mesh], nodes: [{ mesh: 0, scale: [scale, 1, 1] }], scenes: [{ nodes: [0] }],
    })).toBeCloseTo(0.3, 10);
  });
  it('includes ancestor translation, rotation and scale when transforming mesh corners', () => {
    expect(worldMeshWidth({
      accessors: [{ componentType: 5126, min: [0, 0, 0], max: [2, 1, 1] }],
      meshes: [mesh],
      nodes: [
        { children: [1], translation: [10, 20, 30], rotation: [0, 0, Math.SQRT1_2, Math.SQRT1_2], scale: [2, 2, 2] },
        { mesh: 0, translation: [1, 2, 3], scale: [0.15, 0.4, 0.2] },
      ], scenes: [{ nodes: [0] }],
    })).toBeCloseTo(0.8, 10);
  });
  it('uses a node matrix when present', () => {
    expect(worldMeshWidth({
      accessors: [{ componentType: 5126, min: [0, 0, 0], max: [1, 1, 1] }],
      meshes: [mesh], nodes: [{ mesh: 0, matrix: [0.3, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 50, 0, 0, 1] }], scenes: [{ nodes: [0] }],
    })).toBeCloseTo(0.3, 10);
  });
});

describe('pizza installed physical scale', () => {
  // Measured from decoded source vertices: the historical stage1/2 accessor hints were stale.
  it.each([
    { stage: 0, sourceWidth: 0.30000001192092896 },
    { stage: 1, sourceWidth: 0.30000001192092896 },
    { stage: 2, sourceWidth: 0.29814429581165314 },
    { stage: 3, sourceWidth: 0.2800000011920929 },
  ])('preserves the measured source width of stage $stage within 0.01mm', ({ stage, sourceWidth }) => {
    const pizza = foodById('pepperoni-pizza');
    const width = meshWidth(`public/models-runtime/pepperoni-pizza-${stage}.glb`) * pizza.stages[stage]!.calibration.scale;
    expect(Math.abs(width - sourceWidth)).toBeLessThanOrEqual(0.00001);
  });
  it('keeps the three-slice diameter within 2% of the five-slice diameter', () => {
    const pizza = foodById('pepperoni-pizza');
    const widths = [1, 2].map(stage => meshWidth(`public/models-runtime/pepperoni-pizza-${stage}.glb`)
      * pizza.stages[stage]!.calibration.scale);
    expect(widths[1]! / widths[0]!).toBeGreaterThanOrEqual(0.98);
    expect(widths[1]! / widths[0]!).toBeLessThanOrEqual(1.02);
  });
});
