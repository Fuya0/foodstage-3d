import { describe, expect, it } from 'vitest';
import { Euler, Vector3 } from 'three';
import { modelPlacement, modelPivot } from './presentation';

const sizes = [
  { x: 0.15043, y: 0.125, z: 0.15007 },
  { x: 0.15842, y: 0.125, z: 0.15101 },
  { x: 0.19269, y: 0.125, z: 0.17730 },
  { x: 0.13432, y: 0.130, z: 0.08214 },
];
const zero = { x: 0, y: 0, z: 0 };

describe('modelPlacement', () => {
  it('uses a common floor without magnifying any later stage', () => {
    const base = { x: 0.14, y: 0.12, z: 0.1 };
    const small = { x: 0.07, y: 0.08, z: 0.06 };
    const placement = modelPlacement(base, small, { x: 0.02, y: 0.03, z: -0.01 });
    expect(placement.scale).toBe(1);
    expect(placement.position[0]).toBe(-0.02);
    expect(placement.position[1]).toBeCloseTo(-0.05, 10);
    expect(placement.position[2]).toBe(0.01);
  });

  it('keeps stages two and three substantial, then makes the final remnant clearly smaller', () => {
    const projected = sizes.map((size, stage) => modelPlacement(sizes[0]!, size, zero, stage));
    const widths = sizes.map((size, stage) => size.x * projected[stage]!.scale);
    const heights = sizes.map((size, stage) => size.y * projected[stage]!.scale);
    expect(widths[1]!).toBeGreaterThan(widths[0]! * 0.94);
    expect(widths[2]!).toBeGreaterThan(widths[0]! * 0.87);
    expect(heights[1]!).toBeGreaterThan(heights[0]! * 0.89);
    expect(heights[2]!).toBeGreaterThan(heights[0]! * 0.68);
    expect(widths[2]!).toBeLessThan(widths[1]!);
    expect(heights[2]!).toBeLessThan(heights[1]!);
    expect(widths[3]!).toBeGreaterThan(widths[2]! * 0.56);
    expect(heights[3]!).toBeGreaterThan(heights[2]! * 0.72);
    expect(widths[3]!).toBeLessThan(widths[2]! * 0.75);
    expect(heights[3]!).toBeLessThan(heights[2]! * 0.92);
  });

  it('keeps the visual model center on the rotation pivot while stages rest on the same floor', () => {
    const base = sizes[0]!;
    for (let stage = 0; stage < sizes.length; stage++) {
      const asset = sizes[stage]!;
      const placement = modelPlacement(base, asset, { x: 0, y: asset.y * 0.1, z: 0 }, stage);
      const pivot = modelPivot(base, asset, placement.scale);
      const center = {
        x: placement.scale * (placement.position[0] + 0),
        y: placement.scale * (placement.position[1] + asset.y * 0.1),
        z: placement.scale * placement.position[2],
      };
      expect(center.x).toBeCloseTo(pivot[0], 10);
      expect(center.y).toBeCloseTo(pivot[1], 10);
      expect(center.z).toBeCloseTo(pivot[2], 10);
      const sourceCenter = new Vector3(0.03, asset.y * 0.1, -0.02);
      const renderedPlacement = modelPlacement(base, asset, sourceCenter, stage);
      const centeredLocal = sourceCenter.clone().add(new Vector3(...renderedPlacement.centeredPosition)).multiplyScalar(placement.scale);
      for (const angles of [[0.9, 1.2, 0], [-1.1, -0.7, 0], [0, Math.PI, 0]]) {
        const transformed = centeredLocal.clone().applyEuler(new Euler(angles[0], angles[1], angles[2])).add(new Vector3(...pivot));
        expect(transformed.toArray()).toEqual([...pivot]);
      }
      expect(pivot[1] - placement.scale * asset.y / 2).toBeCloseTo(-base.y / 2, 10);
    }
  });
});
