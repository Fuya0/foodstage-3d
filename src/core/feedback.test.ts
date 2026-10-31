import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Settings } from './settings';

const settings: Settings = { sound: true, haptics: false, motion: 'system', sensitivity: 1 };

function audioBoundary(state = 'running') {
  const nodes: ReturnType<typeof node>[] = [];
  function node(kind: string) {
    const parameter = () => ({ setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
    const result = {
      kind, type: '', buffer: null as unknown, frequency: parameter(), gain: parameter(), Q: parameter(),
      connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(),
      addEventListener: vi.fn(),
    };
    return result;
  }
  const makeNode = (kind: string) => {
    const result = node(kind);
    nodes.push(result);
    return result;
  };
  const samples: Float32Array[] = [];
  const context = {
    state, currentTime: 4, sampleRate: 48000, destination: {},
    resume: vi.fn(async () => { context.state = 'running'; }), close: vi.fn(),
    createOscillator: vi.fn(() => makeNode('oscillator')),
    createGain: vi.fn(() => makeNode('gain')),
    createBiquadFilter: vi.fn(() => makeNode('filter')),
    createBufferSource: vi.fn(() => makeNode('noise')),
    createBuffer: vi.fn((_channels: number, length: number) => {
      const data = new Float32Array(length);
      samples.push(data);
      return { getChannelData: () => data };
    }),
  };
  const Constructor = vi.fn(function () { return context; });
  vi.stubGlobal('AudioContext', Constructor);
  return { context, Constructor, nodes, samples };
}

beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('biteFeedback', () => {
  it('does not create audio when muted, while allowing optional finishing vibration', async () => {
    const { Constructor } = audioBoundary();
    const vibrate = vi.fn();
    vi.stubGlobal('navigator', { vibrate });
    const { biteFeedback } = await import('./feedback');
    biteFeedback({ ...settings, sound: false, haptics: true }, true);
    expect(Constructor).not.toHaveBeenCalled();
    expect(vibrate).toHaveBeenCalledWith([12, 30, 22]);
  });

  it.each([false, true])('schedules two soft lowpassed chewing pulses and releases every node (finishing: %s)', async (finishing) => {
    const { context, nodes, samples } = audioBoundary();
    const { biteFeedback } = await import('./feedback');
    biteFeedback(settings, finishing);
    const noises = nodes.filter((entry) => entry.kind === 'noise');
    const filters = nodes.filter((entry) => entry.kind === 'filter');
    const tones = nodes.filter((entry) => entry.kind === 'oscillator');
    expect(noises).toHaveLength(2);
    expect(tones).toHaveLength(2);
    expect(samples.every((data) => data.some((sample) => sample !== 0))).toBe(true);
    expect(noises[0]!.start).toHaveBeenCalledWith(context.currentTime);
    const spacing = noises[1]!.start.mock.calls[0]![0] - context.currentTime;
    expect(spacing).toBeCloseTo(0.26);
    const end = noises[1]!.stop.mock.calls[0]![0] - context.currentTime;
    expect(end).toBeCloseTo(0.5);
    for (const [index, noise] of noises.entries()) {
      const filter = filters[index]!;
      expect(noise.connect).toHaveBeenCalledWith(filter);
      expect(filter.type).toBe('lowpass');
      expect(filter.frequency.setValueAtTime.mock.calls[0]![0]).toBeLessThanOrEqual(800);
      expect(filter.Q.setValueAtTime.mock.calls[0]![0]).toBeLessThan(1);
      const tone = tones[index]!;
      expect(tone.type).toBe('sine');
      expect(tone.frequency.setValueAtTime.mock.calls[0]![0]).toBeLessThan(160);
      expect(tone.frequency.exponentialRampToValueAtTime.mock.calls[0]![0]).toBeLessThan(tone.frequency.setValueAtTime.mock.calls[0]![0]);
    }
    for (const gain of nodes.filter((entry) => entry.kind === 'gain')) {
      const start = gain.gain.setValueAtTime.mock.calls[0]![1];
      const [peak, attack] = gain.gain.exponentialRampToValueAtTime.mock.calls[0]!;
      expect(attack - start).toBeGreaterThanOrEqual(0.025);
      expect(peak).toBeLessThanOrEqual(0.12);
    }
    for (const source of [...noises, ...tones]) {
      const ended = source.addEventListener.mock.calls.find(([event]) => event === 'ended')!;
      ended[1]();
    }
    expect(nodes.every((entry) => entry.disconnect.mock.calls.length > 0)).toBe(true);
    expect(context.close).not.toHaveBeenCalled();
  });

  it('reuses one audio context across bites and resumes suspended audio', async () => {
    const { context, Constructor } = audioBoundary('suspended');
    const { biteFeedback } = await import('./feedback');
    biteFeedback(settings);
    await Promise.resolve();
    await Promise.resolve();
    biteFeedback(settings);
    expect(Constructor).toHaveBeenCalledOnce();
    expect(context.resume).toHaveBeenCalledOnce();
    expect(context.createBufferSource).toHaveBeenCalledTimes(4);
  });

  it('releases scheduled pulses and a partial graph if audio construction fails', async () => {
    const { context, nodes } = audioBoundary();
    context.createBufferSource.mockImplementationOnce(() => {
      const source = context.createOscillator();
      source.kind = 'noise';
      return source;
    }).mockImplementationOnce(() => { throw new Error('device unavailable'); });
    const { biteFeedback } = await import('./feedback');
    expect(() => biteFeedback(settings)).not.toThrow();
    const sources = nodes.filter((entry) => entry.kind === 'noise' || entry.kind === 'oscillator');
    expect(sources.length).toBeGreaterThan(0);
    expect(sources.every((source) => source.stop.mock.calls.some((call) => call.length === 0))).toBe(true);
    expect(nodes.every((entry) => entry.disconnect.mock.calls.length > 0)).toBe(true);
    expect(context.close).not.toHaveBeenCalled();
  });

  it('contains rejected resume promises without scheduling audio', async () => {
    const { context } = audioBoundary('suspended');
    context.resume.mockRejectedValue(new Error('blocked'));
    const { biteFeedback } = await import('./feedback');
    expect(() => biteFeedback(settings)).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
    expect(context.createBufferSource).not.toHaveBeenCalled();
  });
});
