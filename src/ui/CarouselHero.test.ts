import { describe, expect, it } from 'vitest';
import { carouselLoadIndices } from './CarouselHero';

describe('carousel model loading window', () => {
  it('loads visible dishes plus only the next neighbor, not the full short menu', () => {
    expect(carouselLoadIndices([{ index: 4, x: 20, width: 150 }, { index: 0, x: 170, width: 150 }, { index: 1, x: 320, width: 150 }], 5)).toEqual([4, 0, 1, 2]);
  });
  it('does not turn a nearly full viewport into a full-menu prefetch', () => {
    expect(carouselLoadIndices([0, 1, 2, 3].map(index => ({ index, x: index * 150, width: 150 })), 5)).toEqual([0, 1, 2, 3]);
  });
  it('does not prefetch neighbors when motion is reduced', () => {
    expect(carouselLoadIndices([{ index: 0, x: 170, width: 150 }], 5, false)).toEqual([0]);
  });
  it('tracks jumps and viewport changes without retaining old offscreen indices', () => {
    expect(carouselLoadIndices([{ index: 3, x: 180, width: 150 }], 8)).toEqual([3, 4]);
    expect(carouselLoadIndices([], 8)).toEqual([]);
    expect(carouselLoadIndices([{ index: 0, x: 10, width: 150 }], 1)).toEqual([0]);
  });
});
