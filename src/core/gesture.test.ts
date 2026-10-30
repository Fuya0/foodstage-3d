import { describe, expect, it } from 'vitest';
import { beginGesture, moveGesture, endGesture, isTap } from './gesture';

describe('tap classification', () => {
  it.each([
    [5.99, 250, false, true],
    [6, 100, false, false],
    [0, 250.01, false, false],
    [0, 1000, false, false],
    [0, 100, true, false],
    [8, 100, false, false],
    [0, -1, false, false],
    [NaN, 100, false, false],
  ])('classifies distance %s duration %s cancelled %s as %s', (maxDistance, duration, cancelled, expected) => {
    expect(isTap({ maxDistance, duration, cancelled })).toBe(expected);
  });

  it('remembers maximum displacement after dragging back to the origin', () => {
    const start = beginGesture(20, 30, 100);
    const moved = moveGesture(start, 28, 30);
    const returned = moveGesture(moved, 20, 30);
    expect(start.maxDistance).toBe(0);
    expect(returned.maxDistance).toBe(8);
    expect(isTap(endGesture(returned, 20, 30, 200))).toBe(false);
  });

  it('includes the final pointer position and cancellation in the result', () => {
    const start = beginGesture(20, 30, 100);
    expect(isTap(endGesture(start, 23, 34, 350))).toBe(true);
    expect(isTap(endGesture(start, 26, 30, 200))).toBe(false);
    expect(isTap(endGesture(start, 20, 30, 200, true))).toBe(false);
  });
});
