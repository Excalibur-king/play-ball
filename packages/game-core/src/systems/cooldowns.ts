import { plantTypes } from '@tower-rogue/game-content'
import type { GameState } from '../types'

export function updateSeedCooldowns(state: GameState, dt: number) {
  for (const type of plantTypes) {
    state.seedCooldowns[type] = Math.max(0, state.seedCooldowns[type] - dt)
  }
}
