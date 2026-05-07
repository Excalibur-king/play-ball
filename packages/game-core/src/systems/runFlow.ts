import { startWave } from '../commands'
import type { GameEvent, GameState } from '../types'

export function updateRunFlow(state: GameState, events: GameEvent[]) {
  if (state.phase === 'ready' && state.readyAutoStartAt !== undefined && state.time >= state.readyAutoStartAt) {
    startWave(state, events)
  }
}
