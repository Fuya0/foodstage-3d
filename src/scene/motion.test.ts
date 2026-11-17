import { describe, expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';
import { createMotion, impulse, rotateInView, rotateMotion, stepMotion } from './motion';

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


describe('world-up and screen-right food dragging', () => {
  for (const [pitch, yaw] of [[0, 0], [0, Math.PI], [Math.PI, 0], [1.8, 4.7]]) {
    it(`follows the pointer after pitch ${pitch} and yaw ${yaw}`, () => {
      for (const [dx, dy] of [[0, 0.1], [0.1, 0], [0, -0.1], [-0.1, 0]]) {
        const view = new Quaternion().setFromEuler(new Euler(-0.2, 0, 0));
        const orientation = new Quaternion().setFromEuler(new Euler(pitch, yaw, 0, 'YXZ'));
        const before = orientation.clone();
        rotateInView(orientation, view, dy!, dx!);
        const delta = orientation.clone().multiply(before.invert());
        const point = new Vector3(0, 0, 1).applyQuaternion(view).applyQuaternion(delta).applyQuaternion(view.clone().invert());
        if (dx) expect(Math.sign(point.x)).toBe(Math.sign(dx));
        if (dy) expect(Math.sign(-point.y)).toBe(Math.sign(dy));
        expect(orientation.length()).toBeCloseTo(1, 12);
      }
    });
  }

  it('integrates the same rendered release orientation at 60 and 120 Hz', () => {
    const simulate = (hz: number) => {
      const motion = createMotion();
      motion.view.setFromEuler(new Euler(-0.2, 0, 0));
      rotateMotion(motion, 1.8, 2.9);
      motion.vx = -2; motion.vy = 3;
      for (let frame = 0; frame < hz; frame++) stepMotion(motion, 1 / hz);
      return motion.orientation;
    };
    expect(simulate(60).angleTo(simulate(120))).toBeLessThan(1e-7);
  });
});

describe('level turntable dragging', () => {
  it('keeps a level food upright during a horizontal half turn', () => {
    const view = new Quaternion().setFromEuler(new Euler(-Math.atan(0.24), 0, 0));
    const orientation = new Quaternion();
    rotateInView(orientation, view, 0, Math.PI);
    const up = new Vector3(0, 1, 0).applyQuaternion(orientation);
    expect(up.distanceTo(new Vector3(0, 1, 0))).toBeLessThan(1e-8);
  });
});


describe('free food rotation', () => {
  it('retraces the actual gesture path without leaving residual tilt', () => {
    const motion = createMotion();
    motion.view.setFromEuler(new Euler(-0.2, 0, 0));
    const path = [[0, 0.5], [0.4, 0.2], [-1.6, 0.1], [0.3, -0.8]];
    for (const [pitch, yaw] of path) rotateMotion(motion, pitch!, yaw!);
    for (const [pitch, yaw] of [...path].reverse()) rotateMotion(motion, -pitch!, -yaw!);
    expect(motion.orientation.angleTo(new Quaternion())).toBeLessThan(1e-7);
  });
  it('keeps down dragging direct after a horizontal half turn', () => {
    const motion = createMotion();
    motion.view.setFromEuler(new Euler(-0.2, 0, 0));
    rotateMotion(motion, 0, Math.PI);
    const before = motion.orientation.clone();
    rotateMotion(motion, 0.12, 0);
    const delta = motion.orientation.clone().multiply(before.invert());
    const front = new Vector3(0, 0, 1).applyQuaternion(motion.view).applyQuaternion(delta).applyQuaternion(motion.view.clone().invert());
    expect(-front.y).toBeGreaterThan(0.1);
  });
});
