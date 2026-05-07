import { buildingTypes, defaultLevelId, getLevelMap, lawn, type LevelId, type StrategyCardId } from '@tower-rogue/game-content'
import { resetEntityIds } from './ids'
import { scheduleReadyCountdown } from './runLoop'
import type { ActiveCardEffects, GameState, WaveStats } from './types'

export const defaultSkillLoadout = [
  'energy_instant_power',
  'emergency_freeze',
  'emergency_repair_all',
  'spell_lava_rain',
  'summon_flame_hawks'
] as const satisfies readonly StrategyCardId[]

function createWaveStats(): WaveStats {
  return {
    leaks: 0,
    destroyedBuildings: 0,
    killedByType: {},
    byLane: Array.from({ length: lawn.rows }, () => ({
      leaks: 0,
      destroyedBuildings: 0
    }))
  }
}

function createActiveCardEffects(): ActiveCardEffects {
  return {
    baseShield: 0,
    attackPowerBonus: 0,
    attackIntervalBonus: 0,
    attackIntervalMin: 0,
    antiAirFocus: false,
    antiAirDamageMultiplier: 1,
    wallHpBonus: 0,
    energyOutputBonus: 0,
    wallReflectionDamage: 0,
    wallReflectionInterval: 0,
    wallReflectionLastTriggeredAt: Number.NEGATIVE_INFINITY,
    directionResetAvailable: false,
    energySpriteEndsAt: undefined,
    energySpriteIntervalSeconds: 0,
    energySpriteNextTickAt: 0,
    expiresAfterWave: {}
  }
}

export function createInitialState(levelId: LevelId = defaultLevelId): GameState {
  resetEntityIds()

  const seedCooldowns = Object.fromEntries(buildingTypes.map((type) => [type, 0])) as GameState['seedCooldowns']
  const levelMap = getLevelMap(levelId)

  const state: GameState = {
    levelId,
    time: 0,
    phase: 'ready',
    paused: false,
    sun: levelMap.initialPurchasePower,
    baseHp: levelMap.baseHp,
    waveIndex: 0,
    selectedPlantType: null,
    selectedPlantMode: 'single',
    seedCooldowns,
    passiveSunTimer: 0,
    plants: [],
    zombies: [],
    projectiles: [],
    wave: {
      active: false,
      elapsed: 0,
      phaseIndex: 0,
      phases: [],
      groups: []
    },
    waveStartBaseHp: levelMap.baseHp,
    director: {
      spawnIntervalMultiplier: 1,
      zombieHpMultiplier: 1,
      sunDripMultiplier: 1
    },
    pendingDirectorAdjustment: undefined,
    currentWaveStats: createWaveStats(),
    lastWaveStats: createWaveStats(),
    activeRecommendations: [],
    strategyCardSelection: undefined,
    nextStrategyCardDrawAt: 0,
    chosenCardTags: [],
    activeCardEffects: createActiveCardEffects(),
    recentDirectorHistory: [],
    realtimeDirectorRequestCount: 0,
    skillLoadout: [...defaultSkillLoadout],
    skillLevels: {},
    usedSkillCards: [],
    pendingSkillEffects: [],
    readyAutoStartAt: undefined,
    cardSelectionAutoPickAt: undefined
  }

  scheduleReadyCountdown(state)

  return state
}

export { createActiveCardEffects, createWaveStats }
