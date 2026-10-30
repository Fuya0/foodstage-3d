import { useCallback, useEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { createSequenceState, sequenceReducer } from './core/sequence';
import { createModelStore } from './scene/assets';
import { createMotion, impulse } from './scene/motion';
import { Scene, type HitTest } from './scene/Scene';
import { Progress } from './ui/Progress';
import { useFoodInput } from './ui/useFoodInput';
import { SceneBoundary } from './ui/SceneBoundary';

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change); return () => media.removeEventListener('change', change);
  }, []);
  return reduced;
}
export default function App() {
  const [store] = useState(createModelStore);
  const entries = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [state, dispatch] = useReducer(sequenceReducer, undefined, createSequenceState);
  const [motion] = useState(createMotion);
  const hit = useRef<HitTest | null>(null);
  const [hitReady, setHitReady] = useState(false);
  const setHit = useCallback((next: HitTest | null, owner?: HitTest) => {
    if (owner && hit.current !== owner) return;
    hit.current = next;
    setHitReady(Boolean(next));
  }, []);
  const reduced = useReducedMotion();
  const [contextLost, setContextLost] = useState(false);
  useEffect(() => { void store.load(0); }, [store]);
  useEffect(() => {
    entries.forEach((entry, stage) => { if (entry.status === 'ready') dispatch({ type: 'READY', stage, run: state.run }); });
  }, [entries, state.run]);
  const bite = () => { if (state.phase === 'idle' && !contextLost && hitReady && hit.current) { impulse(motion); dispatch({ type: 'BITE' }); } };
  const playable = state.phase === 'idle' && !contextLost && hitReady;
  const input = useFoodInput(motion, hit, playable, bite);
  const current = entries[state.stage]!, base = entries[0]!;
  const needed = state.phase === 'loading' ? 0 : state.phase === 'waiting' ? state.stage + 1 : -1;
  const error = needed >= 0 && entries[needed]?.status === 'error';
  const status = contextLost ? '三维画面已中断，请重新加载画面。' : error ? '汉堡加载失败，重试后继续。' : state.phase === 'loading' ? '汉堡正在上桌…' : state.phase === 'waiting' ? '下一口正在准备…' : state.phase === 'finished' ? '吃光了。刚刚好。' : state.phase === 'final' || state.phase === 'eating' ? '这一口，满足。' : '轻点吃一口，拖动转一转';
  return <main className="experience" data-testid="experience" data-stage={state.stage} data-bites={state.bites} data-phase={state.phase} data-hit-ready={hitReady}>
    <header><h1>嚼光<span className="brand-dot">。</span></h1></header>
    <div className="stage">
      <div className="plate" aria-hidden="true" />
      <SceneBoundary>
        <div className="food-input" role="button" tabIndex={0} aria-label="汉堡，轻点吃一口，拖动旋转" aria-disabled={!playable} data-hit-ready={hitReady} {...input}
          onContextMenu={event => event.preventDefault()}>
          {!contextLost && current.status === 'ready' && base.status === 'ready' && <Scene asset={current.asset} base={base.asset} state={state} motion={motion} reduced={reduced} dispatch={dispatch} setHit={setHit} onContextLost={() => { setContextLost(true); setHit(null); }} />}
        </div>
      </SceneBoundary>
    </div>
    <footer>
      <Progress stage={state.stage} bites={state.bites} />
      <p role="status" aria-live="polite">{status}</p>
      {error && <button onClick={() => { void store.retry(needed); }}>重试加载</button>}
      {contextLost && <button onClick={() => setContextLost(false)}>重试画面</button>}
      {state.phase === 'finished' && <button onClick={() => { Object.assign(motion, createMotion()); dispatch({ type: 'RESTART' }); }}>再吃一次</button>}
      <span className="keyboard-hint">{state.phase === 'idle' ? '也可以按空格或回车' : '\u00a0'}</span>
    </footer>
  </main>;
}
