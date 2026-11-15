import { Quaternion, Vector3 } from 'three';

export const DRAG_RADIANS_PER_PIXEL = 0.00675;
const dragAxis = new Vector3();
const dragRotation = new Quaternion();

/** Detail-preview rotation only; tasting keeps its original fixed-order angle controls. */
export function rotateInView(orientation: Quaternion, view: Quaternion, pitch: number, yaw: number): void {
  const angle = Math.hypot(pitch, yaw);
  if (!angle) return;
  dragAxis.set(pitch, yaw, 0).multiplyScalar(1 / angle).applyQuaternion(view);
  dragRotation.setFromAxisAngle(dragAxis, angle);
  orientation.premultiply(dragRotation).normalize();
}

export interface Motion { x: number; y: number; vx: number; vy: number; shake: number; age: number; dragging: boolean; crumbPulse: number }
export function createMotion(): Motion { return { x: 0, y: 0, vx: 0, vy: 0, shake: 0, age: 0, dragging: false, crumbPulse: 0 }; }
/** Original tasting controls accumulate two angles; rendering composes them in XYZ order. */
export function rotateMotion(motion: Motion, pitch: number, yaw: number): void {
  motion.x += pitch; motion.y += yaw;
}
export function impulse(motion: Motion, strength = 0.08): void {
  motion.shake = Math.min(1, motion.shake + strength);
  motion.crumbPulse += 1;
  motion.age = 0;
}
/** Exact exponential integration makes displacement independent of refresh rate. */
export function stepMotion(motion: Motion, dt: number): void {
  const elapsed = Math.max(0, dt);
  const decay = Math.exp(-6 * elapsed);
  if (!motion.dragging) {
    rotateMotion(motion, motion.vx * (1 - decay) / 6, motion.vy * (1 - decay) / 6);
    motion.vx *= decay; motion.vy *= decay;
  }
  motion.age += elapsed;
  motion.shake = motion.age >= 0.25 ? 0 : motion.shake * Math.exp(-10 * elapsed);
}
