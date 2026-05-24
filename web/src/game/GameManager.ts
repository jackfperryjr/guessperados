import { GameState } from '../types'

export class GameManager {
  private state: GameState = GameState.Playing

  getState() { return this.state }
  isPlaying() { return this.state === GameState.Playing }

  pause()  { this.state = GameState.Paused  }
  resume() { this.state = GameState.Playing }
}
