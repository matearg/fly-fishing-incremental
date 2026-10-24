import type { LocationId } from '../game/data'
import { AMBIENCE, SFX, type Note, type SoundId } from './sounds'
import { TUNES, nextPick, phraseSteps, pickNotes, stepMs, type Pick, type TuneId } from './music'

const FADE_S = 0.3
const MUSIC_FADE_S = 1.5
const SCHEDULE_MS = 250
const LOOKAHEAD_S = 1 // queue the next phrase this long before the current one ends
const BABBLE_MS = 100
const BABBLE: Note[] = [{ wave: 'triangle', at: 0, dur: 70, freq: 1400, to: 600, gain: 0.12 }]

interface Water { key: string; fade: GainNode; stop(at: number): void }
interface Song { id: TuneId; fade: GainNode; pick: Pick | null; nextAt: number }

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
  private musicMaster: GainNode | null = null
  private musicVolume = 1
  private wantTune: TuneId | null = null
  private song: Song | null = null

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
    // Music has its own volume, so it goes to the speakers beside the effects, not through them.
    this.musicMaster = ctx.createGain()
    this.musicMaster.gain.value = this.musicVolume
    this.musicMaster.connect(ctx.destination)
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = this.noise.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    setInterval(() => this.babble(), BABBLE_MS)
    setInterval(() => this.schedule(), SCHEDULE_MS)
    this.ambience(this.want.loc, this.want.scale)
    this.music(this.wantTune)
  }

  setVolume(gain: number): void {
    this.volume = gain
    if (this.master) this.master.gain.value = gain
  }

  setMusicVolume(gain: number): void {
    this.musicVolume = gain
    if (this.musicMaster) this.musicMaster.gain.value = gain
  }

  play(id: SoundId, scale = 1, pitch = 1): void {
    this.notes(SFX[id], scale, pitch)
  }

  ambience(loc: LocationId | null, scale = 1): void {
    this.want = { loc, scale }
    const ctx = this.ctx
    const key = loc ? `${loc}:${scale}` : ''
    if (!ctx || !this.master || (this.water?.key ?? '') === key) return
    const now = ctx.currentTime
    if (this.water) {
      fadeOut(this.water.fade.gain, now, FADE_S)
      this.water.stop(now + FADE_S + 0.05)
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

  // Safe to call every frame: the same tune keeps playing; another one crossfades in from its opening phrase.
  music(id: TuneId | null): void {
    this.wantTune = id
    const ctx = this.ctx
    if (!ctx || !this.musicMaster || (this.song?.id ?? null) === id) return
    const now = ctx.currentTime
    if (this.song) {
      const old = this.song.fade
      fadeOut(old.gain, now, MUSIC_FADE_S)
      setTimeout(() => old.disconnect(), MUSIC_FADE_S * 1000 + 100) // its queued notes run out silently
      this.song = null
    }
    if (!id) return
    const fade = ctx.createGain()
    fade.gain.setValueAtTime(0, now)
    fade.gain.linearRampToValueAtTime(1, now + MUSIC_FADE_S)
    fade.connect(this.musicMaster)
    this.song = { id, fade, pick: null, nextAt: now }
    this.schedule()
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

  // Queues one phrase at a time, shortly before the last one ends. A suspended context's clock stops,
  // so a hidden tab queues nothing, and on return the next phrase never starts in the past.
  private schedule(): void {
    const ctx = this.ctx, song = this.song
    if (!ctx || !song || ctx.state !== 'running') return
    const now = ctx.currentTime
    if (song.nextAt - now > LOOKAHEAD_S) return
    const tune = TUNES[song.id]
    song.pick = nextPick(tune, song.pick, Math.random)
    const t0 = Math.max(song.nextAt, now + 0.05)
    this.notes(pickNotes(tune, song.pick), 1, 1, song.fade, t0)
    song.nextAt = t0 + phraseSteps(tune.phrases[song.pick.phrase]) * stepMs(tune) / 1000
  }

  private notes(notes: Note[], scale: number, pitch = 1, dest: AudioNode | null = this.master, at?: number): void {
    const ctx = this.ctx, master = dest
    if (!ctx || !master || ctx.state !== 'running' || scale <= 0) return
    const t0 = at ?? ctx.currentTime
    for (const n of notes) {
      const start = t0 + n.at / 1000, end = start + n.dur / 1000
      const env = ctx.createGain()
      env.gain.setValueAtTime(0, start)
      env.gain.linearRampToValueAtTime(n.gain * scale, start + (n.attack ?? 5) / 1000)
      env.gain.exponentialRampToValueAtTime(0.0001, end)
      env.connect(master)
      let src: AudioScheduledSourceNode, freq: AudioParam
      if (n.wave === 'noise') {
        const s = ctx.createBufferSource(), f = ctx.createBiquadFilter()
        s.buffer = this.noise; s.loop = true
        f.type = n.q ? 'bandpass' : 'lowpass'
        if (n.q) f.Q.value = n.q
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

function fadeOut(g: AudioParam, now: number, s: number): void {
  g.cancelScheduledValues(now)
  g.setValueAtTime(g.value, now)
  g.linearRampToValueAtTime(0, now + s)
}
