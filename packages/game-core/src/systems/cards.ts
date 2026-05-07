import type { Point, StrategyCardDefinition, StrategyCardId } from '@tower-rogue/game-content'
import { buildingDefinitions, cellCenter, lawn, strategyCards } from '@tower-rogue/game-content'
import { createEntityId } from '../ids'
import type { GameEvent, GameState, Plant } from '../types'

const implementedStrategyCardEffectKinds = new Set([
  'freeze_enemies',
  'grant_base_shield',
  'repair_all_buildings',
  'gain_purchase_power',
  'boost_energy_core_output',
  'boost_building_attack_power',
  'boost_building_attack_speed',
  'focus_flying_targets',
  'boost_specific_building_hp',
  'boost_wall_hp_and_repair',
  'spell_lava_rain',
  'summon_flame_hawks',
  'summon_furnace_golem',
  'spawn_temporary_wall',
  'summon_energy_sprite',
  'wall_damage_reflection',
  'recharge_laser_turrets',
  'spell_molten_chain',
  'summon_fire_dragon_breath',
  'premium_starfall_contract'
])

// Only effects that physically spawn a creature or structure on the lawn
// pause for the summon animation. All other effects apply immediately so
// gameplay reads instantly, while their summon visual still flashes via the
// skillSummoned event.
const delayedSummonEffectKinds = new Set([
  'summon_flame_hawks',
  'summon_furnace_golem',
  'summon_energy_sprite',
  'summon_fire_dragon_breath'
])

const summonDelaySeconds = 0.65

export function isStrategyCardImplemented(card: StrategyCardDefinition) {
  return implementedStrategyCardEffectKinds.has(card.effect.kind)
}

export function applyStrategyCard(state: GameState, card: StrategyCardDefinition, events: GameEvent[]) {
  const cardId = card.id as StrategyCardId
  events.push({ type: 'skillSummoned', cardId, at: getSkillSummonPoint(state, card.effect.kind) })

  if (delayedSummonEffectKinds.has(card.effect.kind)) {
    state.pendingSkillEffects.push({ cardId, triggerAt: state.time + summonDelaySeconds })
    return
  }

  applyStrategyCardEffect(state, card, events)
}

export function updatePendingSkillEffects(state: GameState, events: GameEvent[]) {
  const pending = state.pendingSkillEffects
  state.pendingSkillEffects = []

  for (const effect of pending) {
    if (effect.triggerAt > state.time) {
      state.pendingSkillEffects.push(effect)
      continue
    }

    const card = getStrategyCard(effect.cardId)

    if (card) {
      applyStrategyCardEffect(state, card, events)
    }
  }

  updateEnergySpriteTick(state, events)
  expireTimedSummons(state, events)
}

function expireTimedSummons(state: GameState, events: GameEvent[]) {
  const expired: Plant[] = []
  state.plants = state.plants.filter((plant) => {
    if (plant.temporaryUntilTime !== undefined && plant.temporaryUntilTime <= state.time) {
      expired.push(plant)
      return false
    }
    return true
  })

  for (const plant of expired) {
    events.push({ type: 'plantDestroyed', plantId: plant.id, plantType: plant.type, at: { x: plant.x, y: plant.y } })
  }
}

function applyStrategyCardEffect(state: GameState, card: StrategyCardDefinition, events: GameEvent[]) {
  const cardId = card.id as StrategyCardId
  const scaling = getSkillLevelScaling(state, cardId)
  switch (card.effect.kind) {
    case 'freeze_enemies':
      freezeEnemies(state, Number(card.effect.nonBossDuration ?? 3), Number(card.effect.bossDuration ?? 1), events)
      return
    case 'grant_base_shield':
      state.activeCardEffects.baseShield += scaleCardNumber(Number(card.effect.value ?? 0), scaling)
      return
    case 'repair_all_buildings':
      repairAllBuildings(state, scaleCardNumber(Number(card.effect.value ?? 0), scaling), events, cardId)
      return
    case 'gain_purchase_power': {
      const amount = scaleCardNumber(Number(card.effect.value ?? 0), scaling)
      const hudPoint: Point = { x: 72, y: 82 }
      state.sun += amount
      events.push({ type: 'sunChanged', amount, at: hudPoint })
      events.push({
        type: 'cardEffectImpact',
        cardId,
        at: hudPoint,
        impactKind: 'energyGain',
        targetType: 'hud'
      })
      return
    }
    case 'boost_energy_core_output':
      state.activeCardEffects.energyOutputBonus += scaleCardNumber(Number(card.effect.value ?? 0), scaling)
      state.activeCardEffects.expiresAfterWave.energyOutputBonus =
        state.waveIndex + Number(card.effect.durationWaves ?? 1)
      return
    case 'boost_building_attack_power':
      state.activeCardEffects.attackPowerBonus += Number(card.effect.value ?? 0) * scaling
      state.activeCardEffects.expiresAfterWave.attackPowerBonus = state.waveIndex + 1
      return
    case 'boost_building_attack_speed':
      state.activeCardEffects.attackIntervalBonus += Number(card.effect.value ?? 0) * scaling
      state.activeCardEffects.attackIntervalMin = Number(card.effect.minAttackInterval ?? 0.65)
      state.activeCardEffects.expiresAfterWave.attackIntervalBonus = state.waveIndex + 1
      return
    case 'focus_flying_targets':
      state.activeCardEffects.antiAirFocus = true
      state.activeCardEffects.antiAirDamageMultiplier = Number(card.effect.damageMultiplier ?? 1.3)
      state.activeCardEffects.expiresAfterWave.antiAirFocus = state.waveIndex + 1
      return
    case 'boost_specific_building_hp':
      boostSpecificBuildings(
        state,
        String(card.effect.target ?? ''),
        scaleCardNumber(Number(card.effect.hpBonus ?? 0), scaling),
        scaleCardNumber(Number(card.effect.repairValue ?? 0), scaling)
      )
      return
    case 'boost_wall_hp_and_repair':
      boostWalls(state, scaleCardNumber(Number(card.effect.hpBonus ?? 0), scaling), scaleCardNumber(Number(card.effect.repairValue ?? 0), scaling))
      return
    case 'spell_lava_rain':
      strikeHighestHpEnemies(state, Number(card.effect.strikes ?? 8), scaleCardNumber(Number(card.effect.damage ?? 35), scaling), events, cardId)
      return
    case 'summon_flame_hawks':
      strikeFlyingFirst(state, Number(card.effect.count ?? 2), scaleCardNumber(Number(card.effect.damage ?? 65), scaling), events, cardId)
      return
    case 'summon_furnace_golem':
      summonTemporaryTurret(state, 'melee_turret', Number(card.effect.durationSeconds ?? 25), events)
      return
    case 'spawn_temporary_wall':
      spawnTemporaryWall(state, events)
      return
    case 'summon_energy_sprite':
      activateEnergySprite(
        state,
        Number(card.effect.durationSeconds ?? 9),
        Number(card.effect.collectionIntervalSeconds ?? 3)
      )
      return
    case 'wall_damage_reflection':
      state.activeCardEffects.wallReflectionDamage = scaleCardNumber(Number(card.effect.damage ?? 0), scaling)
      state.activeCardEffects.wallReflectionInterval = Number(card.effect.cooldown ?? 1)
      state.activeCardEffects.wallReflectionLastTriggeredAt = Number.NEGATIVE_INFINITY
      state.activeCardEffects.expiresAfterWave.wallReflection =
        state.waveIndex + Number(card.effect.durationWaves ?? 1)
      return
    case 'recharge_laser_turrets':
      rechargeLaserTurrets(state, Number(card.effect.charges ?? 1))
      return
    case 'spell_molten_chain':
      strikeHighestHpEnemies(state, Number(card.effect.bounces ?? 5), scaleCardNumber(Number(card.effect.damage ?? 45), scaling), events, cardId)
      return
    case 'summon_fire_dragon_breath':
      strikeAllEnemies(state, scaleCardNumber(Number(card.effect.damage ?? 110), scaling), events, cardId)
      return
    case 'premium_starfall_contract':
      castStarfallContract(state, Number(card.effect.strikes ?? 3), scaleCardNumber(Number(card.effect.damage ?? 150), scaling), events, cardId)
      return
    default:
      return
  }
}

function getSkillLevelScaling(state: GameState, cardId: StrategyCardId) {
  const skillLevel = Math.max(0, Math.min(100, Math.floor(state.skillLevels[cardId] ?? 0)))
  return 1 + skillLevel / 100
}

function scaleCardNumber(value: number, scaling: number) {
  return Math.round(value * scaling)
}

function getStrategyCard(cardId: string) {
  return strategyCards.find((card) => card.id === cardId)
}

function getSkillSummonPoint(state: GameState, effectKind: string) {
  if (effectKind === 'summon_energy_sprite') {
    const energyCore = state.plants.find((plant) => plant.type === 'energy_core')
    return energyCore ? { x: energyCore.x, y: energyCore.y - 24 } : { x: 88, y: 82 }
  }

  if (effectKind === 'summon_furnace_golem') {
    const row = getPreferredWallRows(state)[0] ?? Math.floor(lawn.rows / 2)
    return cellCenter(row, 2)
  }

  if (effectKind === 'spawn_temporary_wall') {
    const row = getPreferredWallRows(state)[0] ?? Math.floor(lawn.rows / 2)
    return cellCenter(row, 1)
  }

  if (effectKind === 'wall_damage_reflection') {
    const wall = state.plants.find((plant) => plant.type === 'lava_wall')
    if (wall) {
      return { x: wall.x, y: wall.y - 18 }
    }
    const row = getPreferredWallRows(state)[0] ?? Math.floor(lawn.rows / 2)
    return cellCenter(row, 1)
  }

  if (effectKind === 'gain_purchase_power') {
    const energyCore = state.plants.find((plant) => plant.type === 'energy_core')
    return energyCore ? { x: energyCore.x, y: energyCore.y - 24 } : { x: 88, y: 82 }
  }

  if (effectKind === 'repair_all_buildings') {
    return { x: lawn.originX + (lawn.cols * lawn.cellWidth) / 2, y: lawn.originY + (lawn.rows * lawn.cellHeight) / 2 }
  }

  if (effectKind === 'freeze_enemies') {
    if (state.zombies.length === 0) {
      return { x: lawn.originX + (lawn.cols * lawn.cellWidth) / 2, y: lawn.originY + (lawn.rows * lawn.cellHeight) / 2 }
    }
    const avgX = state.zombies.reduce((sum, z) => sum + z.x, 0) / state.zombies.length
    const avgY = state.zombies.reduce((sum, z) => sum + z.y, 0) / state.zombies.length
    return { x: avgX, y: avgY - 24 }
  }

  if (effectKind === 'spell_lava_rain') {
    return { x: lawn.originX + (lawn.cols * lawn.cellWidth) / 2, y: lawn.originY + lawn.cellHeight * 0.5 }
  }

  if (effectKind === 'spell_molten_chain') {
    if (state.zombies.length === 0) {
      return { x: lawn.originX + (lawn.cols * lawn.cellWidth) / 2, y: lawn.originY + (lawn.rows * lawn.cellHeight) / 2 }
    }
    const target = [...state.zombies].sort((a, b) => b.hp - a.hp)[0]!
    return { x: target.x, y: target.y - 24 }
  }

  if (effectKind === 'summon_fire_dragon_breath') {
    return { x: lawn.originX + lawn.cellWidth * 2.5, y: lawn.originY + lawn.cellHeight * 0.3 }
  }

  if (effectKind === 'premium_starfall_contract') {
    if (state.zombies.length === 0) {
      return { x: lawn.originX + (lawn.cols * lawn.cellWidth) / 2, y: lawn.originY + lawn.cellHeight * 0.5 }
    }
    const target = [...state.zombies].sort((a, b) => b.hp - a.hp)[0]!
    return { x: target.x, y: target.y - 32 }
  }

  if (state.zombies.length > 0) {
    const target = [...state.zombies].sort((a, b) => b.hp - a.hp)[0]
    if (target) {
      return { x: target.x, y: target.y - 24 }
    }
  }

  return { x: lawn.originX + (lawn.cols * lawn.cellWidth) / 2, y: lawn.originY + (lawn.rows * lawn.cellHeight) / 2 }
}

function freezeEnemies(state: GameState, nonBossDuration: number, bossDuration: number, events: GameEvent[]) {
  for (const zombie of state.zombies) {
    const duration = zombie.category === 'boss' ? bossDuration : nonBossDuration
    zombie.frozenUntil = Math.max(zombie.frozenUntil ?? state.time, state.time + duration)
    events.push({ type: 'zombieHit', zombieId: zombie.id, at: { x: zombie.x, y: zombie.y }, damage: 0 })
  }
}

export function clearExpiredCardEffects(state: GameState, clearedWaveIndex: number) {
  for (const [key, expiresAfterWave] of Object.entries(state.activeCardEffects.expiresAfterWave)) {
    if (expiresAfterWave === undefined || expiresAfterWave > clearedWaveIndex) {
      continue
    }

    if (key === 'attackPowerBonus') {
      state.activeCardEffects.attackPowerBonus = 0
    }

    if (key === 'attackIntervalBonus') {
      state.activeCardEffects.attackIntervalBonus = 0
      state.activeCardEffects.attackIntervalMin = 0
    }

    if (key === 'antiAirFocus') {
      state.activeCardEffects.antiAirFocus = false
      state.activeCardEffects.antiAirDamageMultiplier = 1
    }

    if (key === 'energyOutputBonus') {
      state.activeCardEffects.energyOutputBonus = 0
    }

    if (key === 'wallReflection') {
      state.activeCardEffects.wallReflectionDamage = 0
      state.activeCardEffects.wallReflectionInterval = 0
      state.activeCardEffects.wallReflectionLastTriggeredAt = Number.NEGATIVE_INFINITY
    }

    delete state.activeCardEffects.expiresAfterWave[key]
  }

  // Clear time-based energy sprite once a wave finishes; the sprite is
  // intentionally a short burst, not something that should leak into the
  // next planning window.
  state.activeCardEffects.energySpriteEndsAt = undefined
  state.activeCardEffects.energySpriteIntervalSeconds = 0
  state.activeCardEffects.energySpriteNextTickAt = 0

  state.plants = state.plants.filter(
    (plant) =>
      (plant.temporaryUntilWave === undefined || plant.temporaryUntilWave > clearedWaveIndex) &&
      (plant.temporaryUntilTime === undefined || plant.temporaryUntilTime > state.time)
  )
}

function activateEnergySprite(state: GameState, durationSeconds: number, intervalSeconds: number) {
  const safeDuration = Math.max(0, durationSeconds)
  const safeInterval = Math.max(0.1, intervalSeconds)

  state.activeCardEffects.energySpriteEndsAt = state.time + safeDuration
  state.activeCardEffects.energySpriteIntervalSeconds = safeInterval
  state.activeCardEffects.energySpriteNextTickAt = state.time + safeInterval
}

function updateEnergySpriteTick(state: GameState, events: GameEvent[]) {
  const endsAt = state.activeCardEffects.energySpriteEndsAt

  if (endsAt === undefined) {
    return
  }

  if (state.time >= endsAt + state.activeCardEffects.energySpriteIntervalSeconds) {
    state.activeCardEffects.energySpriteEndsAt = undefined
    state.activeCardEffects.energySpriteIntervalSeconds = 0
    state.activeCardEffects.energySpriteNextTickAt = 0
    return
  }

  while (
    state.activeCardEffects.energySpriteNextTickAt > 0 &&
    state.time >= state.activeCardEffects.energySpriteNextTickAt &&
    state.activeCardEffects.energySpriteNextTickAt <= endsAt
  ) {
    grantEnergySpriteCollection(state, events)
    state.activeCardEffects.energySpriteNextTickAt += state.activeCardEffects.energySpriteIntervalSeconds
  }
}

function grantEnergySpriteCollection(state: GameState, events: GameEvent[]) {
  for (const building of state.plants) {
    const definition = buildingDefinitions[building.type]

    if (definition.type !== 'energy' || !definition.purchasePowerPerTick) {
      continue
    }

    const upgradedBonus = building.upgraded ? definition.upgrade?.purchasePowerPerTickBonus ?? 0 : 0
    const amount =
      definition.purchasePowerPerTick + upgradedBonus + state.activeCardEffects.energyOutputBonus

    state.sun += amount
    events.push({ type: 'sunChanged', amount, at: { x: building.x, y: building.y - 30 } })
  }
}

function repairAllBuildings(state: GameState, amount: number, events: GameEvent[], cardId: StrategyCardId) {
  for (const building of state.plants) {
    if (building.hp >= building.maxHp) {
      // Still emit a heal pulse so the renderer can flash the building briefly
      // (visual feedback is part of the card's identity even on full-hp units).
    }
    building.hp = Math.min(building.maxHp, building.hp + amount)
    events.push({
      type: 'cardEffectImpact',
      cardId,
      at: { x: building.x, y: building.y },
      impactKind: 'heal',
      targetType: 'plant',
      targetId: building.id
    })
  }
}

function boostWalls(state: GameState, hpBonus: number, repairValue: number) {
  state.activeCardEffects.wallHpBonus += hpBonus

  for (const building of state.plants) {
    if (building.type !== 'lava_wall') {
      continue
    }

    building.maxHp += hpBonus
    building.hp = Math.min(building.maxHp, building.hp + repairValue)
  }
}

function boostSpecificBuildings(state: GameState, target: string, hpBonus: number, repairValue: number) {
  for (const building of state.plants) {
    if (building.type !== target) {
      continue
    }

    building.maxHp += hpBonus
    building.hp = Math.min(building.maxHp, building.hp + repairValue)
  }
}

function spawnTemporaryWall(state: GameState, events: GameEvent[]) {
  const targetCell = getCellInFrontOfClosestBaseEnemy(state, 1)

  if (!targetCell) {
    return
  }

  const { row, col } = targetCell
  const center = cellCenter(row, col)
  const maxHp = 360 + state.activeCardEffects.wallHpBonus
  const wall: Plant = {
    id: createEntityId('plant'),
    type: 'lava_wall',
    components: ['lava_wall'],
    row,
    col,
    x: center.x,
    y: center.y,
    hp: maxHp,
    maxHp,
    shootCooldown: 0,
    sunTimer: 0,
    attackDirection: 'up',
    upgraded: false,
    temporaryUntilWave: state.waveIndex + 1
  }

  if (row >= 0 && row < lawn.rows) {
    state.plants.push(wall)
    events.push({ type: 'plantPlaced', plantId: wall.id, plantType: wall.type, at: center })
  }
}

function rechargeLaserTurrets(state: GameState, charges: number) {
  for (const building of state.plants) {
    if (building.type !== 'laser_turret') {
      continue
    }

    building.chargesRemaining = (building.chargesRemaining ?? 0) + charges
  }
}

function castStarfallContract(state: GameState, strikes: number, damage: number, events: GameEvent[], cardId: StrategyCardId) {
  strikeHighestHpEnemies(state, strikes, damage, events, cardId)
}

function strikeHighestHpEnemies(state: GameState, strikes: number, damage: number, events: GameEvent[], cardId: StrategyCardId) {
  for (let strike = 0; strike < strikes; strike += 1) {
    const target = [...state.zombies].filter((zombie) => zombie.hp > 0).sort((a, b) => b.hp - a.hp)[0]

    if (!target) {
      return
    }

    const at: Point = { x: target.x, y: target.y }
    target.hp -= damage
    events.push({ type: 'zombieHit', zombieId: target.id, at, damage })
    events.push({
      type: 'cardEffectImpact',
      cardId,
      at,
      impactKind: 'strike',
      targetType: 'zombie',
      targetId: target.id
    })

    if (target.hp <= 0) {
      state.currentWaveStats.killedByType[target.type] = (state.currentWaveStats.killedByType[target.type] ?? 0) + 1
      events.push({ type: 'zombieKilled', zombieId: target.id, zombieType: target.type, at })
    }
  }

  state.zombies = state.zombies.filter((zombie) => zombie.hp > 0)
}

function strikeFlyingFirst(state: GameState, strikes: number, damage: number, events: GameEvent[], cardId: StrategyCardId) {
  for (let strike = 0; strike < strikes; strike += 1) {
    const target = [...state.zombies]
      .filter((zombie) => zombie.hp > 0)
      .sort((a, b) => Number(b.flying) - Number(a.flying) || b.hp - a.hp)[0]

    if (!target) {
      return
    }

    damageZombie(state, target.id, damage, events, cardId)
  }
}

function strikeAllEnemies(state: GameState, damage: number, events: GameEvent[], cardId: StrategyCardId) {
  for (const zombie of [...state.zombies].filter((candidate) => candidate.hp > 0)) {
    damageZombie(state, zombie.id, damage, events, cardId)
  }
}

function damageZombie(state: GameState, zombieId: string, damage: number, events: GameEvent[], cardId?: StrategyCardId) {
  const zombie = state.zombies.find((candidate) => candidate.id === zombieId)

  if (!zombie || zombie.hp <= 0) {
    return
  }

  const at: Point = { x: zombie.x, y: zombie.y }
  zombie.hp -= damage
  events.push({ type: 'zombieHit', zombieId: zombie.id, at, damage })

  if (cardId) {
    events.push({
      type: 'cardEffectImpact',
      cardId,
      at,
      impactKind: 'strike',
      targetType: 'zombie',
      targetId: zombie.id
    })
  }

  if (zombie.hp <= 0) {
    state.currentWaveStats.killedByType[zombie.type] = (state.currentWaveStats.killedByType[zombie.type] ?? 0) + 1
    events.push({ type: 'zombieKilled', zombieId: zombie.id, zombieType: zombie.type, at })
    state.zombies = state.zombies.filter((candidate) => candidate.hp > 0)
  }
}

function summonTemporaryTurret(state: GameState, buildingId: Plant['type'], durationSeconds: number, events: GameEvent[]) {
  const targetCell = getCellInFrontOfClosestBaseEnemy(state, 2)

  if (!targetCell) {
    return
  }

  const { row, col } = targetCell
  const center = cellCenter(row, col)
  const plant: Plant = {
    id: createEntityId('plant'),
    type: buildingId,
    components: [buildingId],
    row,
    col,
    x: center.x,
    y: center.y,
    hp: 160,
    maxHp: 160,
    shootCooldown: 0,
    sunTimer: 0,
    attackDirection: 'up',
    upgraded: false,
    temporaryUntilTime: durationSeconds > 0 ? state.time + durationSeconds : undefined
  }

  state.plants.push(plant)
  events.push({ type: 'plantPlaced', plantId: plant.id, plantType: plant.type, at: center })
}

function getCellInFrontOfClosestBaseEnemy(state: GameState, fallbackCol: number) {
  const closestEnemy = [...state.zombies]
    .filter((zombie) => zombie.hp > 0)
    .sort((a, b) => a.x - b.x)[0]

  if (closestEnemy) {
    const enemyCol = Math.floor((closestEnemy.x - lawn.originX) / lawn.cellWidth)
    const row = clampGridIndex(closestEnemy.row, 0, lawn.rows - 1)
    const preferredCol = clampGridIndex(enemyCol - 1, 0, lawn.cols - 1)

    // First try the exact request: if the closest-to-base enemy is at
    // (row, col), place the summon at (row, col - 1), i.e. between that
    // enemy and the base. If occupied, keep the same lane and search one
    // step further toward the base before falling back to the right side.
    const sameLaneCandidates = [
      ...rangeDescending(preferredCol, 0),
      ...rangeAscending(preferredCol + 1, lawn.cols - 1)
    ]
    for (const col of sameLaneCandidates) {
      if (!state.plants.some((plant) => plant.row === row && plant.col === col)) {
        return { row, col }
      }
    }
  }

  const preferredRows = getPreferredWallRows(state)
  for (const row of preferredRows) {
    if (!state.plants.some((plant) => plant.row === row && plant.col === fallbackCol)) {
      return { row, col: fallbackCol }
    }
  }

  return undefined
}

function rangeDescending(start: number, end: number) {
  const values: number[] = []
  for (let value = start; value >= end; value -= 1) {
    values.push(value)
  }
  return values
}

function rangeAscending(start: number, end: number) {
  const values: number[] = []
  for (let value = start; value <= end; value += 1) {
    values.push(value)
  }
  return values
}

function clampGridIndex(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.floor(value)))
}

function getPreferredWallRows(state: GameState) {
  const defaultOrder =
    lawn.rows === 6
      ? [2, 3, 1, 4, 0, 5]
      : [Math.floor(lawn.rows / 2), Math.max(0, Math.floor(lawn.rows / 2) - 1), Math.min(lawn.rows - 1, Math.floor(lawn.rows / 2) + 1), 0, lawn.rows - 1]
  const lanePressure = state.lastBattleSnapshot?.lanePressure

  if (!lanePressure || lanePressure.length === 0) {
    return defaultOrder
  }

  const ranked = [...lanePressure].sort((a, b) => b.pressureScore - a.pressureScore).map((lane) => lane.lane)
  return [...new Set([...ranked, ...defaultOrder])]
}
