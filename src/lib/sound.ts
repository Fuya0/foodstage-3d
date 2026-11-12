let context: AudioContext | null = null;

export function playTick(enabled: boolean, complete = false) {
  if (!enabled) return;
  try {
    context ??= new AudioContext();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(complete ? 440 : 310, now);
    oscillator.frequency.exponentialRampToValueAtTime(complete ? 660 : 390, now + 0.09);
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
  } catch {
    // Sound is optional; ordering never depends on it.
  }
}
