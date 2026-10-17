import { describe, it, expect } from 'vitest'
import { Session } from './session'
import { deserialize, serialize, type SaveStore } from './game/save'
import { newGame } from './game/state'

const memStore = (raw: string | null = null): SaveStore & { raw: string | null } => ({
  raw,
  read() { return this.raw },
  write(r) { this.raw = r },
})

describe('Session', () => {
  it('fresh store: no save, title mode, save() writes nothing', () => {
    const store = memStore()
    const s = new Session(store)
    expect(s.hasSave()).toBe(false)
    expect(s.mode).toBe('title')
    s.save()
    expect(store.raw).toBeNull()
  })
  it('startNewGame writes a save and enters the game', () => {
    const store = memStore()
    const s = new Session(store)
    s.startNewGame()
    expect(store.raw).not.toBeNull()
    expect(s.hasSave()).toBe(true)
    expect(s.mode).toBe('game')
    expect(s.state).toEqual(newGame())
  })
  it('toMenu writes the current state once', () => {
    const store = memStore()
    const s = new Session(store)
    s.startNewGame()
    s.state.money = 123
    s.toMenu()
    expect(deserialize(store.raw).money).toBe(123)
    expect(s.mode).toBe('title')
    s.state.money = 5
    s.save()
    expect(deserialize(store.raw).money).toBe(123)
  })
  it('corrupt save counts as no save', () => {
    expect(new Session(memStore('{oops')).hasSave()).toBe(false)
  })
  it('continueGame re-reads the store', () => {
    const store = memStore(serialize(newGame()))
    const s = new Session(store)
    const b = newGame()
    b.money = 999
    store.raw = serialize(b)
    s.continueGame()
    expect(s.state.money).toBe(999)
    expect(s.mode).toBe('game')
  })
  it('blocked storage: going back to the menu keeps the run', () => {
    const s = new Session({ read: () => null, write: () => {} })
    s.startNewGame()
    s.state.money = 50
    s.toMenu()
    expect(s.hasSave()).toBe(true)
    s.continueGame()
    expect(s.state.money).toBe(50)
  })
  it('adopting an unreadable save keeps the current run', () => {
    const s = new Session({ read: () => null, write: () => {} })
    s.startNewGame()
    s.state.money = 50
    s.adopt(null)
    expect(s.state.money).toBe(50)
  })
  it('blocked storage', () => {
    const s = new Session({ read: () => null, write: () => {} })
    expect(s.hasSave()).toBe(false)
    expect(() => s.startNewGame()).not.toThrow()
    expect(s.mode).toBe('game')
  })
})
