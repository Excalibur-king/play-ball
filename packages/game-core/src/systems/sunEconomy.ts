import { buildingDefinitions } from '@tower-rogue/game-content'
import type { GameEvent, GameState } from '../types'

const purchasePowerPacket = 1

export function updateSunEconomy(state: GameState, dt: number, events: GameEvent[]) {
  if (state.phase !== 'playing') {
    return
  }

  for (const building of state.plants) {
    const definition = buildingDefinitions[building.type]

    if (definition.type !== 'energy' || !definition.productionInterval || !definition.purchasePowerPerTick) {
      continue
    }

    const outputPerInterval =
      definition.purchasePowerPerTick +
      (building.upgraded ? definition.upgrade?.purchasePowerPerTickBonus ?? 0 : 0) +
      state.activeCardEffects.energyOutputBonus

    if (outputPerInterval <= 0) {
      continue
    }

    const secondsPerPacket = definition.productionInterval / outputPerInterval

    building.sunTimer += dt

    // Pay the same total purchase power over the production interval, but drip
    // it in small packets so the economy visibly climbs instead of jumping.
    while (building.sunTimer + 1e-9 >= secondsPerPacket) {
      building.sunTimer -= secondsPerPacket
      state.sun += purchasePowerPacket
      events.push({
        type: 'sunChanged',
        amount: purchasePowerPacket,
        at: { x: building.x, y: building.y - 30 },
        plantId: building.id,
        plantType: building.type
      })
    }
  }
}
