import type { GameState } from './types'
import { resetEntityIds } from './ids'

export function createInitialState(): GameState {
  resetEntityIds()

  return {
    time: 0,
    phase: 'ready',
    paused: false,
    sun: 150,
    baseHp: 3,
    waveIndex: 0,
    selectedPlantType: 'sunflower',
    seedCooldowns: {
      'pea-shooter': 0,
      sunflower: 0,
      'wall-nut': 0
    },
    passiveSunTimer: 0,
    plants: [],
    zombies: [],
    projectiles: [],
    wave: {
      active: false,
      spawned: 0,
      spawnTimer: 0
    },
    director: {
      spawnIntervalMultiplier: 1,
      zombieHpMultiplier: 1,
      sunDripMultiplier: 1
    }
  }
}
