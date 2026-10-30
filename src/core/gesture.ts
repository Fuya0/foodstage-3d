export interface TapInput {
  readonly maxDistance: number;
  readonly duration: number;
  readonly cancelled: boolean;
}
export interface Gesture {
  readonly startX: number;
  readonly startY: number;
  readonly startTime: number;
  readonly maxDistance: number;
}

export function isTap({ maxDistance, duration, cancelled }: TapInput): boolean {
  return !cancelled && maxDistance >= 0 && maxDistance < 6 && duration >= 0 && duration <= 250;
}

export function beginGesture(startX: number, startY: number, startTime: number): Gesture {
  return { startX, startY, startTime, maxDistance: 0 };
}

/** Pass every pointer move, even when the pointer later returns to its origin. */
export function moveGesture(gesture: Gesture, x: number, y: number): Gesture {
  return { ...gesture, maxDistance: Math.max(gesture.maxDistance, Math.hypot(x - gesture.startX, y - gesture.startY)) };
}

/** Include pointerup's coordinates; pass cancelled=true for pointercancel. */
export function endGesture(gesture: Gesture, x: number, y: number, time: number, cancelled = false): TapInput {
  return { maxDistance: moveGesture(gesture, x, y).maxDistance, duration: time - gesture.startTime, cancelled };
}
