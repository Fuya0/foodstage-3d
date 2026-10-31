import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, readSettings, saveSettings, type Settings } from './settings';

type MemoryStorage = Storage & { data: Record<string, string> };

function memoryStorage(initial: Record<string, string> = {}): MemoryStorage {
  const data = { ...initial };
  return {
    data,
    getItem(key) { return data[key] ?? null; },
    setItem(key, value) { data[key] = value; },
    removeItem(key) { delete data[key]; },
    clear() { for (const key of Object.keys(data)) delete data[key]; },
    key(index) { return Object.keys(data)[index] ?? null; },
    get length() { return Object.keys(data).length; },
  };
}

describe('settings persistence', () => {
  it('writes the FoodStage key and preserves preferences from the former brand', () => {
    const settings = { ...DEFAULT_SETTINGS, sound: false };
    const storage = memoryStorage({ 'jiaoguang-settings': JSON.stringify(settings) });
    expect(readSettings(storage)).toEqual(settings);
    saveSettings(settings, storage);
    expect(JSON.parse(storage.data['foodstage-3d-settings']!)).toEqual(settings);
    storage.data['foodstage-3d-settings'] = JSON.stringify({ ...settings, sound: true });
    expect(readSettings(storage).sound).toBe(true);
  });
  it('exports the requested defaults', () => {
    expect(DEFAULT_SETTINGS).toEqual({ sound: true, haptics: false, motion: 'system', sensitivity: 1 });
    expect(readSettings(memoryStorage())).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to defaults for invalid JSON', () => {
    expect(readSettings(memoryStorage({ 'jiaoguang-settings': '{bad json' }))).toEqual(DEFAULT_SETTINGS);
  });

  it('sanitizes persisted values', () => {
    const storage = memoryStorage({
      'jiaoguang-settings': JSON.stringify({ sound: 'yes', haptics: 1, motion: 'cinematic', sensitivity: 99 }),
    });
    expect(readSettings(storage)).toEqual({ sound: true, haptics: false, motion: 'system', sensitivity: 1.5 });
  });

  it('catches storage errors while reading and writing', () => {
    const broken = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    } as unknown as Storage;
    expect(readSettings(broken)).toEqual(DEFAULT_SETTINGS);
    expect(() => saveSettings(DEFAULT_SETTINGS, broken)).not.toThrow();
  });

  it('round trips valid settings', () => {
    const storage = memoryStorage();
    const settings: Settings = { sound: true, haptics: true, motion: 'reduced', sensitivity: 0.75 };
    saveSettings(settings, storage);
    expect(readSettings(storage)).toEqual(settings);
  });
});
