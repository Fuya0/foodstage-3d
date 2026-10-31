import { describe, expect, it } from 'vitest';
import { compactCrumbs } from './crumbs';

describe('compactCrumbs', () => {
  it('does not resurrect expired particles when Float32 rounds the lifetime down', () => {
    const ages = new Float32Array(96).fill(2);
    const positions = new Float32Array(288), velocities = new Float32Array(288);
    expect(compactCrumbs(positions, velocities, ages, 0.65)).toBe(0);
    expect(compactCrumbs(positions, velocities, ages, 0.65)).toBe(0);
  });
  it('packs live ring-buffer particles into the draw range', () => {
    const positions = new Float32Array([
      1, 1, 1,
      2, 2, 2,
      3, 3, 3,
      4, 4, 4,
    ]);
    const velocities = new Float32Array([
      11, 11, 11,
      22, 22, 22,
      33, 33, 33,
      44, 44, 44,
    ]);
    const ages = new Float32Array([1, 0.1, 1, 0.2]);

    const count = compactCrumbs(positions, velocities, ages, 0.45);

    expect(count).toBe(2);
    expect(Array.from(positions.slice(0, 6))).toEqual([2, 2, 2, 4, 4, 4]);
    expect(Array.from(velocities.slice(0, 6))).toEqual([22, 22, 22, 44, 44, 44]);
    expect(ages[0]).toBeCloseTo(0.1, 5);
    expect(ages[1]).toBeCloseTo(0.2, 5);
  });
});
