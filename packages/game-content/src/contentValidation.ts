import { aiStrategy } from '../balance/aiStrategy.js'
import {
  buildingDefinitions,
  buildingTypes,
  directorRules,
  enemyBalanceProfiles,
  enemyBalanceProfileIds,
  enemyDefinitions,
  enemyTypes,
  strategyCardDefinitions,
  strategyCardIds,
  volcanoMap,
  volcanoWaves
} from './index.js'
import { gameplay } from '../balance/gameplay.js'
import type {
  BuildingDefinition,
  BuildingId,
  DirectorIntentDef,
  DirectorRuleDef,
  EnemyBalanceProfileDefinition,
  EnemyDefinition,
  EnemyId,
  StrategyCardDefinition,
  StrategyCardId,
  VolcanoWaveDefinition
} from './index.js'

export type ContentValidationIssue = {
  path: string
  message: string
}

export function validateCurrentContent(): ContentValidationIssue[] {
  const issues: ContentValidationIssue[] = []
  validateMap(issues)
  validateBuildings(issues)
  validateEnemies(issues)
  validateEnemyBalanceProfiles(issues)
  validateStrategyCards(issues)
  validateWaves(issues)
  validateDirectorRules(issues)
  validateAiStrategy(issues)
  validateGameplay(issues)
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

      if (definition.attackKind === 'projectile' || definition.attackKind === 'laser') {
        requireNonEmptyString(issues, `buildingDefinitions.${buildingId}.projectileKey`, definition.projectileKey)
      }

      if (definition.attackKind === 'laser') {
        requirePositiveNumber(issues, `buildingDefinitions.${buildingId}.charges`, definition.charges)
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
    requirePositiveNumber(issues, `enemyDefinitions.${enemyId}.directorCost`, definition.directorCost)
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

function validateEnemyBalanceProfiles(issues: ContentValidationIssue[]) {
  validateUniqueIds(issues, 'enemyBalanceProfileIds', enemyBalanceProfileIds)

  for (const [index, profile] of (enemyBalanceProfiles as readonly EnemyBalanceProfileDefinition[]).entries()) {
    requireNonEmptyString(issues, `enemyBalanceProfiles.${index}.id`, profile.id)
    requireNonEmptyString(issues, `enemyBalanceProfiles.${index}.name`, profile.name)

    validateEnemyBalanceModifier(issues, `enemyBalanceProfiles.${index}.globalModifiers`, profile.globalModifiers)

    for (const [role, modifiers] of Object.entries(profile.roleModifiers ?? {})) {
      validateEnemyBalanceModifier(issues, `enemyBalanceProfiles.${index}.roleModifiers.${role}`, modifiers)
    }

    for (const [enemyId, modifiers] of Object.entries(profile.enemyModifiers ?? {})) {
      if (!enemyDefinitions[enemyId as EnemyId]) {
        issues.push({ path: `enemyBalanceProfiles.${index}.enemyModifiers.${enemyId}`, message: 'Referenced enemy does not exist.' })
      }

      validateEnemyBalanceModifier(issues, `enemyBalanceProfiles.${index}.enemyModifiers.${enemyId}`, modifiers)
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
  const validDirectorIntents: readonly DirectorIntentDef[] = [
    'relief',
    'probe_fast',
    'probe_anti_air',
    'pressure_economy',
    'split_pressure',
    'boss_setup'
  ]

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
    requireNonNegativeNumber(issues, `volcanoWaves.${waveIndex}.directorReserveBudget`, wave.directorReserveBudget)
    requireNonEmptyArray(issues, `volcanoWaves.${waveIndex}.phases`, wave.phases)
    requireNonEmptyArray(issues, `volcanoWaves.${waveIndex}.enemyGroups`, wave.enemyGroups)
    requireNonEmptyString(issues, `volcanoWaves.${waveIndex}.pressureGoal`, wave.pressureGoal)
    requireNonEmptyString(issues, `volcanoWaves.${waveIndex}.nextWaveHint`, wave.nextWaveHint)

    validateWaveBoss(issues, wave, waveIndex)
    validateWaveDirectorPolicy(issues, wave, waveIndex, validDirectorIntents)
    validateWavePhases(issues, wave, waveIndex)

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

function validateWavePhases(issues: ContentValidationIssue[], wave: VolcanoWaveDefinition, waveIndex: number) {
  let previousStart = Number.NEGATIVE_INFINITY

  wave.phases.forEach((phase, phaseIndex) => {
    requireNonEmptyString(issues, `volcanoWaves.${waveIndex}.phases.${phaseIndex}.id`, phase.id)
    requireNonEmptyString(issues, `volcanoWaves.${waveIndex}.phases.${phaseIndex}.label`, phase.label)
    requireNonNegativeNumber(issues, `volcanoWaves.${waveIndex}.phases.${phaseIndex}.startSecond`, phase.startSecond)
    requirePositiveNumber(issues, `volcanoWaves.${waveIndex}.phases.${phaseIndex}.endSecond`, phase.endSecond)

    if (phase.startSecond < previousStart) {
      issues.push({
        path: `volcanoWaves.${waveIndex}.phases.${phaseIndex}.startSecond`,
        message: 'Wave phases must be sorted by startSecond.'
      })
    }

    if (phase.endSecond <= phase.startSecond) {
      issues.push({
        path: `volcanoWaves.${waveIndex}.phases.${phaseIndex}.endSecond`,
        message: 'Wave phase endSecond must be greater than startSecond.'
      })
    }

    if (phase.endSecond > wave.durationSeconds) {
      issues.push({
        path: `volcanoWaves.${waveIndex}.phases.${phaseIndex}.endSecond`,
        message: 'Wave phase ends after the wave ends.'
      })
    }

    previousStart = phase.startSecond
  })

  wave.enemyGroups.forEach((group, groupIndex) => {
    const containingPhase = wave.phases.find((phase, phaseIndex) => {
      const isLastPhase = phaseIndex === wave.phases.length - 1
      return group.startSecond >= phase.startSecond && (isLastPhase ? group.startSecond <= phase.endSecond : group.startSecond < phase.endSecond)
    })

    if (!containingPhase) {
      issues.push({
        path: `volcanoWaves.${waveIndex}.enemyGroups.${groupIndex}.startSecond`,
        message: 'Enemy group must belong to one authored wave phase.'
      })
    }
  })
}

function validateEnemyBalanceModifier(
  issues: ContentValidationIssue[],
  path: string,
  modifiers: EnemyBalanceProfileDefinition['globalModifiers']
) {
  if (!modifiers) {
    return
  }

  if (modifiers.hpMultiplier !== undefined) requirePositiveNumber(issues, `${path}.hpMultiplier`, modifiers.hpMultiplier)
  if (modifiers.speedMultiplier !== undefined) requirePositiveNumber(issues, `${path}.speedMultiplier`, modifiers.speedMultiplier)
  if (modifiers.buildingDamageMultiplier !== undefined) {
    requireNonNegativeNumber(issues, `${path}.buildingDamageMultiplier`, modifiers.buildingDamageMultiplier)
  }
  if (modifiers.baseDamageMultiplier !== undefined) requirePositiveNumber(issues, `${path}.baseDamageMultiplier`, modifiers.baseDamageMultiplier)
  if (modifiers.attackIntervalMultiplier !== undefined) {
    requirePositiveNumber(issues, `${path}.attackIntervalMultiplier`, modifiers.attackIntervalMultiplier)
  }
  if (modifiers.directorCostMultiplier !== undefined) {
    requirePositiveNumber(issues, `${path}.directorCostMultiplier`, modifiers.directorCostMultiplier)
  }
  if (modifiers.firstWaveOffset !== undefined && !Number.isFinite(modifiers.firstWaveOffset)) {
    issues.push({ path: `${path}.firstWaveOffset`, message: 'Modifier must be a finite number.' })
  }
}

function validateWaveDirectorPolicy(
  issues: ContentValidationIssue[],
  wave: VolcanoWaveDefinition,
  waveIndex: number,
  validDirectorIntents: readonly DirectorIntentDef[]
) {
  const policy = wave.directorPolicy

  if (!policy) {
    return
  }

  if (policy.allowedIntents) {
    requireNonEmptyArray(issues, `volcanoWaves.${waveIndex}.directorPolicy.allowedIntents`, policy.allowedIntents)

    policy.allowedIntents.forEach((intent, intentIndex) => {
      if (!validDirectorIntents.includes(intent)) {
        issues.push({
          path: `volcanoWaves.${waveIndex}.directorPolicy.allowedIntents.${intentIndex}`,
          message: `Unknown director intent "${intent}".`
        })
      }
    })
  }

  if (policy.preferredIntents) {
    requireNonEmptyArray(issues, `volcanoWaves.${waveIndex}.directorPolicy.preferredIntents`, policy.preferredIntents)

    policy.preferredIntents.forEach((intent, intentIndex) => {
      if (!validDirectorIntents.includes(intent)) {
        issues.push({
          path: `volcanoWaves.${waveIndex}.directorPolicy.preferredIntents.${intentIndex}`,
          message: `Unknown director intent "${intent}".`
        })
      }

      if (policy.allowedIntents && !policy.allowedIntents.includes(intent)) {
        issues.push({
          path: `volcanoWaves.${waveIndex}.directorPolicy.preferredIntents.${intentIndex}`,
          message: 'Preferred director intent must also be listed in allowedIntents.'
        })
      }
    })
  }

  if (policy.maxSpendRatio !== undefined) {
    requireNumberInRange(issues, `volcanoWaves.${waveIndex}.directorPolicy.maxSpendRatio`, policy.maxSpendRatio, 0, 1)
  }
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

function validateAiStrategy(issues: ContentValidationIssue[]) {
  requireNumberInRange(issues, 'aiStrategy.modelTuning.temperature', aiStrategy.modelTuning.temperature, 0, 2)
  requirePositiveNumber(issues, 'aiStrategy.modelTuning.maxTokens', aiStrategy.modelTuning.maxTokens)
  requireNonEmptyString(issues, 'aiStrategy.taskContext.activeSkill', aiStrategy.taskContext.activeSkill)
  requireNonEmptyString(issues, 'aiStrategy.taskContext.waveCleared', aiStrategy.taskContext.waveCleared)
  requireNonEmptyString(issues, 'aiStrategy.systemPrompt.role', aiStrategy.systemPrompt.role)
  requireNonEmptyString(issues, 'aiStrategy.systemPrompt.selectionTask', aiStrategy.systemPrompt.selectionTask)
  requireNonEmptyString(issues, 'aiStrategy.systemPrompt.decisionConstraint', aiStrategy.systemPrompt.decisionConstraint)
  requireNonEmptyString(issues, 'aiStrategy.systemPrompt.poolConstraint', aiStrategy.systemPrompt.poolConstraint)
  requireNonEmptyString(issues, 'aiStrategy.systemPrompt.jsonConstraint', aiStrategy.systemPrompt.jsonConstraint)
  requireNonEmptyString(issues, 'aiStrategy.systemPrompt.outputSchema', aiStrategy.systemPrompt.outputSchema)
  requireNonEmptyString(issues, 'aiStrategy.systemPrompt.slotCoverageConstraint', aiStrategy.systemPrompt.slotCoverageConstraint)
  requireNonEmptyString(issues, 'aiStrategy.systemPrompt.styleConstraint', aiStrategy.systemPrompt.styleConstraint)
  requireNonEmptyArray(issues, 'aiStrategy.promptCopy.slotRules', aiStrategy.promptCopy.slotRules)
  requireNonEmptyString(issues, 'aiStrategy.promptCopy.noProblemTagsText', aiStrategy.promptCopy.noProblemTagsText)
  requireNonEmptyString(issues, 'aiStrategy.promptCopy.language', aiStrategy.promptCopy.language)

  for (const [tag, label] of Object.entries(aiStrategy.problemTagLabels)) {
    requireNonEmptyString(issues, `aiStrategy.problemTagLabels.${tag}`, label)
  }
}

function validateGameplay(issues: ContentValidationIssue[]) {
  requirePositiveNumber(issues, 'gameplay.activeStrategyDraw.cost', gameplay.activeStrategyDraw.cost)
  requirePositiveNumber(issues, 'gameplay.activeStrategyDraw.cooldownSeconds', gameplay.activeStrategyDraw.cooldownSeconds)
  requirePositiveNumber(issues, 'gameplay.runLoop.initialReadySeconds', gameplay.runLoop.initialReadySeconds)
  requirePositiveNumber(issues, 'gameplay.runLoop.postCardReadySeconds', gameplay.runLoop.postCardReadySeconds)
  requirePositiveNumber(issues, 'gameplay.runLoop.waveCardSelectSeconds', gameplay.runLoop.waveCardSelectSeconds)
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

function requireNumberInRange(
  issues: ContentValidationIssue[],
  path: string,
  value: number | undefined,
  min: number,
  max: number
) {
  if (typeof value !== 'number' || value < min || value > max) {
    issues.push({ path, message: `Value must be a number between ${min} and ${max}.` })
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
