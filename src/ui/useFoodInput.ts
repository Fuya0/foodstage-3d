import { useCallback, useEffect, useRef, type PointerEvent } from 'react';
import { beginGesture, moveGesture, endGesture, isTap, type Gesture } from '../core/gesture';
import { DRAG_RADIANS_PER_PIXEL, cancelMotionReturn, scheduleMotionReturn, rotateMotion, type Motion } from '../scene/motion';
import type { HitTest } from '../scene/Scene';

export function useFoodInput(motion: Motion, hit: React.RefObject<HitTest | null>, playable: boolean, bite: () => void, sensitivity: number, zoomBy: (factor: number) => void, reducedMotion = false) {
  const container = useRef<HTMLDivElement | null>(null), visible = useRef(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const active = useRef<{ id: number; gesture: Gesture; x: number; y: number; time: number } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef(0);
  function distance() {
    const [a, b] = pointers.current.values();
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }
  const attachWheel = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    if (container.current && container.current !== element) observerRef.current?.unobserve(container.current);
    container.current = element; visible.current = !document.hidden;
    observerRef.current?.observe(element);
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoomBy(Math.exp(-event.deltaY * 0.008));
    };
    element.addEventListener('wheel', wheel, { passive: false });
    return () => {
      element.removeEventListener('wheel', wheel); observerRef.current?.unobserve(element);
      if (container.current === element) { container.current = null; visible.current = false; clear(); pointers.current.clear(); pinchDistance.current = 0; motion.vx = 0; motion.vy = 0; cancelMotionReturn(motion); }
    };
  }, [zoomBy]);
  function clear() { active.current = null; motion.dragging = false; }
  function queueReturn() { if (visible.current && !reducedMotion && !pointers.current.size) scheduleMotionReturn(motion, performance.now()); }
  useEffect(() => {
    const reset = () => { clear(); pointers.current.clear(); pinchDistance.current = 0; motion.vx = 0; motion.vy = 0; cancelMotionReturn(motion); };
    let inView = true;
    const visibility = () => { visible.current = Boolean(container.current) && inView && !document.hidden; if (!visible.current) reset(); else queueReturn(); };
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => { const entry = entries.find(value => value.target === container.current); if (!entry) return; inView = entry.isIntersecting; visibility(); });
    observerRef.current = observer;
    if (container.current) observer?.observe(container.current);
    if (reducedMotion) cancelMotionReturn(motion);
    document.addEventListener('visibilitychange', visibility); visibility();
    return () => { observer?.disconnect(); if (observerRef.current === observer) observerRef.current = null; document.removeEventListener('visibilitychange', visibility); reset(); };
  }, [motion, reducedMotion]);
  function cancelPointer(event: PointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const tracked = pointers.current.delete(event.pointerId);
    if (!tracked && active.current?.id !== event.pointerId) return;
    pinchDistance.current = distance();
    if (active.current?.id === event.pointerId) active.current = null;
    motion.dragging = pointers.current.size > 0;
    if (!motion.dragging) { motion.vx = 0; motion.vy = 0; queueReturn(); }
  }
  return {
    ref: attachWheel,
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (event.target instanceof Element && event.target.closest('button, a, input, [data-no-drag]')) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
      // Capture even a miss so an outside release always clears tracked pointers.
      event.currentTarget.setPointerCapture(event.pointerId);
      if (pointers.current.size > 1) {
        clear(); cancelMotionReturn(motion); motion.dragging = true; motion.vx = 0; motion.vy = 0;
        pinchDistance.current = distance();
        return;
      }
      if (!playable || !event.isPrimary || !hit.current?.(event.clientX, event.clientY)) return;
      event.currentTarget.focus(); event.currentTarget.setPointerCapture(event.pointerId);
      cancelMotionReturn(motion); motion.vx = 0; motion.vy = 0; motion.dragging = true;
      active.current = { id: event.pointerId, gesture: beginGesture(event.clientX, event.clientY, event.timeStamp), x: event.clientX, y: event.clientY, time: event.timeStamp };
    },
    onPointerMove(event: PointerEvent<HTMLDivElement>) {
      if (pointers.current.has(event.pointerId)) {
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.current.size === 2) {
          const gap = distance();
          if (gap > 2 && pinchDistance.current > 2) zoomBy(gap / pinchDistance.current);
          pinchDistance.current = gap;
          return;
        }
      }
      const pointer = active.current;
      if (!pointer || pointer.id !== event.pointerId) return;
      pointer.gesture = moveGesture(pointer.gesture, event.clientX, event.clientY);
      const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
      const dt = Math.max(0.008, (event.timeStamp - pointer.time) / 1000);
      const gain = DRAG_RADIANS_PER_PIXEL * sensitivity;
      rotateMotion(motion, dy * gain, dx * gain);
      motion.vx = dy * gain / dt; motion.vy = dx * gain / dt;
      pointer.x = event.clientX; pointer.y = event.clientY; pointer.time = event.timeStamp;
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      pointers.current.delete(event.pointerId); pinchDistance.current = distance();
      const pointer = active.current; clear(); motion.dragging = pointers.current.size > 0; queueReturn();
      if (!pointer || pointer.id !== event.pointerId) return;
      if (event.timeStamp - pointer.time > 80) { motion.vx = 0; motion.vy = 0; }
      if (playable && isTap(endGesture(pointer.gesture, event.clientX, event.clientY, event.timeStamp))) bite();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel: cancelPointer,
    onLostPointerCapture: cancelPointer,
    onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
      if (event.target !== event.currentTarget || (event.key !== ' ' && event.key !== 'Enter')) return;
      event.preventDefault(); if (playable && !event.repeat) { cancelMotionReturn(motion); bite(); queueReturn(); }
    },
  };
}
