import {
  buildingDefinitions,
  buildingTypes,
  defaultLevelId,
  directorRules,
  getLevelDefinition,
  getLevelEnemyDefinitions,
  getLevelMap,
  getLevelWaveDefinitions,
  lawn,
  plantDefinitions,
  plantFusionDefinitions,
  plantTypes,
  strategyCardDefinitions,
  type LevelId,
  zombieDefinitions
} from '@tower-rogue/game-content'
import {
  getStrategyCardDrawAvailability,
  getStrategyCardDrawDisabledReason
} from './strategyCardDraw'
import { createBattleSnapshot } from './battleSnapshot'
import { getCountdownRemaining } from './runLoop'
import { isStrategyCardImplemented } from './systems/cards'
import type { GameState, HudSnapshot } from './types'

export function getWorldDefinition(levelId: LevelId = defaultLevelId) {
  const level = getLevelDefinition(levelId)
  const levelMap = getLevelMap(levelId)
  const levelWaves = getLevelWaveDefinitions(levelId)
  const levelEnemyDefinitions = getLevelEnemyDefinitions(levelId)

  return {
    level,
    map: levelMap,
    lawn,
    buildingDefinitions,
    enemyDefinitions: levelEnemyDefinitions,
    strategyCardDefinitions,
    volcanoWaves: levelWaves,
    directorRules,
    plantDefinitions,
    plantFusionDefinitions,
    zombieDefinitions,
    waves: levelWaves,
    plantTypes
  }
}

export function getRunSummary(state: GameState) {
  const levelWaves = getLevelWaveDefinitions(state.levelId)

  return {
    levelId: state.levelId,
    baseHp: state.baseHp,
    sun: state.sun,
    wave: Math.min(state.waveIndex + 1, levelWaves.length),
    phase: state.phase,
    plantCount: state.plants.length,
    fusionCount: 0,
    zombieCount: state.zombies.length,
    dangerousZombieCount: state.zombies.filter((zombie) => zombie.category === 'heavy_attack' || zombie.category === 'boss').length
  }
}

export function getHudSnapshot(state: GameState): HudSnapshot {
  const levelWaves = getLevelWaveDefinitions(state.levelId)
  const levelMap = getLevelMap(state.levelId)
  const currentWave = levelWaves[Math.min(state.waveIndex, levelWaves.length - 1)]
  const strategyCardDraw = getStrategyCardDrawAvailability(state)
  const battleSnapshot = createBattleSnapshot(state, {
    source: state.phase === 'playing' ? 'active-skill' : 'wave-cleared'
  })
  const readyCountdownRemaining = state.phase === 'ready' ? getCountdownRemaining(state.readyAutoStartAt, state.time) : 0
  const cardSelectionCountdownRemaining =
    state.phase === 'card_select' && state.strategyCardSelection?.source === 'wave-cleared'
      ? getCountdownRemaining(state.cardSelectionAutoPickAt, state.time)
      : 0
  const upcomingAiWavePlan = state.pendingAiWavePlan ?? state.activeAiWavePlanForWave
  const nextWaveHint =
    upcomingAiWavePlan?.nextWaveHint ??
    (state.phase === 'card_select'
      ? state.lastBattleSnapshot?.problemTags.join(' / ') || currentWave?.nextWaveHint || ''
      : currentWave?.nextWaveHint || '')
  const currentWavePhase = getCurrentWavePhaseSnapshot(state)

  return {
    levelId: state.levelId,
    phase: state.phase,
    paused: state.paused,
    sun: state.sun,
    purchasePower: state.sun,
    baseHp: state.baseHp,
    baseMaxHp: levelMap.baseHp,
    baseShield: state.activeCardEffects.baseShield,
    wave: Math.min(state.waveIndex + 1, levelWaves.length),
    totalWaves: levelWaves.length,
    currentWaveElapsed: state.wave.active ? state.wave.elapsed : 0,
    plantCount: state.plants.length,
    fusionCount: state.plants.filter((plant) => plant.upgraded).length,
    zombieCount: state.zombies.length,
    dangerousZombieCount: state.zombies.filter((zombie) => zombie.category === 'heavy_attack' || zombie.category === 'boss').length,
    flyingEnemyCount: state.zombies.filter((zombie) => zombie.flying).length,
    selectedPlantType: state.selectedPlantType,
    selectedPlantMode: state.selectedPlantMode,
    seedBank: buildingTypes.map((type) => {
      const definition = buildingDefinitions[type]
      const cooldownRemaining = Math.max(0, state.seedCooldowns[type])

      return {
        type,
        name: definition.name,
        cost: definition.cost,
        cooldown: 0,
        cooldownRemaining,
        selected: state.selectedPlantType === type,
        selectedMode: state.selectedPlantType === type ? state.selectedPlantMode : undefined,
        canPlant:
          state.phase !== 'won' &&
          state.phase !== 'lost' &&
          state.phase !== 'card_select' &&
          state.sun >= definition.cost &&
          cooldownRemaining <= 0,
        role: definition.type
      }
    }),
    plants: state.plants.map((plant) => ({
      type: plant.type,
      row: plant.row,
      col: plant.col,
      hp: plant.hp,
      maxHp: plant.maxHp
    })),
    enemies: state.zombies.map((zombie) => ({
      type: zombie.type,
      row: zombie.row,
      x: Math.round(zombie.x),
      hp: zombie.hp,
      maxHp: zombie.maxHp
    })),
    canStartWave: state.phase === 'ready' && state.waveIndex < levelWaves.length,
    canDrawStrategyCards: strategyCardDraw.canDraw,
    strategyCardDrawCost: strategyCardDraw.cost,
    strategyCardDrawCooldownRemaining: strategyCardDraw.cooldownRemaining,
    strategyCardDrawDisabledReason: getStrategyCardDrawDisabledReason(strategyCardDraw),
    readyCountdownRemaining,
    cardSelectionCountdownRemaining,
    recommendations: state.activeRecommendations.map((recommendation) => ({
      cardId: recommendation.cardId,
      card: strategyCardDefinitions[recommendation.cardId],
      slot: recommendation.slot,
      reason: recommendation.reason,
      score: recommendation.score
    })),
    battleSnapshot,
    skillPack: state.skillLoadout.map((cardId) => {
      const card = strategyCardDefinitions[cardId]
      const used = state.usedSkillCards.includes(cardId)
      const implemented = card ? isStrategyCardImplemented(card) : false

      return {
        cardId,
        card,
        level: Math.max(0, Math.min(100, Math.floor(state.skillLevels[cardId] ?? 0))),
        used,
        usable: Boolean(card) && implemented && !used && state.phase !== 'won' && state.phase !== 'lost' && state.phase !== 'card_select',
        disabledReason: used ? '已使用' : implemented ? undefined : '待实现'
      }
    }),
    cardSelectionSource: state.strategyCardSelection?.source,
    cardSelectionSnapshot: state.phase === 'card_select' ? state.lastBattleSnapshot : undefined,
    lastDirectorReasonTag: state.lastDirectorReasonTag,
    recentDirectorHistory: state.recentDirectorHistory.map((entry) => ({ ...entry })),
    lastDirectorOutcome: state.lastDirectorOutcome ? { ...state.lastDirectorOutcome } : undefined,
    lanePressure: state.lastBattleSnapshot?.lanePressure.map((lane) => ({ ...lane })) ?? [],
    currentWavePhase,
    nextWaveHint,
    wavePlanPreview: state.pendingAiWavePlan?.preview ?? state.activeAiWavePlanForWave?.preview,
    directorPreview: state.directorPlan?.preview ?? state.activeDirectorPlanForWave?.preview,
    resultReason: state.resultReason
  }
}

function getCurrentWavePhaseSnapshot(state: GameState): HudSnapshot['currentWavePhase'] {
  if (state.phase !== 'playing' || !state.wave.active || state.wave.phases.length === 0) {
    return undefined
  }

  const phase = state.wave.phases[state.wave.phaseIndex]

  if (!phase) {
    return undefined
  }

  const duration = Math.max(0.1, phase.endSecond - phase.startSecond)
  const progress = Math.max(0, Math.min(1, (state.wave.elapsed - phase.startSecond) / duration))

  return {
    id: phase.id,
    label: phase.label,
    description: phase.description,
    index: state.wave.phaseIndex + 1,
    total: state.wave.phases.length,
    startSecond: phase.startSecond,
    endSecond: phase.endSecond,
    progress: Number(progress.toFixed(3))
  }
}
