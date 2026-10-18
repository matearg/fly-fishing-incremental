import { describe, it, expect } from 'vitest'
import { DEFAULT_SOUND, SOUND_KEY, parseSound, serializeSound, setLevel, soundGain, toggleMute } from './settings'
import { SAVE_KEY } from '../game/save'

describe('sound settings', () => {
  it('falls back to the default on missing or corrupt values', () => {
    for (const raw of [null, '{bad', '[]', '5']) expect(parseSound(raw)).toEqual(DEFAULT_SOUND)
  })

  it('reads a valid setting', () => {
    expect(parseSound('{"level":4,"muted":true}')).toEqual({ level: 4, muted: true })
  })

  it('falls back field by field', () => {
    for (const level of ['0', '11', '5.5', '"7"']) expect(parseSound(`{"level":${level}}`).level).toBe(7)
    expect(parseSound('{"level":3,"muted":"yes"}')).toEqual({ level: 3, muted: false })
    expect(parseSound('{"level":0,"muted":true}')).toEqual({ level: 7, muted: true })
  })

  it('round-trips', () => {
    const s = { level: 3, muted: true }
    expect(parseSound(serializeSound(s))).toEqual(s)
  })

  it('turns the setting into a gain', () => {
    expect(soundGain({ level: 7, muted: false })).toBe(0.7)
    expect(soundGain({ level: 7, muted: true })).toBe(0)
  })

  it('clamps the level and unmutes', () => {
    expect(setLevel({ level: 5, muted: true }, 0)).toEqual({ level: 1, muted: false })
    expect(setLevel({ level: 5, muted: false }, 12).level).toBe(10)
  })

  it('toggles mute and keeps the level', () => {
    expect(toggleMute({ level: 4, muted: false })).toEqual({ level: 4, muted: true })
  })

  it('is stored apart from the save', () => {
    expect(SOUND_KEY).not.toBe(SAVE_KEY)
  })
})
