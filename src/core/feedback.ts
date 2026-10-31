import type { Settings } from './settings';

let audioContext: AudioContext | undefined;

async function playBite(finishing: boolean): Promise<void> {
  const AudioContextConstructor = globalThis.AudioContext
    ?? (globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return;
  if (!audioContext || audioContext.state === 'closed') audioContext = new AudioContextConstructor();
  const context = audioContext;
  if (context.state === 'suspended') await context.resume();
  if (context.state !== 'running') return;

  const nodes: AudioNode[] = [];
  const sources: AudioScheduledSourceNode[] = [];
  const track = <T extends AudioNode>(node: T): T => { nodes.push(node); return node; };
  const voice = (source: AudioScheduledSourceNode, chain: AudioNode[], start: number, duration: number) => {
    sources.push(source);
    source.addEventListener('ended', () => {
      for (const node of [source, ...chain]) node.disconnect();
    }, { once: true });
    source.start(start);
    source.stop(start + duration);
  };
  const envelope = (peak: number, start: number, duration: number) => {
    const gain = track(context.createGain());
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.045);
    gain.gain.exponentialRampToValueAtTime(peak * 0.55, start + 0.10);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    gain.connect(context.destination);
    return gain;
  };

  try {
    // Rounded, slightly uneven jaw closures: soft mouth texture over a low body tone.
    const startTime = context.currentTime;
    const duration = 0.24;
    for (const [index, offset] of [0, 0.26].entries()) {
      const start = startTime + offset;
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
      const samples = buffer.getChannelData(0);
      let softened = 0;
      for (let i = 0; i < samples.length; i += 1) {
        const time = i / context.sampleRate;
        softened = softened * 0.94 + (Math.random() * 2 - 1) * 0.06;
        const mouth = 0.75 + 0.25 * Math.sin(time * Math.PI * 2 * 19 + index);
        samples[i] = softened * mouth * 3;
      }
      const mouth = track(context.createBufferSource());
      mouth.buffer = buffer;
      const filter = track(context.createBiquadFilter());
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(index === 0 ? 720 : 620, start);
      filter.frequency.exponentialRampToValueAtTime(280, start + duration);
      filter.Q.setValueAtTime(0.7, start);
      const mouthGain = envelope((finishing ? 0.12 : 0.1) * (index === 0 ? 1 : 0.88), start, duration);
      mouth.connect(filter);
      filter.connect(mouthGain);
      voice(mouth, [filter, mouthGain], start, duration);

      const body = track(context.createOscillator());
      body.type = 'sine';
      body.frequency.setValueAtTime(index === 0 ? 112 : 98, start);
      body.frequency.exponentialRampToValueAtTime(58, start + duration);
      const bodyGain = envelope(finishing ? 0.045 : 0.035, start, duration);
      body.connect(bodyGain);
      voice(body, [bodyGain], start, duration);
    }
  } catch {
    // Release even a partially constructed graph if the device becomes unavailable.
    for (const source of sources) {
      try { source.stop(); } catch { /* It may already have ended. */ }
    }
    for (const node of nodes) node.disconnect();
  }
}

export function biteFeedback(settings: Settings, finishing = false): void {
  if (settings.sound) {
    // Browser policy and device failures must never interrupt the interaction.
    void playBite(finishing).catch(() => {});
  }

  if (settings.haptics) {
    try {
      globalThis.navigator?.vibrate?.(finishing ? [12, 30, 22] : 12);
    } catch {
      // Vibration is unsupported or blocked on this device.
    }
  }
}
