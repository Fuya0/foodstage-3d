export interface Motion { x: number; y: number; vx: number; vy: number; shake: number; age: number; dragging: boolean }
export function createMotion(): Motion { return { x: 0, y: 0, vx: 0, vy: 0, shake: 0, age: 0, dragging: false }; }
export function impulse(motion: Motion): void {
  motion.shake = Math.min(1, motion.shake + 0.36);
  motion.age = 0;
}
/** Exact exponential integration makes displacement independent of refresh rate. */
export function stepMotion(motion: Motion, dt: number): void {
  const elapsed = Math.max(0, dt);
  const decay = Math.exp(-6 * elapsed);
  if (!motion.dragging) {
    motion.x += motion.vx * (1 - decay) / 6;
    motion.y += motion.vy * (1 - decay) / 6;
    motion.vx *= decay; motion.vy *= decay;
  }
  motion.age += elapsed;
  motion.shake = motion.age >= 0.25 ? 0 : motion.shake * Math.exp(-10 * elapsed);
}
