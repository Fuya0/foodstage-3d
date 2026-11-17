import { Quaternion, Vector3 } from 'three';

export const DRAG_RADIANS_PER_PIXEL = 0.00675;
const dragAxis = new Vector3();
const dragRotation = new Quaternion();

/** World-up yaw keeps level food flat; camera-right pitch remains direct after any flip. */
export function rotateInView(orientation: Quaternion, view: Quaternion, pitch: number, yaw: number): void {
  dragAxis.set(1, 0, 0).applyQuaternion(view).multiplyScalar(pitch);
  dragAxis.y += yaw;
  const angle = dragAxis.length();
  if (!angle) return;
  dragAxis.multiplyScalar(1 / angle);
  dragRotation.setFromAxisAngle(dragAxis, angle);
  orientation.premultiply(dragRotation).normalize();
}

export interface Motion { returning: { at: number; from: Quaternion | null; x: number; y: number } | null; orientation: Quaternion; view: Quaternion; x: number; y: number; vx: number; vy: number; shake: number; age: number; dragging: boolean; crumbPulse: number }
export function createMotion(): Motion { return { returning: null, orientation: new Quaternion(), view: new Quaternion(), x: 0, y: 0, vx: 0, vy: 0, shake: 0, age: 0, dragging: false, crumbPulse: 0 }; }
/** Angle totals are telemetry; the quaternion is the rendered pose and survives stage swaps. */
export function rotateMotion(motion: Motion, pitch: number, yaw: number): void {
  motion.x += pitch; motion.y += yaw;
  rotateInView(motion.orientation, motion.view, pitch, yaw);
}
export function impulse(motion: Motion, strength = 0.08): void {
  motion.shake = Math.min(1, motion.shake + strength);
  motion.crumbPulse += 1;
  motion.age = 0;
}
const home = new Quaternion();
export function cancelMotionReturn(motion: Motion): void { motion.returning = null; }
export function scheduleMotionReturn(motion: Motion, now: number): void {
  motion.returning = motion.orientation.angleTo(home) < 0.001 && Math.hypot(motion.vx, motion.vy) < 0.001 ? null : { at: now + 150, from: null, x: 0, y: 0 };
}
function stepReturn(motion: Motion, now: number, reduced: boolean): boolean {
  if (reduced || motion.dragging) { cancelMotionReturn(motion); return false; }
  const returning = motion.returning;
  if (!returning || now < returning.at) return false;
  if (!returning.from) { returning.from = motion.orientation.clone(); returning.x = motion.x; returning.y = motion.y; }
  const progress = (now >= returning.at + 650 ? 1 : (now - returning.at) / 650), eased = 1 - (1 - progress) ** 3;
  motion.vx = 0; motion.vy = 0;
  motion.orientation.slerpQuaternions(returning.from, home, eased);
  motion.x = returning.x * (1 - eased); motion.y = returning.y * (1 - eased);
  if (progress >= 1) motion.returning = null;
  return true;
}
/** Exact exponential integration makes displacement independent of refresh rate. */
export function stepMotion(motion: Motion, dt: number, now = performance.now(), reduced = false): void {
  const elapsed = Math.max(0, dt);
  const decay = Math.exp(-6 * elapsed);
  if (!stepReturn(motion, now, reduced) && !motion.dragging) {
    rotateMotion(motion, motion.vx * (1 - decay) / 6, motion.vy * (1 - decay) / 6);
    motion.vx *= decay; motion.vy *= decay;
  }
  motion.age += elapsed;
  motion.shake = motion.age >= 0.25 ? 0 : motion.shake * Math.exp(-10 * elapsed);
}
