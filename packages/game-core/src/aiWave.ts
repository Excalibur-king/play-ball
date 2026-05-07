import { getLevelEnemyDefinitions, type EnemyDefinition, type EnemyId, type VolcanoWaveDefinition } from '@tower-rogue/game-content'
import type {
  AiWaveCadence,
  AiWaveCompiledGroup,
  AiWaveCompiledPlan,
  AiWavePlan,
  AiWaveRole,
  DirectorPreviewText,
  GameState
} from './types.js'

type AiWaveCompileContext = {
  levelId: GameState['levelId']
  targetWaveIndex: number
  nextWave: VolcanoWaveDefinition
  baseWaveCost: number
  bossId?: string
  costEnvelope?: [number, number]
  excludeBoss?: boolean
  maxPhaseCount?: number
}

const cadenceIntervalMultiplier: Record<AiWaveCadence, number> = {
  sparse: 1.2,
  steady: 1,
  dense: 0.85
}

const baseIntervalByRole: Record<AiWaveRole, number> = {
  normal: 2.4,
  fast: 1.9,
  heavyAttack: 4.8,
  flying: 4.2
}

const roleToEnemyRole = {
  normal: 'normal',
  fast: 'fast',
  heavyAttack: 'heavy_attack',
  flying: 'flying'
} as const satisfies Record<AiWaveRole, EnemyDefinition['role']>

export function compileAiWavePlan(plan: AiWavePlan, context: AiWaveCompileContext): AiWaveCompiledPlan {
  if (plan.phases.length === 0) {
    throw new Error('AiWavePlan must contain at least one phase.')
  }

  const maxPhaseCount = context.maxPhaseCount ?? 4

  if (plan.phases.length > maxPhaseCount) {
    throw new Error(`AiWavePlan phases cannot exceed ${maxPhaseCount}.`)
  }

  const nextWaveNumber = context.nextWave.index
  const expectedBossId = context.excludeBoss ? undefined : context.bossId ?? context.nextWave.bossId
  const enemyDefinitions = getLevelEnemyDefinitions(context.levelId)
  const normalizedPhases = [...plan.phases]
    .map((phase) => ({
      ...phase,
      startSecond: roundToTenth(phase.startSecond),
      directives: [...phase.directives]
    }))
    .sort((left, right) => left.startSecond - right.startSecond)

  const compiledGroups: AiWaveCompiledGroup[] = []

  for (const phase of normalizedPhases) {
    if (phase.directives.length === 0) {
      throw new Error(`AiWavePlan phase "${phase.label}" must contain directives.`)
    }

    if (phase.startSecond < 0 || phase.startSecond >= context.nextWave.durationSeconds) {
      throw new Error(`AiWavePlan phase "${phase.label}" starts outside the wave duration.`)
    }

    for (const directive of phase.directives) {
      const startSecond = roundToTenth(phase.startSecond + (directive.startOffset ?? 0))

      if (startSecond < 0 || startSecond >= context.nextWave.durationSeconds) {
        throw new Error(`AiWavePlan directive in phase "${phase.label}" starts outside the wave duration.`)
      }

      const enemy =
        directive.kind === 'role'
          ? pickEarliestUnlockedEnemyForRole(directive.role, nextWaveNumber, enemyDefinitions)
          : findEnemyDefinition(directive.enemyId, enemyDefinitions)

      if (!enemy) {
        throw new Error(
          directive.kind === 'role'
            ? `AiWavePlan role "${directive.role}" has no unlocked enemy for wave ${nextWaveNumber}.`
            : `AiWavePlan enemy "${directive.enemyId}" does not exist in this level.`
        )
      }

      if (enemy.firstWave > nextWaveNumber) {
        throw new Error(`AiWavePlan enemy "${enemy.id}" is not unlocked for wave ${nextWaveNumber}.`)
      }

      if (!expectedBossId && enemy.role === 'boss') {
        throw new Error('AiWavePlan cannot include boss enemies on a non-boss wave.')
      }

      const cadence = directive.cadence
      const roleKey = enemyRoleToAiWaveRole(enemy.role)
      const baseInterval = baseIntervalByRole[roleKey] ?? baseIntervalByRole.normal
      const cadenceMultiplier = cadenceIntervalMultiplier[cadence] ?? 1
      const interval = roundToTenth(baseInterval * cadenceMultiplier)
      const count =
        directive.kind === 'role' ? Math.floor(directive.budgetUnits / enemy.directorCost) : directive.count

      if (count <= 0) {
        throw new Error(`AiWavePlan directive in phase "${phase.label}" compiles to zero enemies.`)
      }

      compiledGroups.push({
        enemyId: enemy.id as EnemyId,
        count,
        route: directive.route,
        startSecond,
        interval
      })
    }
  }

  const compiledPhases = normalizedPhases.map((phase, index) => ({
    id: `${context.nextWave.id}_ai_phase_${String(index + 1).padStart(2, '0')}`,
    label: phase.label,
    description: phase.description,
    startSecond: phase.startSecond,
    endSecond: roundToTenth(normalizedPhases[index + 1]?.startSecond ?? context.nextWave.durationSeconds)
  }))

  const bossGroups = compiledGroups.filter((group) => findEnemyDefinition(group.enemyId, enemyDefinitions)?.role === 'boss')

  if (expectedBossId) {
    const expectedBossCount = compiledGroups
      .filter((group) => group.enemyId === expectedBossId)
      .reduce((sum, group) => sum + group.count, 0)

    if (bossGroups.some((group) => group.enemyId !== expectedBossId)) {
      throw new Error(`AiWavePlan can only include the authored boss "${expectedBossId}" on this wave.`)
    }

    if (expectedBossCount !== 1) {
      throw new Error(`AiWavePlan boss wave must include exactly one "${expectedBossId}".`)
    }
  } else if (bossGroups.length > 0) {
    throw new Error('AiWavePlan cannot include boss groups on a non-boss wave.')
  }

  const totalCost = calculateGroupDirectorCost(compiledGroups, enemyDefinitions)
  const [minCost, maxCost] = context.costEnvelope ?? [roundToTenth(context.baseWaveCost * 0.9), roundToTenth(context.baseWaveCost * 1.1)]

  if (totalCost < minCost || totalCost > maxCost) {
    throw new Error(`AiWavePlan compiled cost ${totalCost} is outside the allowed envelope [${minCost}, ${maxCost}].`)
  }

  return {
    targetWaveIndex: context.targetWaveIndex,
    pressureGoal: plan.pressureGoal,
    nextWaveHint: plan.nextWaveHint,
    phases: compiledPhases,
    groups: compiledGroups
      .map((group, index) => ({ group, index }))
      .sort((left, right) => left.group.startSecond - right.group.startSecond || left.index - right.index)
      .map(({ group }) => group),
    preview: buildAiWavePreview({
      compiledGroups,
      enemyDefinitions,
      phaseCount: compiledPhases.length,
      titleSeed: compiledPhases[0]?.label ?? plan.pressureGoal,
      subtitle: plan.nextWaveHint,
      totalCost,
      baseWaveCost: context.baseWaveCost,
      hasBoss: Boolean(expectedBossId)
    }),
    source: 'ai-wave-director'
  }
}

export function calculateWaveDirectorCost(
  wave: VolcanoWaveDefinition,
  enemyDefinitions: ReturnType<typeof getLevelEnemyDefinitions>
) {
  return roundToTenth(
    wave.enemyGroups.reduce(
      (sum, group) => sum + (findEnemyDefinition(group.enemyId, enemyDefinitions)?.directorCost ?? 0) * group.count,
      0
    )
  )
}

function calculateGroupDirectorCost(
  groups: AiWaveCompiledGroup[],
  enemyDefinitions: ReturnType<typeof getLevelEnemyDefinitions>
) {
  return roundToTenth(
    groups.reduce((sum, group) => sum + (findEnemyDefinition(group.enemyId, enemyDefinitions)?.directorCost ?? 0) * group.count, 0)
  )
}

function pickEarliestUnlockedEnemyForRole(
  role: AiWaveRole,
  waveNumber: number,
  enemyDefinitions: ReturnType<typeof getLevelEnemyDefinitions>
) {
  const expectedRole = roleToEnemyRole[role] ?? roleToEnemyRole.normal

  return Object.values(enemyDefinitions)
    .filter((enemy) => enemy.role === expectedRole && enemy.firstWave <= waveNumber)
    .sort((left, right) => left.firstWave - right.firstWave || left.directorCost - right.directorCost)[0]
}

function findEnemyDefinition(
  enemyId: string,
  enemyDefinitions: ReturnType<typeof getLevelEnemyDefinitions>
) {
  return Object.values(enemyDefinitions).find((enemy) => enemy.id === enemyId)
}

function enemyRoleToAiWaveRole(role: EnemyDefinition['role']): AiWaveRole {
  switch (role) {
    case 'fast':
      return 'fast'
    case 'heavy_attack':
      return 'heavyAttack'
    case 'flying':
      return 'flying'
    case 'normal':
    case 'boss':
    default:
      return 'normal'
  }
}

function buildAiWavePreview(input: {
  compiledGroups: AiWaveCompiledGroup[]
  enemyDefinitions: ReturnType<typeof getLevelEnemyDefinitions>
  phaseCount: number
  titleSeed: string
  subtitle: string
  totalCost: number
  baseWaveCost: number
  hasBoss: boolean
}): DirectorPreviewText {
  const { compiledGroups, enemyDefinitions, phaseCount, titleSeed, subtitle, totalCost, baseWaveCost, hasBoss } = input
  const routeTag = describeRoutes(compiledGroups)
  const roleTag = describeDominantRole(compiledGroups, enemyDefinitions)
  const tags = [routeTag, roleTag, `${phaseCount}段`]
  const pressureRatio = baseWaveCost <= 0 ? 1 : totalCost / baseWaveCost
  let pressureScore = pressureRatio

  if (compiledGroups.some((group) => findEnemyDefinition(group.enemyId, enemyDefinitions)?.role === 'heavy_attack')) {
    pressureScore += 0.04
  }

  if (compiledGroups.some((group) => findEnemyDefinition(group.enemyId, enemyDefinitions)?.role === 'flying')) {
    pressureScore += 0.03
  }

  if (new Set(compiledGroups.map((group) => group.route)).size > 1) {
    pressureScore += 0.04
  }

  if (phaseCount >= 3) {
    pressureScore += 0.03
  }

  if (hasBoss) {
    pressureScore += 0.18
  }

  return {
    title: phaseCount > 1 ? `${titleSeed} · ${phaseCount}段推进` : titleSeed,
    subtitle,
    tags,
    threatLevel:
      pressureScore >= 1.18 ? 'critical' : pressureScore >= 1 ? 'high' : pressureScore >= 0.88 ? 'medium' : 'low'
  }
}

function describeRoutes(groups: AiWaveCompiledGroup[]) {
  const routes = [...new Set(groups.map((group) => group.route))]

  if (routes.includes('mixed') || routes.length >= 3) {
    return '多线'
  }

  if (routes.length === 2) {
    return `${routes.map(routeName).join('')}双路`
  }

  return `${routeName(routes[0] ?? 'center')}路`
}

function describeDominantRole(
  groups: AiWaveCompiledGroup[],
  enemyDefinitions: ReturnType<typeof getLevelEnemyDefinitions>
) {
  const counts = {
    normal: 0,
    fast: 0,
    heavyAttack: 0,
    flying: 0
  }

  for (const group of groups) {
    const role = enemyRoleToAiWaveRole(findEnemyDefinition(group.enemyId, enemyDefinitions)?.role ?? 'normal')
    counts[role] = (counts[role] ?? 0) + group.count
  }

  const dominant = (Object.entries(counts) as Array<[AiWaveRole, number]>)
    .sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'normal'

  switch (dominant) {
    case 'fast':
      return '高速'
    case 'heavyAttack':
      return '重攻'
    case 'flying':
      return '飞行'
    case 'normal':
    default:
      return '常规'
  }
}

function routeName(route: AiWaveCompiledGroup['route']) {
  if (route === 'left') return '左'
  if (route === 'right') return '右'
  return '中'
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10
}

export type { AiWaveCompileContext }
