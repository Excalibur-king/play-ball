import {
  cellCenter,
  getEnemyDefinitionForLevel,
  getLevelWaveDefinitions,
  lawn,
  rowsForRoute,
  strategyCardDefinitions
} from '@tower-rogue/game-content'
import type { EnemyId, VolcanoWaveDefinition } from '@tower-rogue/game-content'
import { createBattleSnapshot } from '../battleSnapshot'
import { createEntityId } from '../ids'
import { clearCardSelectionCountdown, clearReadyCountdown } from '../runLoop'
import { clearExpiredCardEffects } from './cards'
import type { AiWaveRoute, GameEvent, GameState } from '../types'

export function updateWave(state: GameState, dt: number, events: GameEvent[]) {
  if (!state.wave.active) {
    return
  }

  state.wave.elapsed += dt
  syncActiveWavePhase(state, events)

  for (const groupRuntime of state.wave.groups) {
    if (groupRuntime.spawned >= groupRuntime.count) {
      continue
    }

    groupRuntime.spawnTimer -= dt

    while (groupRuntime.spawned < groupRuntime.count && groupRuntime.spawnTimer <= 0) {
      spawnEnemy(state, groupRuntime.enemyId, groupRuntime.route, groupRuntime.spawned + groupRuntime.groupIndex, groupRuntime.source)
      groupRuntime.spawned += 1
      groupRuntime.spawnTimer += groupRuntime.interval * state.director.spawnIntervalMultiplier
    }
  }
}

function syncActiveWavePhase(state: GameState, events: GameEvent[]) {
  while (state.wave.phaseIndex + 1 < state.wave.phases.length) {
    const nextPhase = state.wave.phases[state.wave.phaseIndex + 1]

    if (!nextPhase || state.wave.elapsed < nextPhase.startSecond) {
      return
    }

    state.wave.phaseIndex += 1
    events.push({
      type: 'wavePhaseChanged',
      waveIndex: state.waveIndex,
      phaseIndex: state.wave.phaseIndex,
      label: nextPhase.label
    })
  }
}

export function checkWaveEnd(state: GameState, events: GameEvent[]) {
  const levelWaves = getLevelWaveDefinitions(state.levelId)
  const wave = levelWaves[state.waveIndex] as VolcanoWaveDefinition | undefined

  if (!wave) {
    return
  }

  const allSpawned = state.wave.groups.every((groupRuntime) => groupRuntime.spawned >= groupRuntime.count)

  if (!allSpawned || state.zombies.length > 0) {
    return
  }

  const clearedWaveIndex = state.waveIndex
  state.wave.active = false
  if (state.activeDirectorPlanForWave) {
    state.lastDirectorOutcome = createDirectorOutcome(state.activeDirectorPlanForWave, state)
  }
  state.activeAiWavePlanForWave = undefined
  state.activeDirectorPlanForWave = undefined
  state.lastWaveStats = {
    ...state.currentWaveStats,
    killedByType: { ...state.currentWaveStats.killedByType },
    byLane: state.currentWaveStats.byLane.map((lane) => ({ ...lane }))
  }
  clearExpiredCardEffects(state, clearedWaveIndex)
  events.push({ type: 'waveCleared', waveIndex: clearedWaveIndex })

  if (clearedWaveIndex >= levelWaves.length - 1) {
    state.phase = 'won'
    state.resultReason = getClearRewardText(wave.clearRewardId)
    events.push({ type: 'runEnded', outcome: 'won' })
    return
  }

  state.sun += wave.rewardPurchasePower ?? 0
  events.push({ type: 'sunChanged', amount: wave.rewardPurchasePower ?? 0, at: { x: 72, y: 82 } })

  const snapshot = createBattleSnapshot(state)
  state.lastBattleSnapshot = snapshot
  state.activeRecommendations = []
  state.strategyCardSelection = {
    source: 'wave-cleared',
    resumePhase: 'ready',
    resumePaused: false
  }
  state.pendingAiWavePlan = undefined
  state.directorPlan = undefined
  clearReadyCountdown(state)
  clearCardSelectionCountdown(state)
  state.phase = 'card_select'
  state.paused = false
  events.push({ type: 'cardRecommendationsReady', waveIndex: clearedWaveIndex })
}

function getClearRewardText(clearRewardId?: string) {
  if (!clearRewardId) {
    return '火山地图通关'
  }

  const rewardCard = strategyCardDefinitions[clearRewardId as keyof typeof strategyCardDefinitions]
  return rewardCard ? `通关解锁：${rewardCard.name}` : `通关奖励：${clearRewardId}`
}

function createDirectorOutcome(plan: NonNullable<GameState['activeDirectorPlanForWave']>, state: GameState) {
  const leaks = state.currentWaveStats.leaks
  const destroyedBuildings = state.currentWaveStats.destroyedBuildings
  const baseHpDelta = state.baseHp - state.waveStartBaseHp
  const verdict = getDirectorOutcomeVerdict({
    leaks,
    destroyedBuildings,
    baseHpDelta
  })

  return {
    wave: state.waveIndex + 1,
    intent: plan.intent,
    primaryRoute: plan.params.primaryRoute,
    leaks,
    destroyedBuildings,
    baseHpDelta,
    verdict
  }
}

function getDirectorOutcomeVerdict(input: {
  leaks: number
  destroyedBuildings: number
  baseHpDelta: number
}) {
  const { leaks, destroyedBuildings, baseHpDelta } = input

  if (baseHpDelta <= -2 || leaks >= 2 || destroyedBuildings >= 2) {
    return 'too_strong' as const
  }

  if (baseHpDelta === 0 && leaks === 0 && destroyedBuildings === 0) {
    return 'too_weak' as const
  }

  return 'on_target' as const
}

function spawnEnemy(
  state: GameState,
  enemyId: EnemyId,
  route: AiWaveRoute,
  seed: number,
  spawnSource: GameState['wave']['groups'][number]['source']
) {
  const definition = getEnemyDefinitionForLevel(state.levelId, enemyId)
  const rows = rowsForRoute(route)
  const row = rows[(seed + state.waveIndex) % rows.length] ?? 2
  const center = cellCenter(row, lawn.cols - 1)
  const maxHp = Math.round(definition.hp * state.director.zombieHpMultiplier)

  state.zombies.push({
    id: createEntityId('zombie'),
    type: definition.id as EnemyId,
    category: definition.role,
    row,
    x: lawn.spawnX,
    y: center.y,
    hp: maxHp,
    maxHp,
    speed: definition.speed,
    buildingDamage: definition.buildingDamage,
    baseDamage: definition.baseDamage,
    attackCooldown: 0,
    attackInterval: definition.attackInterval,
    blockable: definition.blockable,
    flying: definition.flying,
    spawnSource,
    state: 'walking'
  })
}
