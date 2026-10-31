export type MotionPreference = 'system' | 'reduced' | 'full';

export interface Settings {
  sound: boolean;
  haptics: boolean;
  motion: MotionPreference;
  sensitivity: number;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  sound: true,
  haptics: false,
  motion: 'system' as const,
  sensitivity: 1,
});

export const defaults = DEFAULT_SETTINGS;

const SETTINGS_KEY = 'jiaoguang-settings';

function readStorage(storage?: Pick<Storage, 'getItem'>): Pick<Storage, 'getItem'> | undefined {
  if (storage) return storage;
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

function writeStorage(storage?: Pick<Storage, 'setItem'>): Pick<Storage, 'setItem'> | undefined {
  if (storage) return storage;
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function sanitizeSettings(value: unknown): Settings {
  const candidate = value && typeof value === 'object' ? value as Partial<Settings> : {};
  const sensitivity = typeof candidate.sensitivity === 'number' && Number.isFinite(candidate.sensitivity)
    ? Math.min(1.5, Math.max(0.5, candidate.sensitivity))
    : DEFAULT_SETTINGS.sensitivity;
  return {
    sound: typeof candidate.sound === 'boolean' ? candidate.sound : DEFAULT_SETTINGS.sound,
    haptics: typeof candidate.haptics === 'boolean' ? candidate.haptics : DEFAULT_SETTINGS.haptics,
    motion: candidate.motion === 'reduced' || candidate.motion === 'full' || candidate.motion === 'system'
      ? candidate.motion : DEFAULT_SETTINGS.motion,
    sensitivity,
  };
}

export function readSettings(storage?: Pick<Storage, 'getItem'>): Settings {
  try {
    const source = readStorage(storage);
    const raw = source?.getItem(SETTINGS_KEY);
    return raw ? sanitizeSettings(JSON.parse(raw)) : sanitizeSettings(DEFAULT_SETTINGS);
  } catch {
    return sanitizeSettings(DEFAULT_SETTINGS);
  }
}

export function saveSettings(settings: Settings, storage?: Pick<Storage, 'setItem'>): void {
  try {
    const target = writeStorage(storage);
    target?.setItem(SETTINGS_KEY, JSON.stringify(sanitizeSettings(settings)));
  } catch {
    // Persistence is best effort, so blocked storage does not interrupt play.
  }
}
