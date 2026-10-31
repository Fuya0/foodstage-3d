import type { FoodStage } from '../data/foods';

export type SequencePhase = 'loading' | 'idle' | 'waiting' | 'final' | 'finished';
export interface SequenceState {
  readonly stage: number;
  readonly bites: number;
  readonly phase: SequencePhase;
  readonly ready: readonly number[];
  readonly run: number;
  readonly transition: number;
}
export type SequenceEvent =
  | { type: 'BITE' }
  | { type: 'READY'; stage: number; run: number }
  | { type: 'FINAL_DONE'; run: number; transition: number }
  | { type: 'RESTART' };

function validStage(stages: readonly FoodStage[], stage: number): boolean {
  return Number.isInteger(stage) && stage >= 0 && stage < stages.length;
}

export function createSequenceState(stages: readonly FoodStage[], ready: readonly number[] = []): SequenceState {
  const cached = [...new Set(ready.filter(stage => validStage(stages, stage)))];
  return { stage: 0, bites: 0, phase: cached.includes(0) ? 'idle' : 'loading', ready: cached, run: 0, transition: 0 };
}

export function sequenceReducer(stages: readonly FoodStage[], state: SequenceState, event: SequenceEvent): SequenceState {
  switch (event.type) {
    case 'RESTART':
      return { ...createSequenceState(stages, state.ready), run: state.run + 1, transition: state.transition + 1 };
    case 'READY': {
      if (event.run !== state.run || !validStage(stages, event.stage) || state.ready.includes(event.stage)) return state;
      const ready = [...state.ready, event.stage];
      if (state.phase === 'loading' && event.stage === state.stage) return { ...state, ready, phase: 'idle' };
      if (state.phase === 'waiting' && event.stage === state.stage + 1) return { ...state, ready, phase: 'final', transition: state.transition + 1 };
      return { ...state, ready };
    }
    case 'BITE': {
      if (state.phase !== 'idle') return state;
      const bites = state.bites + 1;
      if (bites < stages[state.stage]!.bites) return { ...state, bites };
      const canExit = state.stage === stages.length - 1 || state.ready.includes(state.stage + 1);
      return { ...state, bites, phase: canExit ? 'final' : 'waiting', transition: state.transition + 1 };
    }
    case 'FINAL_DONE':
      if (state.phase !== 'final' || event.run !== state.run || event.transition !== state.transition) return state;
      return state.stage === stages.length - 1
        ? { ...state, phase: 'finished' }
        : { ...state, stage: state.stage + 1, bites: 0, phase: 'idle' };
  }
}
