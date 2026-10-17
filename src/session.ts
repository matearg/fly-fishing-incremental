import { deserialize, parseSave, serialize, type SaveStore } from './game/save'
import { newGame, type GameState } from './game/state'

// Which screen is up, and the rule that only a game in progress is ever written to storage.
export class Session {
  mode: 'title' | 'game' = 'title'
  state: GameState

  constructor(private store: SaveStore) {
    this.state = deserialize(store.read())
  }

  hasSave(): boolean {
    return parseSave(this.store.read()) !== null
  }

  // Re-read: another tab may have advanced the save while this one sat on the menu.
  continueGame(): void {
    this.state = deserialize(this.store.read())
    this.mode = 'game'
  }

  startNewGame(): void {
    this.state = newGame()
    this.mode = 'game'
    this.save()
  }

  toMenu(): void {
    this.save()
    this.mode = 'title'
  }

  save(): void {
    if (this.mode === 'game') this.store.write(serialize(this.state))
  }

  replace(s: GameState): void {
    this.state = s
    this.save()
  }

  adopt(raw: string | null): void {
    this.state = deserialize(raw)
  }
}
