import { buildingDefinitions, cellCenter, getLevelEnemyDefinitions, getLevelWaveDefinitions, lawn, strategyCardDefinitions } from '@tower-rogue/game-content'
import type { EnemyId, VolcanoWaveDefinition } from '@tower-rogue/game-content'
import { calculateWaveDirectorCost, compileAiWavePlan } from './aiWave'
import { createBattleSnapshot } from './battleSnapshot'
import { buildDirectorPlanFromParams, createDirectorDecisionParams } from './director'
import { createEntityId } from './ids'
import {
  ACTIVE_STRATEGY_CARD_DRAW_COOLDOWN,
  ACTIVE_STRATEGY_CARD_DRAW_COST,
  getStrategyCardDrawAvailability
} from './strategyCardDraw'
import {
  clearCardSelectionCountdown,
  clearReadyCountdown
} from './runLoop'
import { createWaveStats } from './state'
import { applyStrategyCard, isStrategyCardImplemented } from './systems/cards'
import type {
  CardRecommendation,
  AiWavePlan,
  DirectorDecisionParams,
  EnemyDirectorPlan,
  GameEvent,
  GameState,
  Plant,
  StrategyCardId,
  WaveRuntimeGroup
} from './types'

export function selectBuilding(state: GameState, buildingId: GameState['selectedPlantType']) {
  if (!buildingId) {
    clearSelectedBuilding(state)
    return
  }

  state.selectedPlantType = buildingId
  state.selectedPlantMode = 'single'
}

export function setSelectedBuildingMode(
  state: GameState,
  buildingId: NonNullable<GameState['selectedPlantType']>,
  mode: GameState['selectedPlantMode'] = 'single'
) {
  state.selectedPlantType = buildingId
  state.selectedPlantMode = mode
}

export function clearSelectedBuilding(state: GameState) {
  state.selectedPlantType = null
  state.selectedPlantMode = 'single'
}

export function placePlant(state: GameState, row: number, col: number, events: GameEvent[], keepSelected = false) {
  return placeBuilding(state, row, col, events, keepSelected)
}

export function placeBuilding(
  state: GameState,
  row: number,
  col: number,
  events: GameEvent[],
  keepSelected = false
) {
  if (!state.selectedPlantType || !isCellBuildable(row, col) || state.phase === 'card_select') {
    return false
  }

  const existingPlant = state.plants.find((plant) => plant.row === row && plant.col === col)
  const shouldStaySelected = keepSelected || state.selectedPlantMode === 'persistent'

  if (existingPlant) {
    const upgraded = upgradeBuilding(state, existingPlant.id, events)

    if (upgraded) {
      finalizePlacementSelection(state, shouldStaySelected)
    }

    return upgraded
  }

  const selectedPlantType = state.selectedPlantType
  const definition = buildingDefinitions[selectedPlantType]

  if (state.sun < definition.cost) {
    return false
  }

  const center = cellCenter(row, col)
  const maxHp = getInitialBuildingHp(state, definition.id, definition.hp)
  const plant: Plant = {
    id: createEntityId('plant'),
    type: selectedPlantType,
    components: [selectedPlantType],
    row,
    col,
    x: center.x,
    y: center.y,
    hp: maxHp,
    maxHp,
    shootCooldown: definition.attackInterval ?? 0,
    sunTimer: 0,
    attackDirection: definition.attackDirection ?? 'right',
    upgraded: false,
    chargesRemaining: definition.charges
  }

  state.sun -= definition.cost
  state.plants.push(plant)
  events.push({ type: 'plantPlaced', plantId: plant.id, plantType: plant.type, at: center })
  events.push({ type: 'sunChanged', amount: -definition.cost, at: center })
  finalizePlacementSelection(state, shouldStaySelected)
  return true
}

export function upgradeBuilding(state: GameState, buildingId: string, events: GameEvent[]) {
  const building = state.plants.find((plant) => plant.id === buildingId)

  if (!building || building.upgraded) {
    return false
  }

  const definition = buildingDefinitions[building.type]
  const upgrade = definition.upgrade

  if (!upgrade || state.sun < upgrade.cost) {
    return false
  }

  state.sun -= upgrade.cost
  building.upgraded = true

  const hpBonus = upgrade.hpBonus ?? 0
  building.maxHp += hpBonus
  building.hp = Math.min(building.maxHp, building.hp + hpBonus)
  events.push({ type: 'sunChanged', amount: -upgrade.cost, at: { x: building.x, y: building.y } })
  return true
}

export function startWave(state: GameState, events: GameEvent[] = []) {
  const levelWaves = getLevelWaveDefinitions(state.levelId)

  if (state.phase !== 'ready' || state.waveIndex >= levelWaves.length) {
    return
  }

  const wave = levelWaves[state.waveIndex]

  if (!wave) {
    return
  }

  if (state.pendingDirectorAdjustment) {
    state.director = state.pendingDirectorAdjustment
    state.pendingDirectorAdjustment = undefined
  }

  const activeAiWavePlan = state.pendingAiWavePlan?.targetWaveIndex === wave.index - 1 ? state.pendingAiWavePlan : undefined
  const activeDirectorPlan =
    !activeAiWavePlan && state.directorPlan?.targetWaveIndex === wave.index - 1 ? state.directorPlan : undefined

  clearReadyCountdown(state)
  clearCardSelectionCountdown(state)
  state.phase = 'playing'
  state.waveStartBaseHp = state.baseHp
  state.currentWaveStats = createWaveStats()
  state.activeRecommendations = []
  state.strategyCardSelection = undefined
  state.activeAiWavePlanForWave = activeAiWavePlan
  state.activeDirectorPlanForWave = activeDirectorPlan
  state.wave = {
    active: true,
    elapsed: 0,
    phaseIndex: 0,
    phases: (activeAiWavePlan?.phases ?? wave.phases).map((phase) => ({ ...phase })),
    groups: createRuntimeGroups(wave, activeDirectorPlan, activeAiWavePlan)
  }

  if (state.wave.phases.length > 0) {
    events.push({
      type: 'wavePhaseChanged',
      waveIndex: state.waveIndex,
      phaseIndex: 0,
      label: state.wave.phases[0]!.label
    })
  }

  if (activeDirectorPlan) {
    state.recentDirectorHistory = appendDirectorHistory(state.recentDirectorHistory, {
      wave: wave.index,
      intent: activeDirectorPlan.intent,
      primaryRoute: activeDirectorPlan.params.primaryRoute,
      reasonTag: activeDirectorPlan.reasonTags[0]
    })
  }

  state.pendingAiWavePlan = undefined
  state.directorPlan = undefined
}

export function drawStrategyCards(state: GameState, events: GameEvent[]) {
  const availability = getStrategyCardDrawAvailability(state)

  if (!availability.canDraw) {
    return
  }

  const snapshot = createBattleSnapshot(state, { source: 'active-skill' })

  state.sun -= ACTIVE_STRATEGY_CARD_DRAW_COST
  state.lastBattleSnapshot = snapshot
  state.activeRecommendations = []
  state.strategyCardSelection = {
    source: 'active-skill',
    resumePhase: state.phase === 'playing' ? 'playing' : 'ready',
    resumePaused: state.paused
  }
  clearCardSelectionCountdown(state)
  state.phase = 'card_select'
  state.paused = true
  state.nextStrategyCardDrawAt = state.time + ACTIVE_STRATEGY_CARD_DRAW_COOLDOWN
  events.push({ type: 'sunChanged', amount: -ACTIVE_STRATEGY_CARD_DRAW_COST, at: { x: 72, y: 82 } })
  events.push({ type: 'cardRecommendationsReady', waveIndex: state.waveIndex })
}

export function hydrateStrategyRecommendations(state: GameState, recommendations: CardRecommendation[]) {
  if (state.phase !== 'card_select') {
    return
  }

  state.activeRecommendations = recommendations
}

export function hydrateAiWavePlan(
  state: GameState,
  input: {
    clearedWave: number
    plan: AiWavePlan | null
  }
) {
  if (state.phase === 'won' || state.phase === 'lost') {
    return
  }

  if (!state.lastBattleSnapshot || state.lastBattleSnapshot.wave !== input.clearedWave) {
    return
  }

  const nextWave = getLevelWaveDefinitions(state.levelId)[input.clearedWave]

  if (!nextWave?.aiDirectorAllowed || !input.plan) {
    state.pendingAiWavePlan = undefined
    return
  }

  try {
    const compiledPlan = compileAiWavePlan(input.plan, {
      levelId: state.levelId,
      targetWaveIndex: input.clearedWave,
      nextWave,
      baseWaveCost: calculateWaveDirectorCost(nextWave, getLevelEnemyDefinitions(state.levelId)),
      bossId: nextWave.bossId as EnemyId | undefined
    })

    if (canApplyDirectorPlanToCurrentWave(state, input.clearedWave)) {
      state.activeAiWavePlanForWave = compiledPlan
      state.activeDirectorPlanForWave = undefined
      state.directorPlan = undefined
      state.wave.phases = compiledPlan.phases.map((phase) => ({ ...phase }))
      state.wave.groups = createRuntimeGroups(nextWave, undefined, compiledPlan)
      state.pendingAiWavePlan = undefined
      return
    }

    if (state.wave.active || state.phase === 'playing') {
      return
    }

    state.pendingAiWavePlan = compiledPlan
    state.directorPlan = undefined
  } catch {
    state.pendingAiWavePlan = undefined
  }
}

export function hydrateRealtimeAiWavePlan(
  state: GameState,
  input: {
    wave: number
    plan: AiWavePlan | null
  }
) {
  if (state.phase !== 'playing' || !state.wave.active || state.waveIndex !== input.wave - 1 || !input.plan) {
    return false
  }

  const currentWave = getLevelWaveDefinitions(state.levelId)[state.waveIndex]

  if (!currentWave?.aiDirectorAllowed) {
    return false
  }

  try {
    const currentWaveCost = calculateWaveDirectorCost(currentWave, getLevelEnemyDefinitions(state.levelId))
    const compiledPlan = compileAiWavePlan(input.plan, {
      levelId: state.levelId,
      targetWaveIndex: state.waveIndex,
      nextWave: currentWave,
      baseWaveCost: Math.max(1, currentWaveCost * 0.25),
      costEnvelope: [
        1,
        Math.max(6, Math.round(currentWaveCost * 0.5 * 10) / 10)
      ],
      excludeBoss: true,
      maxPhaseCount: 10
    })
    const runtimeGroups = createRuntimeGroups(currentWave, undefined, compiledPlan).map((group, index) => ({
      ...group,
      groupIndex: state.wave.groups.length + index,
      spawnTimer: Math.max(0.1, group.spawnTimer - state.wave.elapsed)
    }))

    if (runtimeGroups.length === 0) {
      return false
    }

    state.wave.groups.push(...runtimeGroups)
    state.activeAiWavePlanForWave = compiledPlan
    state.activeDirectorPlanForWave = undefined
    state.directorPlan = undefined
    state.realtimeDirectorRequestCount += 1
    return true
  } catch {
    return false
  }
}

export function applyRealtimeDirectorFallback(
  state: GameState,
  input: {
    wave: number
  }
) {
  if (state.phase !== 'playing' || !state.wave.active || state.waveIndex !== input.wave - 1) {
    return false
  }

  const currentWave = getLevelWaveDefinitions(state.levelId)[state.waveIndex]

  if (!currentWave?.aiDirectorAllowed) {
    return false
  }

  const snapshot = createBattleSnapshot(state, { source: 'active-skill' })
  const params = createDirectorDecisionParams({
    snapshot,
    lastDirectorReasonTag: state.lastDirectorReasonTag,
    nextWave: currentWave,
    recentDirectorHistory: state.recentDirectorHistory
  })

  if (!params) {
    return false
  }

  const plan = buildDirectorPlanFromParams({
    levelId: state.levelId,
    targetWaveIndex: state.waveIndex,
    snapshot,
    nextWave: currentWave,
    params
  })
  const runtimeGroups = createRuntimeGroups(currentWave, plan).filter((group) => group.source === 'director')

  if (runtimeGroups.length === 0) {
    return false
  }

  state.wave.groups.push(
    ...runtimeGroups.map((group, index) => ({
      ...group,
      groupIndex: state.wave.groups.length + index,
      spawnTimer: Math.max(0.1, group.spawnTimer)
    }))
  )
  state.activeAiWavePlanForWave = undefined
  state.activeDirectorPlanForWave = plan
  state.lastDirectorReasonTag = plan.reasonTags[0]
  state.recentDirectorHistory = appendDirectorHistory(state.recentDirectorHistory, {
    wave: currentWave.index,
    intent: plan.intent,
    primaryRoute: plan.params.primaryRoute,
    reasonTag: plan.reasonTags[0]
  })
  state.realtimeDirectorRequestCount += 1
  return true
}

export function hydrateDirectorDecisionParams(
  state: GameState,
  input: {
    clearedWave: number
    params: DirectorDecisionParams | null
  }
) {
  if (state.phase === 'won' || state.phase === 'lost') {
    return
  }

  if (!state.lastBattleSnapshot || state.lastBattleSnapshot.wave !== input.clearedWave) {
    return
  }

  const nextWave = getLevelWaveDefinitions(state.levelId)[input.clearedWave]

  if (!nextWave?.aiDirectorAllowed || !input.params) {
    state.directorPlan = undefined
    return
  }

  const plan = buildDirectorPlanFromParams({
    levelId: state.levelId,
    targetWaveIndex: input.clearedWave,
    snapshot: state.lastBattleSnapshot,
    nextWave,
    params: input.params
  })

  if (plan.addedGroups.length === 0 && plan.removedEnemyCount === 0) {
    state.directorPlan = undefined
    return
  }

  if (canApplyDirectorPlanToCurrentWave(state, input.clearedWave)) {
    state.activeAiWavePlanForWave = undefined
    state.activeDirectorPlanForWave = plan
    state.wave.groups = createRuntimeGroups(nextWave, plan)
    state.recentDirectorHistory = appendDirectorHistory(state.recentDirectorHistory, {
      wave: nextWave.index,
      intent: plan.intent,
      primaryRoute: plan.params.primaryRoute,
      reasonTag: plan.reasonTags[0]
    })
    state.lastDirectorReasonTag = plan.reasonTags[0]
    state.directorPlan = undefined
    return
  }

  if (state.wave.active || state.phase === 'playing') {
    return
  }

  state.directorPlan = plan
  state.lastDirectorReasonTag = plan.reasonTags[0]
}

export function selectStrategyCard(state: GameState, cardId: StrategyCardId, events: GameEvent[]) {
  if (state.phase !== 'card_select') {
    return
  }

  const recommendation = state.activeRecommendations.find((item) => item.cardId === cardId)
  const card = strategyCardDefinitions[cardId]

  if (!recommendation || !card) {
    return
  }

  applyStrategyCard(state, card, events)
  state.chosenCardTags.push(...card.tags)
  state.activeRecommendations = []
  clearCardSelectionCountdown(state)

  const selection = state.strategyCardSelection
  state.strategyCardSelection = undefined

  if (selection?.source === 'active-skill') {
    state.lastBattleSnapshot = undefined
  }

  if (selection?.source === 'active-skill') {
    state.phase = selection.resumePhase
    state.paused = selection.resumePaused
  } else {
    state.waveIndex += 1
    state.phase = 'ready'
    startWave(state)
  }

  events.push({ type: 'strategyCardSelected', cardId })
}

export function setSkillLoadout(state: GameState, cardIds: StrategyCardId[]) {
  const uniqueImplementedCards = cardIds.filter((cardId, index) => {
    const card = strategyCardDefinitions[cardId]

    return index === cardIds.indexOf(cardId) && card !== undefined && isStrategyCardImplemented(card)
  })

  state.skillLoadout = uniqueImplementedCards.slice(0, 5)
  state.usedSkillCards = state.usedSkillCards.filter((cardId) => state.skillLoadout.includes(cardId))
}

export function useSkillCard(state: GameState, cardId: StrategyCardId, events: GameEvent[]) {
  if (state.phase === 'won' || state.phase === 'lost' || state.phase === 'card_select') {
    return
  }

  if (!state.skillLoadout.includes(cardId) || state.usedSkillCards.includes(cardId)) {
    return
  }

  const card = strategyCardDefinitions[cardId]

  if (!card || !isStrategyCardImplemented(card)) {
    return
  }

  applyStrategyCard(state, card, events)
  state.usedSkillCards.push(cardId)
  state.chosenCardTags.push(...card.tags)
  events.push({ type: 'strategyCardSelected', cardId })
}

function isCellInsideLawn(row: number, col: number) {
  return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < lawn.rows && col >= 0 && col < lawn.cols
}

function isCellBuildable(row: number, col: number) {
  return (
    isCellInsideLawn(row, col) &&
    col >= lawn.buildableColStart &&
    col <= lawn.buildableColEnd
  )
}

function getInitialBuildingHp(state: GameState, buildingId: string, baseHp: number) {
  if (buildingId === 'lava_wall') {
    return baseHp + state.activeCardEffects.wallHpBonus
  }

  return baseHp
}

function createRuntimeGroups(
  wave: VolcanoWaveDefinition,
  directorPlan: EnemyDirectorPlan | undefined,
  aiWavePlan: GameState['activeAiWavePlanForWave'] | GameState['pendingAiWavePlan'] = undefined
): WaveRuntimeGroup[] {
  const activeAiWavePlan = aiWavePlan?.targetWaveIndex === wave.index - 1 ? aiWavePlan : undefined

  if (activeAiWavePlan) {
    return activeAiWavePlan.groups.map((group, groupIndex) => ({
      groupIndex,
      enemyId: group.enemyId as WaveRuntimeGroup['enemyId'],
      count: group.count,
      route: group.route,
      interval: group.interval,
      spawned: 0,
      spawnTimer: group.startSecond,
      source: 'ai-wave-director'
    }))
  }

  const activeDirectorPlan = directorPlan?.targetWaveIndex === wave.index - 1 ? directorPlan : undefined
  let remainingRemovals = activeDirectorPlan?.removedEnemyCount ?? 0
  const baseGroups = wave.enemyGroups
    .map((group) => {
      const isBossGroup = group.enemyId === wave.bossId
      const removableCount = isBossGroup ? 0 : Math.max(0, group.count - 1)
      const removedFromGroup = Math.min(remainingRemovals, removableCount)
      remainingRemovals -= removedFromGroup

      return {
        enemyId: group.enemyId,
        count: group.count - removedFromGroup,
        route: group.route,
        startSecond: group.startSecond,
        interval: group.interval,
        source: 'base' as const
      }
    })
    .filter((group) => group.count > 0)

  const directorGroups =
    activeDirectorPlan?.addedGroups.map((group) => ({
      ...group,
      source: 'director' as const
    })) ?? []

  return [...baseGroups, ...directorGroups].map((group, groupIndex) => ({
    groupIndex,
    enemyId: group.enemyId as WaveRuntimeGroup['enemyId'],
    count: group.count,
    route: group.route,
    interval: group.interval,
    spawned: 0,
    spawnTimer: group.startSecond,
    source: group.source
  }))
}

function finalizePlacementSelection(state: GameState, keepSelected: boolean) {
  if (keepSelected && state.selectedPlantType) {
    state.selectedPlantMode = 'persistent'
    return
  }

  clearSelectedBuilding(state)
}

function appendDirectorHistory(
  history: GameState['recentDirectorHistory'],
  entry: GameState['recentDirectorHistory'][number]
) {
  return [...history, entry].slice(-3)
}

function canApplyDirectorPlanToCurrentWave(state: GameState, clearedWave: number) {
  return (
    state.phase === 'playing' &&
    state.wave.active &&
    state.waveIndex === clearedWave &&
    state.zombies.length === 0 &&
    !state.activeDirectorPlanForWave &&
    state.wave.groups.every((group) => group.spawned === 0)
  )
}
