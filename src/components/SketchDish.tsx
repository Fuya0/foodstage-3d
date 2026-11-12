import { useEffect, useRef, useState } from "react";
import type { Dish, Settings } from "../types";
import { playTick } from "../lib/sound";

type Props = {
  dish: Dish;
  settings: Settings;
  compact?: boolean;
};

type Spark = { x: number; y: number; vx: number; vy: number; born: number; color: string };

export default function SketchDish({ dish, settings, compact = false }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const object = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ x: 0, y: 0, time: 0, travel: 0, pinch: 0 });
  const view = useRef({ yaw: -10, pitch: 5, zoom: 1, velocity: 0, last: performance.now(), touched: performance.now() });
  const dragging = useRef(false);
  const sparks = useRef<Spark[]>([]);
  const sparkFrame = useRef(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let raf = 0;
    let previous = performance.now();
    const render = (now: number) => {
      const dt = Math.min(0.05, (now - previous) / 1000);
      previous = now;
      const v = view.current;
      if (!dragging.current) {
        v.yaw += v.velocity * dt;
        v.velocity *= Math.exp(-5.2 * dt);
        if (settings.autoRotate && !settings.reducedMotion && now - v.touched > 1800) v.yaw += dt * 9;
      }
      const bob = settings.reducedMotion ? 0 : Math.sin(now / 780) * 4;
      if (object.current) {
        object.current.style.transform = `perspective(900px) rotateX(${v.pitch}deg) rotateY(${v.yaw}deg) translateY(${bob}px) scale(${v.zoom})`;
        object.current.dataset.yaw = v.yaw.toFixed(3);
        object.current.dataset.zoom = v.zoom.toFixed(3);
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [settings.autoRotate, settings.reducedMotion]);

  useEffect(() => () => cancelAnimationFrame(sparkFrame.current), []);

  function sparkle(x: number, y: number) {
    playTick(settings.sound);
    if (settings.reducedMotion || !canvas.current || !frame.current) return;
    const rect = frame.current.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.current.width = rect.width * ratio;
    canvas.current.height = rect.height * ratio;
    const ctx = canvas.current.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const born = performance.now();
    for (let i = 0; i < 12; i += 1) {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.25;
      const speed = 45 + Math.random() * 75;
      sparks.current.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, born, color: i % 3 === 0 ? "#C9573B" : "#D79A28" });
    }
    cancelAnimationFrame(sparkFrame.current);
    const draw = (now: number) => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      sparks.current = sparks.current.filter((p) => now - p.born < 620);
      for (const p of sparks.current) {
        const age = (now - p.born) / 1000;
        const px = p.x + p.vx * age;
        const py = p.y + p.vy * age + 70 * age * age;
        ctx.globalAlpha = Math.max(0, 1 - age / 0.62);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px - 3, py);
        ctx.lineTo(px + 3, py);
        ctx.moveTo(px, py - 3);
        ctx.lineTo(px, py + 3);
        ctx.stroke();
      }
      if (sparks.current.length) sparkFrame.current = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, rect.width, rect.height);
    };
    sparkFrame.current = requestAnimationFrame(draw);
  }

  return (
    <div
      ref={frame}
      className={`sketch-stage ${compact ? "sketch-stage--compact" : ""}`}
      tabIndex={compact ? -1 : 0}
      role={compact ? "img" : "application"}
      aria-label={`${dish.name}手绘预览。拖动旋转，滚轮缩放，方向键调整视角。`}
      onPointerDown={(event) => {
        if (compact) return;
        frame.current?.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        dragging.current = true;
        const now = performance.now();
        gesture.current = { x: event.clientX, y: event.clientY, time: now, travel: 0, pinch: 0 };
        view.current.velocity = 0;
        view.current.touched = now;
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          gesture.current.pinch = Math.hypot(a.x - b.x, a.y - b.y);
        }
      }}
      onPointerMove={(event) => {
        const rect = frame.current?.getBoundingClientRect();
        if (rect) {
          frame.current?.style.setProperty("--light-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
          frame.current?.style.setProperty("--light-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
        }
        if (compact || !pointers.current.has(event.pointerId)) return;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.current.size === 2) {
          const [a, b] = [...pointers.current.values()];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (gesture.current.pinch > 0) view.current.zoom = Math.max(0.75, Math.min(1.5, view.current.zoom * distance / gesture.current.pinch));
          gesture.current.pinch = distance;
          gesture.current.travel = 20;
          return;
        }
        const now = performance.now();
        const dx = event.clientX - gesture.current.x;
        const dy = event.clientY - gesture.current.y;
        const elapsed = Math.max(8, now - gesture.current.time);
        view.current.yaw += dx * 0.42;
        view.current.pitch = Math.max(-24, Math.min(28, view.current.pitch - dy * 0.2));
        view.current.velocity = (dx * 0.42 * 1000) / elapsed;
        gesture.current.x = event.clientX;
        gesture.current.y = event.clientY;
        gesture.current.time = now;
        gesture.current.travel += Math.abs(dx) + Math.abs(dy);
        view.current.touched = now;
      }}
      onPointerUp={(event) => {
        if (compact) return;
        pointers.current.delete(event.pointerId);
        if (!pointers.current.size) dragging.current = false;
        if (gesture.current.travel < 7) {
          const rect = frame.current?.getBoundingClientRect();
          if (rect) sparkle(event.clientX - rect.left, event.clientY - rect.top);
        }
        view.current.touched = performance.now();
      }}
      onPointerCancel={(event) => {
        pointers.current.delete(event.pointerId);
        dragging.current = pointers.current.size > 0;
      }}
      onWheel={(event) => {
        if (compact) return;
        event.preventDefault();
        view.current.zoom = Math.max(0.75, Math.min(1.5, view.current.zoom - event.deltaY * 0.001));
        view.current.touched = performance.now();
      }}
      onKeyDown={(event) => {
        if (compact) return;
        const v = view.current;
        if (event.key === "ArrowLeft") v.yaw -= 12;
        else if (event.key === "ArrowRight") v.yaw += 12;
        else if (event.key === "ArrowUp") v.pitch = Math.min(28, v.pitch + 5);
        else if (event.key === "ArrowDown") v.pitch = Math.max(-24, v.pitch - 5);
        else if (event.key === "+" || event.key === "=") v.zoom = Math.min(1.5, v.zoom + 0.1);
        else if (event.key === "-") v.zoom = Math.max(0.75, v.zoom - 0.1);
        else if (event.key === "Enter" || event.key === " ") {
          const rect = frame.current?.getBoundingClientRect();
          if (rect) sparkle(rect.width / 2, rect.height / 2);
        } else return;
        event.preventDefault();
        v.touched = performance.now();
      }}
    >
      <div className="stage-circle" aria-hidden="true" />
      <svg className="stage-orbit" viewBox="0 0 400 400" aria-hidden="true"><path d="M42 222c-14-98 57-175 155-183 102-8 172 56 166 153-6 104-77 167-170 164C99 354 24 301 42 222Z" /></svg>
      {failed ? (
        <div className="dish-fallback"><strong>{dish.name}</strong><span>图片暂未展开，选配和点单不受影响。</span></div>
      ) : (
        <img ref={object} className="sketch-dish-object" src={dish.image} alt={dish.name} draggable={false} onError={() => setFailed(true)} />
      )}
      <canvas ref={canvas} className="spark-layer" aria-hidden="true" />
      <span className="stage-note">{compact ? "手绘菜品" : "拖动转一转 · 点一下有惊喜"}</span>
    </div>
  );
}
