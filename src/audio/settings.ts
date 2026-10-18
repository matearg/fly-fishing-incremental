export interface SoundSettings { level: number; muted: boolean } // level: bar steps 1–10, 10% each

export const SOUND_KEY = 'flyfishing-sound'
export const DEFAULT_SOUND: SoundSettings = { level: 7, muted: false }
// Music has the same kind of setting; it starts lower so it sits under the effects.
export const MUSIC_KEY = 'flyfishing-music'
export const DEFAULT_MUSIC: SoundSettings = { level: 5, muted: false }

const validLevel = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1 && (n as number) <= 10

// Stored outside the save, so a bad value only costs the volume, never the game.
export function parseSound(raw: string | null, fallback = DEFAULT_SOUND): SoundSettings {
  try {
    const v = JSON.parse(raw ?? 'null')
    if (!v || typeof v !== 'object' || Array.isArray(v)) return { ...fallback }
    return {
      level: validLevel(v.level) ? v.level : fallback.level,
      muted: typeof v.muted === 'boolean' ? v.muted : fallback.muted,
    }
  } catch {
    return { ...fallback }
  }
}

export function serializeSound(s: SoundSettings): string {
  return JSON.stringify(s)
}

export function soundGain(s: SoundSettings): number {
  return s.muted ? 0 : s.level / 10
}

// Silence is what mute is for, so the lowest step is 10%.
export function setLevel(s: SoundSettings, level: number): SoundSettings {
  return { ...s, level: Math.min(10, Math.max(1, Math.round(level))), muted: false }
}

export function toggleMute(s: SoundSettings): SoundSettings {
  return { ...s, muted: !s.muted }
}

// Storage can throw (private mode, quota, blocked site data).
export function storeAt(key: string): { read(): string | null; write(raw: string): void } {
  return {
    read() { try { return localStorage.getItem(key) } catch { return null } },
    write(raw) { try { localStorage.setItem(key, raw) } catch { /* the setting just won't stick */ } },
  }
}
export const soundStore = storeAt(SOUND_KEY)
export const musicStore = storeAt(MUSIC_KEY)
