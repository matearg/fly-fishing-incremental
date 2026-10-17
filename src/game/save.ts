import { newGame, SAVE_VERSION, type GameState } from './state'

export const SAVE_KEY = 'flyfishing-save'

export function serialize(state: GameState): string {
  return JSON.stringify(state)
}

// Anything missing, corrupt or from another version starts a fresh season instead of crashing.
export function deserialize(raw: string | null): GameState {
  try {
    const s = JSON.parse(raw ?? 'null')
    const ok = s?.version === SAVE_VERSION && Number.isFinite(s.money)
      && Array.isArray(s.anglers) && s.anglers.length > 0 && Array.isArray(s.basket) && Array.isArray(s.flyBox)
    return ok ? s : newGame()
  } catch {
    return newGame()
  }
}

// Storage can throw (private mode, quota, blocked site data).
export function saveToStorage(state: GameState): void {
  try { localStorage.setItem(SAVE_KEY, serialize(state)) } catch { /* nothing to do; next autosave retries */ }
}

export function loadFromStorage(): GameState {
  try { return deserialize(localStorage.getItem(SAVE_KEY)) } catch { return newGame() }
}
