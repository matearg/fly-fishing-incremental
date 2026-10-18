import { SPECIES, type LocationId } from '../game/data'

export type SoundId = 'castBack' | 'castForward' | 'plip' | 'bite' | 'reel' | 'splashOut' | 'catch' | 'catchBig' | 'junk'
  | 'move' | 'select' | 'back' | 'nope' | 'buy' | 'sell' | 'season'
export type Wave = 'square' | 'triangle' | 'noise'

// One voice. Attack 5 ms, then decays to silence by `dur`. Tones: freq is pitch in Hz.
// Noise: freq is the lowpass cutoff. `to` slides freq over the note (exponentially).
export interface Note { wave: Wave; at: number; dur: number; freq: number; to?: number; gain: number }

const sq = (at: number, dur: number, freq: number, gain = 0.12, to?: number): Note => ({ wave: 'square', at, dur, freq, gain, to })
const tri = (at: number, dur: number, freq: number, gain = 0.3, to?: number): Note => ({ wave: 'triangle', at, dur, freq, gain, to })
const noise = (at: number, dur: number, freq: number, gain: number, to?: number): Note => ({ wave: 'noise', at, dur, freq, gain, to })

// Note pitches (Hz), equal temperament.
const C5 = 523, D5 = 587, E5 = 659, G5 = 784, A5 = 880, C6 = 1047, E6 = 1319, G6 = 1568
const arp = (pitches: number[], step: number, dur: number, gain = 0.1) => pitches.map((f, i) => sq(i * step, dur, f, gain))

export const SFX: Record<SoundId, Note[]> = {
  castBack: [noise(0, 220, 600, 0.25, 2400)],
  castForward: [noise(0, 260, 2400, 0.3, 700)],
  plip: [tri(0, 90, 1400, 0.3, 500), noise(0, 60, 3000, 0.12)],
  bite: [tri(0, 60, 500, 0.35, 1200), noise(0, 80, 2000, 0.2), tri(70, 60, 900, 0.25, 1600)],
  reel: Array.from({ length: 12 }, (_, i) => sq(i * 62, 18, i % 2 ? 2200 : 1900, 0.05)),
  splashOut: [noise(0, 380, 3500, 0.35, 500), tri(0, 150, 300, 0.2, 900)],
  catch: [...arp([C5, E5, G5], 70, 90), sq(210, 180, C6, 0.1)],
  catchBig: [...arp([C5, E5, G5, C6, E6], 70, 90), sq(350, 120, G6, 0.1), sq(470, 300, C6 * 2, 0.08), tri(0, 770, C5 / 2, 0.25)],
  junk: [tri(0, 160, 160, 0.4, 90), noise(0, 90, 500, 0.25)],
  move: [sq(0, 40, 880, 0.06)],
  select: [sq(0, 50, 988, 0.08), sq(45, 70, 1319, 0.08)],
  back: [sq(0, 50, 660, 0.08), sq(45, 70, 440, 0.08)],
  nope: [sq(0, 130, 110, 0.1, 90)],
  buy: [sq(0, 70, 1976, 0.08), sq(70, 260, 2637, 0.08), noise(0, 40, 6000, 0.08)],
  sell: [sq(0, 50, 1568, 0.06), sq(55, 150, 2093, 0.06)],
  season: [
    ...arp([G5, C6, E6, G6], 110, 140),
    sq(440, 220, E6, 0.1), sq(660, 600, G6, 0.1),
    tri(0, 440, C5 / 2, 0.3), tri(440, 220, A5 / 4, 0.3), tri(660, 700, C5 / 4, 0.3),
    sq(660, 600, D5 * 2, 0.06),
  ],
}

export function soundLength(id: SoundId): number {
  return Math.max(...SFX[id].map(n => n.at + n.dur))
}

// Continuous water: lowpassed noise with a slow swell in volume, plus random little plips ("babble").
export interface Ambience { cutoff: number; gain: number; swellHz: number; swellDepth: number; babblePerSec: number }

export const AMBIENCE: Record<LocationId, Ambience> = {
  creek: { cutoff: 1800, gain: 0.08, swellHz: 0.3, swellDepth: 0.2, babblePerSec: 3 },
  river: { cutoff: 1300, gain: 0.09, swellHz: 0.2, swellDepth: 0.25, babblePerSec: 1.5 },
  bigRiver: { cutoff: 900, gain: 0.1, swellHz: 0.15, swellDepth: 0.3, babblePerSec: 0.8 },
  mountainLake: { cutoff: 600, gain: 0.07, swellHz: 0.1, swellDepth: 0.4, babblePerSec: 0.3 },
  greatLake: { cutoff: 450, gain: 0.08, swellHz: 0.08, swellDepth: 0.5, babblePerSec: 0.2 },
}

export const TITLE_AMBIENCE = 0.5 // title water level relative to the fishing scene
export const HELPER_GAIN = 0.4

export function catchSound(c: { kind: 'fish' | 'junk'; defId: string }): SoundId {
  if (c.kind === 'junk') return 'junk'
  const tier = SPECIES.find(s => s.id === c.defId)?.tier
  return tier === 'rare' || tier === 'legendary' ? 'catchBig' : 'catch'
}
