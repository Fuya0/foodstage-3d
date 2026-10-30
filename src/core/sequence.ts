import { manifest } from '../data/manifest';

export type SequencePhase = 'loading' | 'idle' | 'waiting' | 'final' | 'eating' | 'finished';
export interface SequenceState {
  readonly stage: number;
  readonly bites: number;
  readonly phase: SequencePhase;
  readonly ready: readonly number[];
  /** Changes on restart; capture it when scheduling asynchronous work. */
  readonly run: number;
  /** Changes on every animation phase entry, including across stages. */
  readonly transition: number;
}
export type SequenceEvent =
  | { type: 'BITE' }
  | { type: 'READY'; stage: number; run: number }
  | { type: 'FINAL_DONE' | 'EATING_DONE'; run: number; transition: number }
  | { type: 'RESTART' };

function validStage(stage: number): boolean {
  return Number.isInteger(stage) && stage >= 0 && stage < manifest.length;
}

export function createSequenceState(ready: readonly number[] = []): SequenceState {
  const cached = [...new Set(ready.filter(validStage))];
  return { stage: 0, bites: 0, phase: cached.includes(0) ? 'idle' : 'loading', ready: cached, run: 0, transition: 0 };
}

/** Pure reducer: readiness never advances progress; only matching animation completions do. */
export function sequenceReducer(state: SequenceState, event: SequenceEvent): SequenceState {
  switch (event.type) {
    case 'RESTART':
      return { ...createSequenceState(state.ready), run: state.run + 1, transition: state.transition + 1 };
    case 'READY': {
      if (event.run !== state.run || !validStage(event.stage) || state.ready.includes(event.stage)) return state;
      const ready = [...state.ready, event.stage];
      if (state.phase === 'loading' && event.stage === state.stage) return { ...state, ready, phase: 'idle' };
      if (state.phase === 'waiting' && event.stage === state.stage + 1) {
        return { ...state, ready, phase: 'final', transition: state.transition + 1 };
      }
      return { ...state, ready };
    }
    case 'BITE': {
      if (state.phase !== 'idle') return state;
      const bites = state.bites + 1;
      if (bites < manifest[state.stage]!.bites) return { ...state, bites };
      const canExit = state.stage === manifest.length - 1 || state.ready.includes(state.stage + 1);
      return { ...state, bites, phase: canExit ? 'final' : 'waiting', transition: state.transition + 1 };
    }
    case 'FINAL_DONE':
      if (state.phase !== 'final' || event.run !== state.run || event.transition !== state.transition) return state;
      return { ...state, phase: 'eating', transition: state.transition + 1 };
    case 'EATING_DONE':
      if (state.phase !== 'eating' || event.run !== state.run || event.transition !== state.transition) return state;
      return state.stage === manifest.length - 1
        ? { ...state, phase: 'finished' }
        : { ...state, stage: state.stage + 1, bites: 0, phase: 'idle' };
  }
}
