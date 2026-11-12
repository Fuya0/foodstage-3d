import { useEffect, useRef } from "react";
import { dishes, money } from "../data";
import type { Settings } from "../types";

export default function MenuRibbon({ settings, onSelect }: { settings: Settings; onSelect: (id: string) => void }) {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const offset = useRef(0);
  const dragging = useRef(false);
  const moved = useRef(0);
  const lastX = useRef(0);
  const hovered = useRef(false);
  const featured = dishes.filter((dish) => dish.featured);

  useEffect(() => {
    let raf = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(40, now - previous);
      previous = now;
      if (track.current) {
        const half = track.current.scrollWidth / 2;
        if (!settings.reducedMotion && !dragging.current && !hovered.current) offset.current += dt * 0.018;
        if (half > 0) {
          offset.current = ((offset.current % half) + half) % half;
          track.current.style.transform = `translate3d(${-offset.current}px,0,0)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [settings.reducedMotion]);

  return (
    <div
      ref={viewport}
      className="menu-ribbon"
      onMouseEnter={() => { hovered.current = true; }}
      onMouseLeave={() => { hovered.current = false; }}
      onFocus={() => { hovered.current = true; }}
      onBlur={() => { hovered.current = false; }}
      onPointerDown={(event) => {
        dragging.current = true;
        moved.current = 0;
        lastX.current = event.clientX;
        viewport.current?.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragging.current) return;
        const dx = event.clientX - lastX.current;
        lastX.current = event.clientX;
        moved.current += Math.abs(dx);
        offset.current -= dx;
      }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
    >
      <div ref={track} className="ribbon-track">
        {[...featured, ...featured, ...featured].map((dish, index) => (
          <button
            className="ribbon-dish"
            type="button"
            key={`${dish.id}-${index}`}
            tabIndex={index < featured.length ? 0 : -1}
            aria-hidden={index >= featured.length}
            onClick={() => { if (moved.current < 8) onSelect(dish.id); }}
          >
            <img src={dish.image} alt="" draggable={false} />
            <span><strong>{dish.name}</strong><small>{money(dish.price)} / {dish.unit}</small></span>
          </button>
        ))}
      </div>
    </div>
  );
}
