import type { LocationId } from '../game/data'
import { AMBIENCE, SFX, type Note, type SoundId } from './sounds'

const FADE_S = 0.3
const BABBLE_MS = 100
const BABBLE: Note[] = [{ wave: 'triangle', at: 0, dur: 70, freq: 1400, to: 600, gain: 0.12 }]

interface Water { key: string; fade: GainNode; stop(at: number): void }

// The only Web Audio code: turns the note data in sounds.ts into sound. Browsers block audio until a user gesture,
// so nothing is created before unlock(), and nothing is queued while the context is not running.
export class SoundPlayer {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private noise: AudioBuffer | null = null
  private volume = 1
  private paused = false
  private want: { loc: LocationId | null; scale: number } = { loc: null, scale: 1 }
  private water: Water | null = null

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended' && !this.paused) void this.ctx.resume()
      return
    }
    try { this.ctx = new AudioContext() } catch { return }
    const ctx = this.ctx
    this.master = ctx.createGain()
    this.master.gain.value = this.volume
    this.master.connect(ctx.destination)
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = this.noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    setInterval(() => this.babble(), BABBLE_MS)
    this.ambience(this.want.loc, this.want.scale)
  }

  setVolume(gain: number): void {
    this.volume = gain
    if (this.master) this.master.gain.value = gain
  }

  play(id: SoundId, scale = 1): void {
    this.notes(SFX[id], scale)
  }

  ambience(loc: LocationId | null, scale = 1): void {
    this.want = { loc, scale }
    const ctx = this.ctx
    const key = loc ? `${loc}:${scale}` : ''
    if (!ctx || !this.master || (this.water?.key ?? '') === key) return
    const now = ctx.currentTime
    if (this.water) {
      const old = this.water
      old.fade.gain.cancelScheduledValues(now)
      old.fade.gain.setValueAtTime(old.fade.gain.value, now)
      old.fade.gain.linearRampToValueAtTime(0, now + FADE_S)
      old.stop(now + FADE_S + 0.05)
      this.water = null
    }
    if (!loc) return
    const a = AMBIENCE[loc], base = a.gain * scale
    const src = ctx.createBufferSource()
    src.buffer = this.noise; src.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'; filter.frequency.value = a.cutoff
    const swell = ctx.createGain()
    swell.gain.value = base
    const lfo = ctx.createOscillator(), depth = ctx.createGain()
    lfo.frequency.value = a.swellHz; depth.gain.value = a.swellDepth * base
    lfo.connect(depth).connect(swell.gain)
    const fade = ctx.createGain()
    fade.gain.setValueAtTime(0, now)
    fade.gain.linearRampToValueAtTime(1, now + FADE_S)
    src.connect(filter).connect(swell).connect(fade).connect(this.master)
    src.start(); lfo.start()
    this.water = { key, fade, stop: at => { src.stop(at); lfo.stop(at); src.onended = () => fade.disconnect() } }
  }

  pause(): void {
    this.paused = true
    void this.ctx?.suspend()
  }

  resume(): void {
    this.paused = false
    void this.ctx?.resume()
  }

  // Random little plips over the water. Only while running, so a hidden tab never builds up a burst.
  private babble(): void {
    const loc = this.water && this.want.loc
    if (!loc || Math.random() >= AMBIENCE[loc].babblePerSec * BABBLE_MS / 1000) return
    this.notes(BABBLE, this.want.scale, 0.6 + Math.random() * 0.9)
  }

  private notes(notes: Note[], scale: number, pitch = 1): void {
    const ctx = this.ctx, master = this.master
    if (!ctx || !master || ctx.state !== 'running' || scale <= 0) return
    const t0 = ctx.currentTime
    for (const n of notes) {
      const start = t0 + n.at / 1000, end = start + n.dur / 1000
      const env = ctx.createGain()
      env.gain.setValueAtTime(0, start)
      env.gain.linearRampToValueAtTime(n.gain * scale, start + 0.005)
      env.gain.exponentialRampToValueAtTime(0.0001, end)
      env.connect(master)
      let src: AudioScheduledSourceNode, freq: AudioParam
      if (n.wave === 'noise') {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter()
        s.buffer = this.noise; s.loop = true
        f.type = 'lowpass'
        s.connect(f).connect(env)
        s.start(start, Math.random()) // a random spot in the buffer, so repeats don't sound identical
        src = s; freq = f.frequency
      } else {
        const o = ctx.createOscillator()
        o.type = n.wave
        o.connect(env)
        o.start(start)
        src = o; freq = o.frequency
      }
      freq.setValueAtTime(n.freq * pitch, start)
      if (n.to) freq.exponentialRampToValueAtTime(n.to * pitch, end)
      src.stop(end + 0.01)
      src.onended = () => env.disconnect()
    }
  }
}
