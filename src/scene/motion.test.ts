import { describe, expect, it } from 'vitest';
import { createMotion, impulse, stepMotion } from './motion';

describe('motion behavior', () => {
  it('integrates equal inertia displacement at 60 and 120 Hz', () => {
    const simulate = (hz: number) => {
      const motion = createMotion();
      motion.vx = 2; motion.vy = -1;
      for (let i = 0; i < hz; i++) stepMotion(motion, 1 / hz);
      return motion;
    };
    const a = simulate(60), b = simulate(120);
    expect(a.x).toBeGreaterThan(0.2);
    expect(a.x).toBeCloseTo(b.x, 9);
    expect(a.y).toBeCloseTo(b.y, 9);
    expect(a.vx).toBeCloseTo(b.vx, 9);
  });
  it('does not integrate release velocity while the pointer is held', () => {
    const motion = createMotion(); Object.assign(motion, { dragging: true }); motion.vx = 3;
    stepMotion(motion, 0.1); expect(motion.x).toBe(0);
    Object.assign(motion, { dragging: false }); stepMotion(motion, 0.1); expect(motion.x).toBeGreaterThan(0);
  });
  it('adds subtle shake and signals crumb emission on each bite', () => {
    const motion = createMotion();
    impulse(motion); expect(motion.shake).toBeLessThan(0.2); expect(motion.crumbPulse).toBe(1);
    impulse(motion, 0.95); expect(motion.shake).toBeLessThanOrEqual(1); expect(motion.crumbPulse).toBe(2);
  });
  it('stops shake after 250ms', () => {
    const motion = createMotion(); impulse(motion);
    stepMotion(motion, 0.2); expect(motion.shake).toBeGreaterThan(0);
    stepMotion(motion, 0.051); expect(motion.shake).toBe(0);
  });
});
