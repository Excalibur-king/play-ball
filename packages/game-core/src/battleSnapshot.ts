import { buildingDefinitions, enemyDefinitions, getLevelWaveDefinitions, lawn, rowsForRoute } from '@tower-rogue/game-content'
import type { BattleSnapshot, GameState, LanePressure, WaveRuntimeGroup } from './types'

type BattleSnapshotSource = 'wave-cleared' | 'active-skill'

type WavePreview = BattleSnapshot['nextWavePreview']
type IncomingLaneState = {
  normal: number
  fast: number
  heavyAttack: number
  flying: number
  boss: number
}

export function createBattleSnapshot(
  state: GameState,
  options: { source?: BattleSnapshotSource } = {}
): BattleSnapshot {
  const source = options.source ?? 'wave-cleared'
  const levelWaves = getLevelWaveDefinitions(state.levelId)
  const nextWavePreview =
    source === 'active-skill' ? createActiveSkillPreview(state) : createWavePreviewFromDefinition(levelWaves[state.waveIndex + 1])

  const buildingCounts = {
    energy: state.plants.filter((building) => buildingDefinitions[building.type].type === 'energy').length,
    attack: state.plants.filter((building) => buildingDefinitions[building.type].type === 'attack').length,
    defense: state.plants.filter((building) => buildingDefinitions[building.type].type === 'defense').length
  }
  const attackBuildings = state.plants.filter((building) => buildingDefinitions[building.type].type === 'attack')
  const energyBuildings = state.plants.filter((building) => buildingDefinitions[building.type].type === 'energy')

  const groundDamage = attackBuildings.reduce((sum, building) => {
    const definition = buildingDefinitions[building.type]
    return sum + (definition.attackPower ?? 0) + (building.upgraded ? definition.upgrade?.attackPowerBonus ?? 0 : 0)
  }, 0)
  const flyingDamage = attackBuildings.reduce((sum, building) => {
    const definition = buildingDefinitions[building.type]

    if (!definition.canTargetFlying) {
      return sum
    }

    return sum + (definition.attackPower ?? 0) + (building.upgraded ? definition.upgrade?.attackPowerBonus ?? 0 : 0)
  }, 0)
  const lanePressure = createLanePressure(state, source)

  const snapshot: BattleSnapshot = {
    wave: state.waveIndex + 1,
    baseHp: state.baseHp,
    purchasePower: state.sun,
    leaksLastWave: state.lastWaveStats.leaks,
    destroyedBuildingsLastWave: state.lastWaveStats.destroyedBuildings,
    buildingCounts,
    outputProfile: {
      groundDamage,
      flyingDamage,
      attackCoverage: attackBuildings.length,
      blockCapacity: state.plants.filter((building) => buildingDefinitions[building.type].canBlockGround).reduce((sum, building) => sum + building.hp, 0),
      energyIncome: energyBuildings.reduce((sum, building) => sum + (buildingDefinitions[building.type].purchasePowerPerTick ?? 0), 0)
    },
    pressureProfile: {
      groundPressure: nextWavePreview.normal + nextWavePreview.fast + nextWavePreview.heavyAttack,
      flyingPressure: nextWavePreview.flying,
      fastPressure: nextWavePreview.fast,
      buildingDamagePressure: nextWavePreview.heavyAttack + (nextWavePreview.hasBoss ? 4 : 0)
    },
    lanePressure,
    nextWavePreview,
    problemTags: [],
    chosenCardTags: state.chosenCardTags
  }

  snapshot.problemTags = deriveProblemTags(snapshot)
  return snapshot
}

function createActiveSkillPreview(state: GameState): WavePreview {
  if (state.phase === 'playing' && state.wave.active) {
    const preview = createEmptyWavePreview()

    for (const zombie of state.zombies) {
      applyEnemyToPreview(preview, zombie.type, 1)
    }

    for (const groupRuntime of state.wave.groups) {
      const remaining = Math.max(0, groupRuntime.count - groupRuntime.spawned)

      if (remaining > 0) {
        applyEnemyToPreview(preview, groupRuntime.enemyId, remaining)
      }
    }

    return preview
  }

  return createWavePreviewFromDefinition(getLevelWaveDefinitions(state.levelId)[state.waveIndex])
}

function createWavePreviewFromDefinition(wave: ReturnType<typeof getLevelWaveDefinitions>[number] | undefined): WavePreview {
  const preview = createEmptyWavePreview()

  if (!wave) {
    return preview
  }

  for (const group of wave.enemyGroups) {
    applyEnemyToPreview(preview, group.enemyId as keyof typeof enemyDefinitions, group.count)
  }

  return preview
}

function createEmptyWavePreview(): WavePreview {
  return {
    normal: 0,
    fast: 0,
    heavyAttack: 0,
    flying: 0,
    hasBoss: false
  }
}

function createLanePressure(state: GameState, source: BattleSnapshotSource): LanePressure[] {
  const incomingByLane = createIncomingLaneState()
  const levelWaves = getLevelWaveDefinitions(state.levelId)

  if (source === 'active-skill' && state.phase === 'playing' && state.wave.active) {
    for (const zombie of state.zombies) {
      applyEnemyToLaneIncoming(incomingByLane[zombie.row], zombie.type)
    }

    for (const groupRuntime of state.wave.groups) {
      const remaining = Math.max(0, groupRuntime.count - groupRuntime.spawned)

      if (remaining > 0) {
        distributeIncomingCounts(incomingByLane, groupRuntime.route, groupRuntime.enemyId, remaining)
      }
    }
  } else {
    const nextWave = levelWaves[state.waveIndex + 1]

    if (nextWave) {
      for (const group of nextWave.enemyGroups) {
        distributeIncomingCounts(incomingByLane, group.route, group.enemyId as keyof typeof enemyDefinitions, group.count)
      }
    }
  }

  return Array.from({ length: lawn.rows }, (_, lane): LanePressure => {
    const laneBuildings = state.plants.filter((building) => building.row === lane)
    const laneAttackBuildings = laneBuildings.filter((building) => buildingDefinitions[building.type].type === 'attack')
    const laneEnergyBuildings = laneBuildings.filter((building) => buildingDefinitions[building.type].type === 'energy')
    const laneStats = state.lastWaveStats.byLane[lane] ?? { leaks: 0, destroyedBuildings: 0 }
    const incoming = incomingByLane[lane] ?? createEmptyIncomingLaneState()

    const groundDps = laneAttackBuildings.reduce((sum, building) => {
      const definition = buildingDefinitions[building.type]
      return sum + (definition.attackPower ?? 0) + (building.upgraded ? definition.upgrade?.attackPowerBonus ?? 0 : 0)
    }, 0)
    const flyingDps = laneAttackBuildings.reduce((sum, building) => {
      const definition = buildingDefinitions[building.type]

      if (!definition.canTargetFlying) {
        return sum
      }

      return sum + (definition.attackPower ?? 0) + (building.upgraded ? definition.upgrade?.attackPowerBonus ?? 0 : 0)
    }, 0)
    const blockHp = laneBuildings
      .filter((building) => buildingDefinitions[building.type].canBlockGround)
      .reduce((sum, building) => sum + building.hp, 0)
    const economyValue = laneEnergyBuildings.reduce((sum, building) => {
      const definition = buildingDefinitions[building.type]
      return (
        sum +
        (definition.purchasePowerPerTick ?? 0) +
        (building.upgraded ? definition.upgrade?.purchasePowerPerTickBonus ?? 0 : 0) +
        state.activeCardEffects.energyOutputBonus
      )
    }, 0)

    return {
      lane,
      leaksLastWave: laneStats.leaks,
      enemiesReachedFront: laneStats.leaks,
      destroyedBuildingsLastWave: laneStats.destroyedBuildings,
      groundDps,
      flyingDps,
      blockHp,
      economyValue,
      pressureScore: calculateLanePressureScore({
        leaksLastWave: laneStats.leaks,
        destroyedBuildingsLastWave: laneStats.destroyedBuildings,
        groundDps,
        flyingDps,
        blockHp,
        economyValue,
        incoming
      })
    }
  })
}

function createIncomingLaneState() {
  return Array.from({ length: lawn.rows }, () => createEmptyIncomingLaneState())
}

function createEmptyIncomingLaneState(): IncomingLaneState {
  return {
    normal: 0,
    fast: 0,
    heavyAttack: 0,
    flying: 0,
    boss: 0
  }
}

function distributeIncomingCounts(
  incomingByLane: IncomingLaneState[],
  route: WaveRuntimeGroup['route'],
  enemyId: keyof typeof enemyDefinitions,
  count: number
) {
  const rows = rowsForRoute(route)

  for (let index = 0; index < count; index += 1) {
    const row = rows[index % rows.length]
    const incoming = row === undefined ? undefined : incomingByLane[row]

    if (incoming) {
      applyEnemyToLaneIncoming(incoming, enemyId)
    }
  }
}

function applyEnemyToLaneIncoming(incoming: IncomingLaneState | undefined, enemyId: keyof typeof enemyDefinitions) {
  if (!incoming) {
    return
  }

  const enemy = enemyDefinitions[enemyId]

  if (enemy.role === 'normal') incoming.normal += 1
  if (enemy.role === 'fast') incoming.fast += 1
  if (enemy.role === 'heavy_attack') incoming.heavyAttack += 1
  if (enemy.role === 'flying') incoming.flying += 1
  if (enemy.role === 'boss') incoming.boss += 1
}

function calculateLanePressureScore(input: {
  leaksLastWave: number
  destroyedBuildingsLastWave: number
  groundDps: number
  flyingDps: number
  blockHp: number
  economyValue: number
  incoming: IncomingLaneState
}) {
  const { leaksLastWave, destroyedBuildingsLastWave, groundDps, flyingDps, blockHp, economyValue, incoming } = input
  const leakPressure = leaksLastWave * 0.22
  const destroyedPressure = destroyedBuildingsLastWave * 0.18
  const incomingPressure =
    incoming.normal * 0.035 +
    incoming.fast * 0.055 +
    incoming.heavyAttack * 0.085 +
    incoming.flying * (flyingDps > 0 ? 0.05 : 0.085) +
    incoming.boss * 0.18
  const exposedEconomyPressure = economyValue > 0 && blockHp < 180 ? Math.min(0.12, economyValue * 0.0035) : 0
  const damageRelief = groundDps * 0.0032
  const antiAirRelief = incoming.flying > 0 ? flyingDps * 0.0026 : 0
  const blockRelief = blockHp * 0.0012

  return clamp01(leakPressure + destroyedPressure + incomingPressure + exposedEconomyPressure - damageRelief - antiAirRelief - blockRelief)
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(3))))
}

function applyEnemyToPreview(preview: WavePreview, enemyId: keyof typeof enemyDefinitions, count: number) {
  const enemy = enemyDefinitions[enemyId]

  if (enemy.role === 'normal') preview.normal += count
  if (enemy.role === 'fast') preview.fast += count
  if (enemy.role === 'heavy_attack') preview.heavyAttack += count
  if (enemy.role === 'flying') preview.flying += count
  if (enemy.role === 'boss') preview.hasBoss = true
}

function deriveProblemTags(snapshot: BattleSnapshot) {
  const tags: string[] = []

  if (snapshot.purchasePower < 80 && snapshot.buildingCounts.energy < 2) tags.push('low_economy')
  if (snapshot.outputProfile.groundDamage < 55 && snapshot.pressureProfile.groundPressure >= 8) tags.push('ground_damage_low')
  if (snapshot.leaksLastWave > 0 || snapshot.pressureProfile.fastPressure >= 4) tags.push('fast_pressure_high')
  if (snapshot.destroyedBuildingsLastWave > 0 || snapshot.pressureProfile.buildingDamagePressure >= 3) tags.push('building_break_high')
  if (snapshot.nextWavePreview.flying >= 4 && snapshot.outputProfile.flyingDamage < 55) tags.push('flying_pressure_high')
  if (snapshot.buildingCounts.defense < 1 || snapshot.outputProfile.blockCapacity < 160) tags.push('block_capacity_low')
  if (snapshot.nextWavePreview.hasBoss) tags.push('boss_incoming')
  if (snapshot.baseHp <= 4) tags.push('base_danger')
  if (snapshot.outputProfile.attackCoverage < 2 && snapshot.nextWavePreview.flying > 0) tags.push('coverage_low')
  if (snapshot.buildingCounts.defense >= 2 && snapshot.outputProfile.groundDamage < 55) tags.push('defense_heavy')
  if (snapshot.buildingCounts.energy >= 3 && snapshot.outputProfile.groundDamage < 70) tags.push('energy_heavy')

  return tags
}
