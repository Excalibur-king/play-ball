import {
  buildingDefinitions,
  buildingTypes,
  directorRules,
  enemyDefinitions,
  enemyTypes,
  strategyCardDefinitions,
  strategyCardIds,
  volcanoMap,
  volcanoWaves
} from './index'
import type {
  BuildingDefinition,
  BuildingId,
  DirectorRuleDef,
  EnemyDefinition,
  EnemyId,
  StrategyCardDefinition,
  StrategyCardId,
  VolcanoWaveDefinition
} from './index'

export type ContentValidationIssue = {
  path: string
  message: string
}

export function validateCurrentContent(): ContentValidationIssue[] {
  const issues: ContentValidationIssue[] = []
  validateMap(issues)
  validateBuildings(issues)
  validateEnemies(issues)
  validateStrategyCards(issues)
  validateWaves(issues)
  validateDirectorRules(issues)
  return issues
}

export function assertValidCurrentContent(): void {
  const issues = validateCurrentContent()

  if (issues.length > 0) {
    const summary = issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')
    throw new Error(`Game content validation failed:\n${summary}`)
  }
}

function validateMap(issues: ContentValidationIssue[]) {
  requireNonEmptyString(issues, 'volcanoMap.id', volcanoMap.id)
  requirePositiveNumber(issues, 'volcanoMap.laneCount', volcanoMap.laneCount)
  requirePositiveNumber(issues, 'volcanoMap.baseHp', volcanoMap.baseHp)
  requirePositiveNumber(issues, 'volcanoMap.initialPurchasePower', volcanoMap.initialPurchasePower)

  if (!enemyDefinitions[volcanoMap.bossId as EnemyId]) {
    issues.push({ path: 'volcanoMap.bossId', message: `Unknown boss enemy "${volcanoMap.bossId}".` })
  }

  const [minMinutes, maxMinutes] = volcanoMap.runTimeMinutes
  requirePositiveNumber(issues, 'volcanoMap.runTimeMinutes.0', minMinutes)
  requirePositiveNumber(issues, 'volcanoMap.runTimeMinutes.1', maxMinutes)

  if (minMinutes > maxMinutes) {
    issues.push({ path: 'volcanoMap.runTimeMinutes', message: 'Minimum run time cannot exceed maximum run time.' })
  }
}

function validateBuildings(issues: ContentValidationIssue[]) {
  validateUniqueIds(issues, 'buildingTypes', buildingTypes)

  for (const [buildingId, definition] of Object.entries(buildingDefinitions) as Array<[BuildingId, BuildingDefinition]>) {
    if (!buildingTypes.includes(buildingId)) {
      issues.push({ path: `buildingDefinitions.${buildingId}`, message: 'Building definition is missing from buildingTypes.' })
    }

    if (definition.id !== buildingId) {
      issues.push({ path: `buildingDefinitions.${buildingId}.id`, message: 'Building definition id must match its record key.' })
    }

    requirePositiveNumber(issues, `buildingDefinitions.${buildingId}.cost`, definition.cost)
    requirePositiveNumber(issues, `buildingDefinitions.${buildingId}.hp`, definition.hp)
    requireNonEmptyArray(issues, `buildingDefinitions.${buildingId}.tags`, definition.tags)
    requireNonEmptyArray(issues, `buildingDefinitions.${buildingId}.specialEffectHooks`, definition.specialEffectHooks)

    if (definition.type === 'energy') {
      requirePositiveNumber(issues, `buildingDefinitions.${buildingId}.purchasePowerPerTick`, definition.purchasePowerPerTick)
      requirePositiveNumber(issues, `buildingDefinitions.${buildingId}.productionInterval`, definition.productionInterval)
    }

    if (definition.type === 'attack') {
      requirePositiveNumber(issues, `buildingDefinitions.${buildingId}.attackPower`, definition.attackPower)
      requirePositiveNumber(issues, `buildingDefinitions.${buildingId}.attackInterval`, definition.attackInterval)
      requirePositiveNumber(issues, `buildingDefinitions.${buildingId}.attackRange`, definition.attackRange)

      if (!definition.canTargetGround && !definition.canTargetFlying) {
        issues.push({ path: `buildingDefinitions.${buildingId}`, message: 'Attack buildings must target at least one enemy movement type.' })
      }
    }

    if (definition.type === 'defense' && !definition.canBlockGround) {
      issues.push({ path: `buildingDefinitions.${buildingId}.canBlockGround`, message: 'Defense buildings should block ground enemies.' })
    }

    if (definition.upgrade) {
      requirePositiveNumber(issues, `buildingDefinitions.${buildingId}.upgrade.cost`, definition.upgrade.cost)
    }
  }
}

function validateEnemies(issues: ContentValidationIssue[]) {
  validateUniqueIds(issues, 'enemyTypes', enemyTypes)

  for (const [enemyId, definition] of Object.entries(enemyDefinitions) as Array<[EnemyId, EnemyDefinition]>) {
    if (!enemyTypes.includes(enemyId)) {
      issues.push({ path: `enemyDefinitions.${enemyId}`, message: 'Enemy definition is missing from enemyTypes.' })
    }

    if (definition.id !== enemyId) {
      issues.push({ path: `enemyDefinitions.${enemyId}.id`, message: 'Enemy definition id must match its record key.' })
    }

    requirePositiveNumber(issues, `enemyDefinitions.${enemyId}.hp`, definition.hp)
    requirePositiveNumber(issues, `enemyDefinitions.${enemyId}.speed`, definition.speed)
    requirePositiveNumber(issues, `enemyDefinitions.${enemyId}.baseDamage`, definition.baseDamage)
    requireNonNegativeNumber(issues, `enemyDefinitions.${enemyId}.buildingDamage`, definition.buildingDamage)
    requireNonNegativeNumber(issues, `enemyDefinitions.${enemyId}.attackInterval`, definition.attackInterval)
    requireNonEmptyArray(issues, `enemyDefinitions.${enemyId}.tags`, definition.tags)
    requireNonEmptyArray(issues, `enemyDefinitions.${enemyId}.counterBy`, definition.counterBy)

    if (definition.buildingDamage > 0) {
      requirePositiveNumber(issues, `enemyDefinitions.${enemyId}.attackInterval`, definition.attackInterval)
    }

    if (definition.flying && definition.blockable) {
      issues.push({ path: `enemyDefinitions.${enemyId}.blockable`, message: 'Flying enemies should not be blockable.' })
    }
  }
}

function validateStrategyCards(issues: ContentValidationIssue[]) {
  validateUniqueIds(issues, 'strategyCardIds', strategyCardIds)

  for (const [cardId, definition] of Object.entries(strategyCardDefinitions) as Array<[StrategyCardId, StrategyCardDefinition]>) {
    if (!strategyCardIds.includes(cardId)) {
      issues.push({ path: `strategyCardDefinitions.${cardId}`, message: 'Strategy card definition is missing from strategyCardIds.' })
    }

    if (definition.id !== cardId) {
      issues.push({ path: `strategyCardDefinitions.${cardId}.id`, message: 'Strategy card id must match its record key.' })
    }

    requireNonEmptyArray(issues, `strategyCardDefinitions.${cardId}.tags`, definition.tags)
    requireNonEmptyArray(issues, `strategyCardDefinitions.${cardId}.synergy`, definition.synergy)
    requireNonEmptyString(issues, `strategyCardDefinitions.${cardId}.description`, definition.description)
    requireNonEmptyString(issues, `strategyCardDefinitions.${cardId}.recommendReason`, definition.recommendReason)
    requireNonEmptyString(issues, `strategyCardDefinitions.${cardId}.effect.kind`, definition.effect.kind)

    for (const [pressureTag, score] of Object.entries(definition.solves)) {
      if (typeof score !== 'number' || score <= 0 || score > 1) {
        issues.push({ path: `strategyCardDefinitions.${cardId}.solves.${pressureTag}`, message: 'Solve score must be greater than 0 and no more than 1.' })
      }
    }
  }
}

function validateWaves(issues: ContentValidationIssue[]) {
  const wavesToValidate: readonly VolcanoWaveDefinition[] = volcanoWaves

  if (wavesToValidate.length === 0) {
    issues.push({ path: 'volcanoWaves', message: 'At least one wave is required.' })
  }

  wavesToValidate.forEach((wave, waveIndex) => {
    if (wave.mapId !== volcanoMap.id) {
      issues.push({ path: `volcanoWaves.${waveIndex}.mapId`, message: `Unknown map "${wave.mapId}".` })
    }

    if (wave.index !== waveIndex + 1) {
      issues.push({ path: `volcanoWaves.${waveIndex}.index`, message: 'Wave index should match its 1-based array position.' })
    }

    requirePositiveNumber(issues, `volcanoWaves.${waveIndex}.durationSeconds`, wave.durationSeconds)
    requireNonEmptyArray(issues, `volcanoWaves.${waveIndex}.enemyGroups`, wave.enemyGroups)
    requireNonEmptyString(issues, `volcanoWaves.${waveIndex}.pressureGoal`, wave.pressureGoal)
    requireNonEmptyString(issues, `volcanoWaves.${waveIndex}.nextWaveHint`, wave.nextWaveHint)

    validateWaveBoss(issues, wave, waveIndex)

    wave.enemyGroups.forEach((group, groupIndex) => {
      if (!enemyDefinitions[group.enemyId as EnemyId]) {
        issues.push({ path: `volcanoWaves.${waveIndex}.enemyGroups.${groupIndex}.enemyId`, message: `Unknown enemy "${group.enemyId}".` })
      }

      requirePositiveNumber(issues, `volcanoWaves.${waveIndex}.enemyGroups.${groupIndex}.count`, group.count)
      requireNonNegativeNumber(issues, `volcanoWaves.${waveIndex}.enemyGroups.${groupIndex}.startSecond`, group.startSecond)
      requirePositiveNumber(issues, `volcanoWaves.${waveIndex}.enemyGroups.${groupIndex}.interval`, group.interval)

      if (group.startSecond > wave.durationSeconds) {
        issues.push({ path: `volcanoWaves.${waveIndex}.enemyGroups.${groupIndex}.startSecond`, message: 'Enemy group starts after the wave ends.' })
      }
    })
  })
}

function validateWaveBoss(issues: ContentValidationIssue[], wave: VolcanoWaveDefinition, waveIndex: number) {
  if (!wave.bossId) {
    return
  }

  const boss = enemyDefinitions[wave.bossId as EnemyId]
  if (!boss) {
    issues.push({ path: `volcanoWaves.${waveIndex}.bossId`, message: `Unknown boss enemy "${wave.bossId}".` })
    return
  }

  if (boss.role !== 'boss') {
    issues.push({ path: `volcanoWaves.${waveIndex}.bossId`, message: 'Wave bossId must reference a boss enemy.' })
  }
}

function validateDirectorRules(issues: ContentValidationIssue[]) {
  directorRules.forEach((rule: DirectorRuleDef, ruleIndex: number) => {
    requireNonEmptyString(issues, `directorRules.${ruleIndex}.id`, rule.id)
    requireNonEmptyString(issues, `directorRules.${ruleIndex}.playerState`, rule.playerState)
    requireNonEmptyString(issues, `directorRules.${ruleIndex}.allowedAdjustment`, rule.allowedAdjustment)
    requireNonEmptyString(issues, `directorRules.${ruleIndex}.limits`, rule.limits)
    requireNonEmptyArray(issues, `directorRules.${ruleIndex}.reasonTags`, rule.reasonTags)
  })
}

function validateUniqueIds(issues: ContentValidationIssue[], path: string, ids: readonly string[]) {
  const seen = new Set<string>()

  ids.forEach((id, index) => {
    if (seen.has(id)) {
      issues.push({ path: `${path}.${index}`, message: `Duplicate id "${id}".` })
    }

    seen.add(id)
  })
}

function requirePositiveNumber(issues: ContentValidationIssue[], path: string, value: number | undefined) {
  if (typeof value !== 'number' || value <= 0) {
    issues.push({ path, message: 'Value must be a positive number.' })
  }
}

function requireNonNegativeNumber(issues: ContentValidationIssue[], path: string, value: number | undefined) {
  if (typeof value !== 'number' || value < 0) {
    issues.push({ path, message: 'Value must be zero or a positive number.' })
  }
}

function requireNonEmptyString(issues: ContentValidationIssue[], path: string, value: string | undefined) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    issues.push({ path, message: 'Value must be a non-empty string.' })
  }
}

function requireNonEmptyArray(issues: ContentValidationIssue[], path: string, value: readonly unknown[] | undefined) {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push({ path, message: 'Value must be a non-empty array.' })
  }
}
