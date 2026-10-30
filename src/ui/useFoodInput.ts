import { useRef, type PointerEvent } from 'react';
import { beginGesture, moveGesture, endGesture, isTap, type Gesture } from '../core/gesture';
import type { Motion } from '../scene/motion';
import type { HitTest } from '../scene/Scene';

export function useFoodInput(motion: Motion, hit: React.RefObject<HitTest | null>, playable: boolean, bite: () => void) {
  const active = useRef<{ id: number; gesture: Gesture; x: number; y: number; time: number } | null>(null);
  const pointers = useRef(new Set<number>());
  function clear() { active.current = null; motion.dragging = false; }
  return {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointers.current.add(event.pointerId);
      // Capture even a miss so an outside release always clears tracked pointers.
      event.currentTarget.setPointerCapture(event.pointerId);
      if (pointers.current.size > 1) { clear(); motion.vx = 0; motion.vy = 0; return; }
      if (!playable || !event.isPrimary || !hit.current?.(event.clientX, event.clientY)) return;
      event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
      motion.vx = 0; motion.vy = 0; motion.dragging = true;
      active.current = { id: event.pointerId, gesture: beginGesture(event.clientX, event.clientY, event.timeStamp), x: event.clientX, y: event.clientY, time: event.timeStamp };
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      const pointer = active.current;
      if (!pointer || pointer.id !== event.pointerId) return;
      pointer.gesture = moveGesture(pointer.gesture, event.clientX, event.clientY);
      const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
      const dt = Math.max(0.008, (event.timeStamp - pointer.time) / 1000);
      motion.x += dy * 0.009; motion.y += dx * 0.009;
      motion.vx = dy * 0.009 / dt; motion.vy = dx * 0.009 / dt;
      pointer.x = event.clientX; pointer.y = event.clientY; pointer.time = event.timeStamp;
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      pointers.current.delete(event.pointerId);
      const pointer = active.current; clear();
      if (!pointer || pointer.id !== event.pointerId) return;
      if (event.timeStamp - pointer.time > 80) { motion.vx = 0; motion.vy = 0; }
      if (playable && isTap(endGesture(pointer.gesture, event.clientX, event.clientY, event.timeStamp))) bite();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel(event: PointerEvent<HTMLDivElement>) { pointers.current.delete(event.pointerId); clear(); },
    onLostPointerCapture(event: PointerEvent<HTMLDivElement>) { pointers.current.delete(event.pointerId); if (active.current?.id === event.pointerId) clear(); },
    onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
      if (event.target !== event.currentTarget || (event.key !== ' ' && event.key !== 'Enter')) return;
      event.preventDefault(); if (playable && !event.repeat) bite();
    },
  };
}
