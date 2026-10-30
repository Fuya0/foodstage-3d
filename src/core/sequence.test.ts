import { describe, expect, it } from 'vitest';
import { createSequenceState, sequenceReducer, type SequenceState } from './sequence';
import { manifest } from '../data/manifest';

function bite(state: SequenceState, count = 8): SequenceState {
  for (let i = 0; i < count; i++) state = sequenceReducer(state, { type: 'BITE' });
  return state;
}
function complete(state: SequenceState, type: 'FINAL_DONE' | 'EATING_DONE') {
  return sequenceReducer(state, { type, run: state.run, transition: state.transition });
}

describe('sequence', () => {
  it('does not accept bites before stage zero is ready or unrelated readiness', () => {
    const initial = createSequenceState();
    expect(bite(initial, 20)).toBe(initial);
    const later = sequenceReducer(initial, { type: 'READY', stage: 1, run: initial.run });
    expect(later.phase).toBe('loading');
    const ready = sequenceReducer(later, { type: 'READY', stage: 0, run: initial.run });
    expect(ready).toMatchObject({ phase: 'idle', stage: 0, bites: 0 });
  });

  it('caps repeated bites at eight and advances only after both animation completions', () => {
    const initial = createSequenceState([0, 1]);
    const final = bite(initial, 20);
    expect(final).toMatchObject({ stage: 0, bites: 8, phase: 'final' });
    expect(complete(final, 'EATING_DONE')).toBe(final);
    const eating = complete(final, 'FINAL_DONE');
    expect(eating.phase).toBe('eating');
    expect(bite(eating)).toBe(eating);
    expect(complete(eating, 'FINAL_DONE')).toBe(eating);
    expect(complete(eating, 'EATING_DONE')).toMatchObject({ stage: 1, bites: 0, phase: 'idle' });
  });

  it('keeps the current stage with eight bites until the next asset is ready', () => {
    const waiting = bite(createSequenceState([0]));
    expect(waiting).toMatchObject({ stage: 0, bites: 8, phase: 'waiting' });
    expect(complete(waiting, 'FINAL_DONE')).toBe(waiting);
    const unrelated = sequenceReducer(waiting, { type: 'READY', stage: 3, run: waiting.run });
    expect(unrelated.phase).toBe('waiting');
    const final = sequenceReducer(unrelated, { type: 'READY', stage: 1, run: waiting.run });
    expect(final).toMatchObject({ stage: 0, bites: 8, phase: 'final' });
    expect(complete(complete(final, 'FINAL_DONE'), 'EATING_DONE')).toMatchObject({ stage: 1, phase: 'idle' });
  });

  it('finishes after exactly thirty-two bites and never advances past the final stage', () => {
    let state = createSequenceState([0, 1, 2, 3]);
    for (let stage = 0; stage < 4; stage++) {
      state = bite(state, 7);
      expect(state).toMatchObject({ stage, bites: 7, phase: 'idle' });
      state = complete(complete(bite(state, 1), 'FINAL_DONE'), 'EATING_DONE');
    }
    expect(state).toMatchObject({ stage: 3, bites: 8, phase: 'finished' });
    expect(bite(state)).toBe(state);
    expect(complete(state, 'EATING_DONE')).toBe(state);
    expect(manifest).toHaveLength(4);
    expect(manifest.map(item => item.url)).toEqual(['/models/burger-0.glb', '/models/burger-1.glb', '/models/burger-2.glb', '/models/burger-3.glb']);
  });

  it('restarts with cached readiness and ignores old callbacks even in the same phase', () => {
    const oldFinal = bite(createSequenceState([0, 1]));
    const oldEating = complete(oldFinal, 'FINAL_DONE');
    const restarted = sequenceReducer(oldEating, { type: 'RESTART' });
    expect(restarted).toMatchObject({ stage: 0, bites: 0, phase: 'idle', run: 1 });
    expect(sequenceReducer(restarted, { type: 'EATING_DONE', run: oldEating.run, transition: oldEating.transition })).toBe(restarted);
    const newFinal = bite(restarted);
    expect(sequenceReducer(newFinal, { type: 'FINAL_DONE', run: oldFinal.run, transition: oldFinal.transition })).toBe(newFinal);
    const newEating = complete(newFinal, 'FINAL_DONE');
    expect(sequenceReducer(newEating, { type: 'EATING_DONE', run: oldEating.run, transition: oldEating.transition })).toBe(newEating);
    expect(sequenceReducer(newEating, { type: 'EATING_DONE', run: newEating.run, transition: newEating.transition - 1 })).toBe(newEating);
    const next = complete(newEating, 'EATING_DONE');
    const nextFinal = bite(sequenceReducer(next, { type: 'READY', stage: 2, run: next.run }));
    expect(sequenceReducer(nextFinal, { type: 'FINAL_DONE', run: newFinal.run, transition: newFinal.transition })).toBe(nextFinal);
  });

  it('ignores stale or invalid readiness and restarts loading without a cached first asset', () => {
    const state = sequenceReducer(createSequenceState(), { type: 'RESTART' });
    expect(state.phase).toBe('loading');
    for (const stage of [-1, 4, 0.5, NaN]) {
      expect(sequenceReducer(state, { type: 'READY', stage, run: state.run })).toBe(state);
    }
    expect(sequenceReducer(state, { type: 'READY', stage: 0, run: state.run - 1 })).toBe(state);
  });
});
