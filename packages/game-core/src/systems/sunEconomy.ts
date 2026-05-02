import { getPlantRuntimeStats } from '../plantStats'
import type { GameEvent, GameState } from '../types'

export function updateSunEconomy(state: GameState, dt: number, events: GameEvent[]) {
  state.passiveSunTimer += dt * state.director.sunDripMultiplier

  if (state.passiveSunTimer >= 7.5) {
    state.passiveSunTimer -= 7.5
    state.sun += 25
    events.push({ type: 'sunChanged', amount: 25, at: { x: 72, y: 82 } })
  }

  for (const plant of state.plants) {
    const stats = getPlantRuntimeStats(plant)

    if (!stats.sunInterval || !stats.sunAmount) {
      continue
    }

    plant.sunTimer += dt

    if (plant.sunTimer >= stats.sunInterval) {
      plant.sunTimer -= stats.sunInterval
      state.sun += stats.sunAmount
      events.push({ type: 'sunChanged', amount: stats.sunAmount, at: { x: plant.x, y: plant.y - 30 } })
    }
  }
}
