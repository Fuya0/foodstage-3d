import { useEffect, useRef, useState } from "react";
import type { Dish, Settings } from "../types";
import { playTick } from "../lib/sound";

const WIDTH = 680;
const HEIGHT = 560;
const centers = [
  [280, 230], [385, 235], [330, 300], [245, 310], [420, 300], [330, 190],
  [290, 365], [400, 365], [225, 250], [450, 250], [330, 260], [350, 330],
];
const stageNames = ["完整上桌", "咬开香气", "滋味散开", "留下满足", "刚刚好"];

type Crumb = { id: number; x: number; y: number; dx: number; dy: number; rotate: number; color: string };

export default function Tasting({ dish, settings, onExit }: { dish: Dish; settings: Settings; onExit: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const image = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [bites, setBites] = useState(0);
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);

  function redraw() {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !image.current) return;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    const im = image.current;
    const scale = Math.min((WIDTH - 80) / im.width, (HEIGHT - 60) / im.height);
    const w = im.width * scale;
    const h = im.height * scale;
    ctx.drawImage(im, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
  }

  useEffect(() => {
    const im = new Image();
    im.src = dish.image;
    im.onload = () => {
      image.current = im;
      setLoaded(true);
      requestAnimationFrame(redraw);
    };
    im.onerror = () => setFailed(true);
  }, [dish.image]);

  function biteAt(x: number, y: number) {
    if (!loaded || bites >= 12) return;
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const index = bites;
    const [cx, cy] = centers[index];
    const radius = 37 + index * 1.8;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    for (let i = 0; i < 18; i += 1) {
      const angle = (Math.PI * 2 * i) / 18;
      const jitter = radius * (0.82 + 0.18 * Math.sin(i * 4.7 + index));
      const px = cx + Math.cos(angle) * jitter;
      const py = cy + Math.sin(angle) * jitter;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    const next = bites + 1;
    setBites(next);
    playTick(settings.sound, next === 12);
    if (!settings.reducedMotion) {
      const born = Date.now();
      const fresh = Array.from({ length: 10 }, (_, i) => ({
        id: born + i,
        x,
        y,
        dx: Math.cos((Math.PI * 2 * i) / 10) * (35 + (i % 3) * 12),
        dy: Math.sin((Math.PI * 2 * i) / 10) * 30 - 35,
        rotate: i * 47,
        color: i % 3 === 0 ? "#C9573B" : i % 3 === 1 ? "#E3AC3C" : "#F5EEDF",
      }));
      setCrumbs((current) => [...current, ...fresh]);
      window.setTimeout(() => setCrumbs((current) => current.filter((crumb) => !fresh.some((item) => item.id === crumb.id))), 800);
    }
  }

  const stage = Math.min(4, Math.floor(bites / 3));

  return (
    <main className="tasting-page page-shell" data-screen="tasting">
      <header className="simple-header">
        <button className="text-button" type="button" onClick={onExit}>← 合上试吃页</button>
        <span>虚拟试吃 · 不会真的减少餐品</span>
      </header>
      <section className="tasting-layout">
        <div className="tasting-copy">
          <p className="eyebrow">用手绘咬一口</p>
          <h1>{dish.name}</h1>
          <p>轻点菜品，纸面会留下不规则咬痕。每一次都只是菜单里的互动反馈。</p>
          <div className="tasting-progress" aria-label={`试吃进度 ${bites} / 12 口`}>
            <div className="progress-label"><strong>{stageNames[stage]}</strong><span>{bites} / 12 口</span></div>
            <div className="scribble-progress"><i style={{ width: `${(bites / 12) * 100}%` }} /></div>
          </div>
          <p className="keyboard-hint">也可以按 Enter 吃一口</p>
        </div>
        <div className="tasting-paper">
          <div className="tasting-canvas-wrap">
            <svg viewBox="0 0 700 580" className="tasting-ring" aria-hidden="true"><path d="M69 289C55 138 190 41 349 43c159 2 279 88 282 230 3 149-111 255-275 258C188 533 83 439 69 289Z" /></svg>
            <canvas
              ref={canvas}
              width={WIDTH}
              height={HEIGHT}
              role="button"
              tabIndex={0}
              aria-label={`咬一口${dish.name}，已吃${bites}口`}
              data-bites={bites}
              onPointerDown={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                biteAt((event.clientX - rect.left) * WIDTH / rect.width, (event.clientY - rect.top) * HEIGHT / rect.height);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  biteAt(WIDTH / 2, HEIGHT / 2);
                }
              }}
            />
            {!loaded && !failed && <p className="canvas-message">正在铺开菜品插画…</p>}
            {failed && <p className="canvas-message">插画没有展开，请返回详情继续点单。</p>}
            {crumbs.map((crumb) => (
              <i key={crumb.id} className="paper-crumb" style={{ left: `${crumb.x / WIDTH * 100}%`, top: `${crumb.y / HEIGHT * 100}%`, background: crumb.color, "--dx": `${crumb.dx}px`, "--dy": `${crumb.dy}px`, "--rot": `${crumb.rotate}deg` } as React.CSSProperties} />
            ))}
            {bites === 12 && <div className="tasting-stamp">刚刚好<span>12 口完成</span></div>}
          </div>
        </div>
      </section>
    </main>
  );
}
