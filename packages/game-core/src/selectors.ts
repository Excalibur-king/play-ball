import { lawn, plantDefinitions, plantFusionDefinitions, plantTypes, waves, zombieDefinitions } from '@tower-rogue/game-content'
import type { GameState, HudSnapshot } from './types'

export function getWorldDefinition() {
  return {
    lawn,
    plantDefinitions,
    plantFusionDefinitions,
    zombieDefinitions,
    waves,
    plantTypes
  }
}

export function getRunSummary(state: GameState) {
  return {
    baseHp: state.baseHp,
    sun: state.sun,
    wave: Math.min(state.waveIndex + 1, waves.length),
    phase: state.phase,
    plantCount: state.plants.length,
    fusionCount: state.plants.filter((plant) => plant.components.length > 1).length,
    zombieCount: state.zombies.length,
    dangerousZombieCount: state.zombies.filter((zombie) => zombie.category === 'dangerous').length
  }
}

export function getHudSnapshot(state: GameState): HudSnapshot {
  return {
    phase: state.phase,
    paused: state.paused,
    sun: state.sun,
    baseHp: state.baseHp,
    wave: Math.min(state.waveIndex + 1, waves.length),
    totalWaves: waves.length,
    plantCount: state.plants.length,
    fusionCount: state.plants.filter((plant) => plant.components.length > 1).length,
    zombieCount: state.zombies.length,
    dangerousZombieCount: state.zombies.filter((zombie) => zombie.category === 'dangerous').length,
    selectedPlantType: state.selectedPlantType,
    seedBank: plantTypes.map((type) => {
      const definition = plantDefinitions[type]
      const cooldownRemaining = Math.max(0, state.seedCooldowns[type])

      return {
        type,
        name: definition.name,
        cost: definition.cost,
        cooldown: definition.cooldown,
        cooldownRemaining,
        selected: state.selectedPlantType === type,
        canPlant:
          state.phase !== 'won' &&
          state.phase !== 'lost' &&
          state.sun >= definition.cost &&
          cooldownRemaining <= 0,
        role: definition.role
      }
    }),
    canStartWave: state.phase === 'ready' && state.waveIndex < waves.length
  }
}
