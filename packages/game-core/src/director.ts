import { getLevelEnemyDefinitions, getLevelWaveDefinitions } from '@tower-rogue/game-content'
import type { EnemyDefinition, EnemyId, VolcanoWaveDefinition } from '@tower-rogue/game-content'
import type {
  BattleSnapshot,
  DirectorDecisionParams,
  DirectorHistoryEntry,
  DirectorIntent,
  DirectorPreviewText,
  DirectorThreatLevel,
  EnemyDirectorAddedGroup,
  EnemyDirectorPlan,
  GameState,
  HiddenDirectorAdjustment,
  LanePressure
} from './types'

type DirectorRoleKey = keyof DirectorDecisionParams['roleWeights']
type DirectorRoute = DirectorDecisionParams['primaryRoute']
type DirectorPurchase = {
  roleKey: DirectorRoleKey
  enemyId: EnemyId
  cost: number
  weight: number
  count: number
}

const rolePriority: Record<DirectorRoleKey, number> = {
  fast: 0,
  heavyAttack: 1,
  flying: 2,
  normal: 3
}

const roleToEnemyRole = {
  normal: 'normal',
  fast: 'fast',
  heavyAttack: 'heavy_attack',
  flying: 'flying'
} as const satisfies Record<DirectorRoleKey, EnemyDefinition['role']>

const baseIntervalByRole: Record<DirectorRoleKey, number> = {
  normal: 2.4,
  fast: 1.9,
  heavyAttack: 4.8,
  flying: 4.2
}

const baseStartSecondByTiming = {
  frontload: 4,
  steady: 8,
  backload: 14
} as const satisfies Record<DirectorDecisionParams['timingStyle'], number>

const groupStepByTiming = {
  frontload: 2.2,
  steady: 3.6,
  backload: 4.6
} as const satisfies Record<DirectorDecisionParams['timingStyle'], number>

const reasonTagsByIntent: Record<DirectorIntent, string[]> = {
  relief: ['base_danger'],
  probe_fast: ['fast_pressure_high'],
  probe_anti_air: ['flying_pressure_high'],
  pressure_economy: ['building_break_high', 'energy_heavy'],
  split_pressure: ['coverage_low'],
  boss_setup: ['boss_incoming']
}

// The hidden director can tune pacing, but hard clamps keep it from silently
// rewriting balance or creating impossible waves.
export function clampDirectorAdjustment(adjustment: HiddenDirectorAdjustment): HiddenDirectorAdjustment {
  return {
    spawnIntervalMultiplier: clamp(adjustment.spawnIntervalMultiplier, 0.75, 1.25),
    zombieHpMultiplier: clamp(adjustment.zombieHpMultiplier, 0.85, 1.2),
    sunDripMultiplier: clamp(adjustment.sunDripMultiplier, 0.85, 1.25)
  }
}

export function createDirectorPlan(state: GameState, snapshot: BattleSnapshot): EnemyDirectorPlan | undefined {
  const nextWave = getLevelWaveDefinitions(state.levelId)[state.waveIndex + 1]

  if (!nextWave?.aiDirectorAllowed) {
    return undefined
  }

  const params = createDirectorDecisionParams({
    snapshot,
    lastDirectorReasonTag: state.lastDirectorReasonTag,
    nextWave,
    recentDirectorHistory: state.recentDirectorHistory
  })

  if (!params) {
    return undefined
  }

  const plan = buildDirectorPlanFromParams({
    levelId: state.levelId,
    targetWaveIndex: state.waveIndex + 1,
    snapshot,
    nextWave,
    params
  })

  if (plan.addedGroups.length === 0 && plan.removedEnemyCount === 0) {
    return undefined
  }

  state.lastDirectorReasonTag = plan.reasonTags[0]
  return plan
}

export function createDirectorDecisionParams(input: {
  snapshot: BattleSnapshot
  lastDirectorReasonTag?: string
  nextWave?: VolcanoWaveDefinition
  recentDirectorHistory?: DirectorHistoryEntry[]
}): DirectorDecisionParams | undefined {
  const { snapshot, lastDirectorReasonTag, nextWave, recentDirectorHistory = [] } = input
  const primaryPressureRoute = pickPressureRoute(snapshot.lanePressure)
  const secondaryPressureRoute = pickSecondaryPressureRoute(snapshot.lanePressure, primaryPressureRoute)
  const economyRoute = pickEconomyRoute(snapshot.lanePressure) ?? primaryPressureRoute
  const policy = normalizeDirectorPolicy(nextWave?.directorPolicy, snapshot.nextWavePreview.hasBoss)
  const recentEntry = recentDirectorHistory[recentDirectorHistory.length - 1]
  const candidates = createDirectorDecisionCandidates({
    snapshot,
    lastDirectorReasonTag,
    primaryPressureRoute,
    secondaryPressureRoute,
    economyRoute,
    policy
  })

  return pickDirectorDecisionCandidate({
    candidates,
    policy,
    recentEntry,
    primaryPressureRoute,
    secondaryPressureRoute,
    economyRoute,
    snapshot
  })
}

export function buildDirectorPlanFromParams(input: {
  levelId: GameState['levelId']
  targetWaveIndex: number
  snapshot: BattleSnapshot
  nextWave: VolcanoWaveDefinition
  params: DirectorDecisionParams
}): EnemyDirectorPlan {
  const params = sanitizeDirectorParams(input.params)
  const levelEnemyDefinitions = getLevelEnemyDefinitions(input.levelId)
  const reserve = Math.max(0, input.nextWave.directorReserveBudget)
  const spendCap = roundToTenth(reserve * params.spendRatio)
  const purchases = allocateDirectorPurchases(params, spendCap, input.nextWave.index, levelEnemyDefinitions)
  const addedGroups = buildAddedGroupsFromPurchases(purchases, params, input.nextWave)
  const removedEnemyCount = params.intent === 'relief' ? countReliefRemovals(input.nextWave) : 0
  const spent = roundToTenth(
    addedGroups.reduce((sum, group) => sum + levelEnemyDefinitions[group.enemyId].directorCost * group.count, 0)
  )

  return {
    targetWaveIndex: input.targetWaveIndex,
    intent: params.intent,
    params,
    budget: {
      reserve,
      spendCap,
      spent
    },
    addedGroups,
    removedEnemyCount,
    reasonTags: [...reasonTagsByIntent[params.intent]],
    preview: buildDirectorPreviewText(params, input.snapshot)
  }
}

export function buildDirectorPreviewText(params: DirectorDecisionParams, snapshot: BattleSnapshot): DirectorPreviewText {
  const routeDescriptor = describePreviewRoute(params)
  const timingTag = getTimingTag(params.timingStyle)
  const focusTag = getFocusTag(params.intent, params.roleWeights)

  return {
    title: buildPreviewTitle(params.intent, routeDescriptor.titleLabel),
    subtitle: buildPreviewSubtitle(params, snapshot),
    tags: [routeDescriptor.tagLabel, focusTag, timingTag],
    threatLevel: buildThreatLevel(params, snapshot)
  }
}

function sanitizeDirectorParams(params: DirectorDecisionParams): DirectorDecisionParams {
  return {
    ...params,
    aggression: clamp(params.aggression, 0, 1),
    spendRatio: clamp(params.spendRatio, 0, 1),
    roleWeights: {
      normal: Math.max(0, params.roleWeights.normal),
      fast: Math.max(0, params.roleWeights.fast),
      heavyAttack: Math.max(0, params.roleWeights.heavyAttack),
      flying: Math.max(0, params.roleWeights.flying)
    }
  }
}

function createDirectorDecisionCandidates(input: {
  snapshot: BattleSnapshot
  lastDirectorReasonTag?: string
  primaryPressureRoute: Exclude<DirectorRoute, 'mixed'>
  secondaryPressureRoute?: Exclude<DirectorRoute, 'mixed'>
  economyRoute: Exclude<DirectorRoute, 'mixed'>
  policy: NormalizedDirectorPolicy
}) {
  const { snapshot, lastDirectorReasonTag, primaryPressureRoute, secondaryPressureRoute, economyRoute, policy } = input
  const candidates: DirectorDecisionCandidate[] = []

  if (snapshot.baseHp <= 3 && lastDirectorReasonTag !== 'base_danger') {
    candidates.push(createDirectorCandidate('relief', 0, {
      intent: 'relief',
      aggression: 0.2,
      primaryRoute: primaryPressureRoute,
      roleWeights: createRoleWeights({ normal: 1 }),
      spendRatio: 0,
      timingStyle: 'backload'
    }))
  }

  if (snapshot.nextWavePreview.hasBoss && snapshot.outputProfile.blockCapacity < 260 && lastDirectorReasonTag !== 'boss_incoming') {
    candidates.push(createDirectorCandidate('boss_setup', 10, {
      intent: 'boss_setup',
      aggression: 0.82,
      primaryRoute: primaryPressureRoute,
      roleWeights: createRoleWeights({ heavyAttack: 0.7, fast: 0.5, normal: 0.25 }),
      spendRatio: 0.85,
      timingStyle: 'backload'
    }))
  }

  if (snapshot.baseHp >= 8 && snapshot.leaksLastWave === 0 && lastDirectorReasonTag !== 'fast_pressure_high') {
    candidates.push(createDirectorCandidate('probe_fast', 20, {
      intent: 'probe_fast',
      aggression: 0.8,
      primaryRoute: primaryPressureRoute,
      roleWeights: createRoleWeights({ fast: 1, normal: 0.35 }),
      spendRatio: 0.75,
      timingStyle: 'frontload'
    }))
  }

  if (snapshot.buildingCounts.energy >= 3 && lastDirectorReasonTag !== 'building_break_high') {
    candidates.push(createDirectorCandidate('pressure_economy', 30, {
      intent: 'pressure_economy',
      aggression: 0.7,
      primaryRoute: economyRoute,
      roleWeights: createRoleWeights({ heavyAttack: 1, normal: 0.25 }),
      spendRatio: 0.7,
      timingStyle: 'steady'
    }))
  }

  if (
    snapshot.nextWavePreview.flying > 0 &&
    snapshot.outputProfile.flyingDamage < 55 &&
    lastDirectorReasonTag !== 'flying_pressure_high'
  ) {
    candidates.push(createDirectorCandidate('probe_anti_air', 40, {
      intent: 'probe_anti_air',
      aggression: 0.76,
      primaryRoute: primaryPressureRoute,
      roleWeights: createRoleWeights({ flying: 1, normal: 0.2 }),
      spendRatio: 0.8,
      timingStyle: 'steady'
    }))
  }

  if (secondaryPressureRoute && shouldSplitPressure(snapshot.lanePressure) && lastDirectorReasonTag !== 'coverage_low') {
    candidates.push(createDirectorCandidate('split_pressure', 50, {
      intent: 'split_pressure',
      aggression: 0.66,
      primaryRoute: primaryPressureRoute,
      secondaryRoute: secondaryPressureRoute,
      roleWeights: createRoleWeights({ fast: 0.7, normal: 0.4 }),
      spendRatio: 0.75,
      timingStyle: 'steady'
    }))
  }

  if (policy.hasExplicitIntentPolicy) {
    const seededCandidates = createPolicySeedCandidates({
      snapshot,
      primaryPressureRoute,
      secondaryPressureRoute,
      economyRoute,
      policy
    })

    for (const candidate of seededCandidates) {
      if (!candidates.some((existing) => existing.intent === candidate.intent)) {
        candidates.push(candidate)
      }
    }
  }

  return candidates
}

type DirectorDecisionCandidate = {
  intent: DirectorIntent
  priority: number
  params: DirectorDecisionParams
}

type NormalizedDirectorPolicy = {
  allowedIntents: DirectorIntent[]
  preferredIntents: DirectorIntent[]
  hasExplicitIntentPolicy: boolean
  maxSpendRatio?: number
}

function createDirectorCandidate(intent: DirectorIntent, priority: number, params: DirectorDecisionParams): DirectorDecisionCandidate {
  return {
    intent,
    priority,
    params
  }
}

function pickDirectorDecisionCandidate(input: {
  candidates: DirectorDecisionCandidate[]
  policy: NormalizedDirectorPolicy
  recentEntry: DirectorHistoryEntry | undefined
  primaryPressureRoute: Exclude<DirectorRoute, 'mixed'>
  secondaryPressureRoute?: Exclude<DirectorRoute, 'mixed'>
  economyRoute: Exclude<DirectorRoute, 'mixed'>
  snapshot: BattleSnapshot
}) {
  const { candidates, policy, recentEntry } = input
  const preferredIntents = new Set(policy.preferredIntents)

  const ranked = candidates
    .filter((candidate) => policy.allowedIntents.includes(candidate.intent))
    .map((candidate) => ({
      ...candidate,
      params: applyDirectorPolicyToParams(candidate.params, policy),
      score:
        candidate.priority +
        (recentEntry?.intent === candidate.intent ? 18 : 0) +
        (recentEntry?.primaryRoute === candidate.params.primaryRoute ? 4 : 0) -
        (preferredIntents.has(candidate.intent) ? 5 : 0)
    }))
    .sort((left, right) => left.score - right.score || left.priority - right.priority)

  return ranked[0]?.params
}

function createPolicySeedCandidates(input: {
  snapshot: BattleSnapshot
  primaryPressureRoute: Exclude<DirectorRoute, 'mixed'>
  secondaryPressureRoute?: Exclude<DirectorRoute, 'mixed'>
  economyRoute: Exclude<DirectorRoute, 'mixed'>
  policy: NormalizedDirectorPolicy
}) {
  const { snapshot, primaryPressureRoute, secondaryPressureRoute, economyRoute, policy } = input
  const intents = policy.preferredIntents.length > 0 ? policy.preferredIntents : policy.allowedIntents

  return intents
    .map((intent) => {
      switch (intent) {
        case 'relief':
          return createDirectorCandidate('relief', 4, {
            intent: 'relief',
            aggression: 0.24,
            primaryRoute: primaryPressureRoute,
            roleWeights: createRoleWeights({ normal: 1 }),
            spendRatio: 0,
            timingStyle: 'backload'
          })
        case 'probe_fast':
          return createDirectorCandidate('probe_fast', 24, {
            intent: 'probe_fast',
            aggression: 0.72,
            primaryRoute: primaryPressureRoute,
            roleWeights: createRoleWeights({ fast: 1, normal: 0.3 }),
            spendRatio: 0.68,
            timingStyle: 'frontload'
          })
        case 'probe_anti_air':
          return createDirectorCandidate('probe_anti_air', 44, {
            intent: 'probe_anti_air',
            aggression: 0.72,
            primaryRoute: primaryPressureRoute,
            roleWeights: createRoleWeights({ flying: 1, normal: 0.2 }),
            spendRatio: 0.72,
            timingStyle: 'steady'
          })
        case 'pressure_economy':
          return createDirectorCandidate('pressure_economy', 34, {
            intent: 'pressure_economy',
            aggression: 0.68,
            primaryRoute: economyRoute,
            roleWeights: createRoleWeights({ heavyAttack: 1, normal: 0.25 }),
            spendRatio: 0.68,
            timingStyle: 'steady'
          })
        case 'split_pressure':
          return secondaryPressureRoute
            ? createDirectorCandidate('split_pressure', 54, {
                intent: 'split_pressure',
                aggression: 0.64,
                primaryRoute: primaryPressureRoute,
                secondaryRoute: secondaryPressureRoute,
                roleWeights: createRoleWeights({ fast: 0.7, normal: 0.4 }),
                spendRatio: 0.72,
                timingStyle: 'steady'
              })
            : undefined
        case 'boss_setup':
          return snapshot.nextWavePreview.hasBoss
            ? createDirectorCandidate('boss_setup', 14, {
                intent: 'boss_setup',
                aggression: 0.8,
                primaryRoute: primaryPressureRoute,
                roleWeights: createRoleWeights({ heavyAttack: 0.7, fast: 0.5, normal: 0.25 }),
                spendRatio: 0.82,
                timingStyle: 'backload'
              })
            : undefined
      }
    })
    .filter((candidate): candidate is DirectorDecisionCandidate => candidate !== undefined)
}

function normalizeDirectorPolicy(
  policy: VolcanoWaveDefinition['directorPolicy'] | undefined,
  hasBoss: boolean
): NormalizedDirectorPolicy {
  const baseAllowed = hasBoss
    ? (['relief', 'probe_fast', 'probe_anti_air', 'pressure_economy', 'split_pressure', 'boss_setup'] as DirectorIntent[])
    : (['relief', 'probe_fast', 'probe_anti_air', 'pressure_economy', 'split_pressure'] as DirectorIntent[])
  const filteredAllowed = (policy?.allowedIntents ?? baseAllowed).filter((intent): intent is DirectorIntent =>
    baseAllowed.includes(intent as DirectorIntent)
  )
  const allowedIntents = filteredAllowed.length > 0 ? filteredAllowed : baseAllowed
  const preferredIntents = (policy?.preferredIntents ?? []).filter((intent): intent is DirectorIntent =>
    allowedIntents.includes(intent as DirectorIntent)
  )

  return {
    allowedIntents,
    preferredIntents,
    hasExplicitIntentPolicy: Boolean(policy?.allowedIntents?.length || policy?.preferredIntents?.length),
    maxSpendRatio: policy?.maxSpendRatio
  }
}

function applyDirectorPolicyToParams(params: DirectorDecisionParams, policy: NormalizedDirectorPolicy): DirectorDecisionParams {
  return {
    ...params,
    spendRatio:
      policy.maxSpendRatio === undefined ? params.spendRatio : Math.min(params.spendRatio, policy.maxSpendRatio)
  }
}

function allocateDirectorPurchases(
  params: DirectorDecisionParams,
  spendCap: number,
  waveIndex: number,
  levelEnemyDefinitions: ReturnType<typeof getLevelEnemyDefinitions>
): DirectorPurchase[] {
  const candidates = getPurchasableRoles(params, waveIndex, levelEnemyDefinitions)

  if (spendCap <= 0 || candidates.length === 0) {
    return []
  }

  let remainingBudget = spendCap
  let remainingWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0)

  for (const [index, candidate] of candidates.entries()) {
    const desiredBudget = remainingWeight > 0 ? (remainingBudget * candidate.weight) / remainingWeight : 0
    let count = Math.floor(desiredBudget / candidate.cost)

    if (count === 0 && index === 0 && remainingBudget + 1e-6 >= candidate.cost) {
      count = 1
    }

    candidate.count = count
    remainingBudget -= count * candidate.cost
    remainingWeight -= candidate.weight
  }

  const cheapestCost = Math.min(...candidates.map((candidate) => candidate.cost))

  while (remainingBudget + 1e-6 >= cheapestCost) {
    let boughtThisPass = false

    for (const candidate of candidates) {
      if (remainingBudget + 1e-6 < candidate.cost) {
        continue
      }

      candidate.count += 1
      remainingBudget -= candidate.cost
      boughtThisPass = true
    }

    if (!boughtThisPass) {
      break
    }
  }

  return candidates.filter((candidate) => candidate.count > 0)
}

function getPurchasableRoles(
  params: DirectorDecisionParams,
  waveIndex: number,
  levelEnemyDefinitions: ReturnType<typeof getLevelEnemyDefinitions>
): DirectorPurchase[] {
  return (Object.entries(params.roleWeights) as Array<[DirectorRoleKey, number]>)
    .filter(([, weight]) => weight > 0)
    .map(([roleKey, weight]) => {
      const enemy = pickEnemyForRole(roleKey, waveIndex, levelEnemyDefinitions)

      if (!enemy) {
        return undefined
      }

      return {
        roleKey,
        enemyId: enemy.id as EnemyId,
        cost: enemy.directorCost,
        weight,
        count: 0
      } satisfies DirectorPurchase
    })
    .filter((candidate): candidate is DirectorPurchase => candidate !== undefined)
    .sort((left, right) => right.weight - left.weight || rolePriority[left.roleKey] - rolePriority[right.roleKey])
}

function buildAddedGroupsFromPurchases(
  purchases: DirectorPurchase[],
  params: DirectorDecisionParams,
  nextWave: VolcanoWaveDefinition
): EnemyDirectorAddedGroup[] {
  const routes = getPlanRoutes(params)
  const groups: EnemyDirectorAddedGroup[] = []
  let groupOffset = 0

  for (const purchase of purchases) {
    const countsByRoute = splitCountAcrossRoutes(purchase.count, routes)

    for (const [routeIndex, count] of countsByRoute.entries()) {
      if (count <= 0) {
        continue
      }

      const route = routes[routeIndex] ?? params.primaryRoute

      groups.push({
        enemyId: purchase.enemyId,
        count,
        route,
        startSecond: calculateStartSecond(nextWave.durationSeconds, params.timingStyle, groupOffset, routeIndex),
        interval: calculateGroupInterval(purchase.roleKey, params.aggression)
      })

      groupOffset += 1
    }
  }

  return groups
}

function pickEnemyForRole(
  roleKey: DirectorRoleKey,
  waveIndex: number,
  levelEnemyDefinitions: ReturnType<typeof getLevelEnemyDefinitions>
): EnemyDefinition | undefined {
  const enemyRole = roleToEnemyRole[roleKey]

  return Object.values(levelEnemyDefinitions)
    .filter((enemy) => enemy.role === enemyRole && enemy.firstWave <= waveIndex)
    .sort((left, right) => left.firstWave - right.firstWave)[0]
}

function getPlanRoutes(params: DirectorDecisionParams): DirectorRoute[] {
  if (params.primaryRoute === 'mixed') {
    return ['mixed']
  }

  if (params.secondaryRoute && params.secondaryRoute !== params.primaryRoute) {
    return [params.primaryRoute, params.secondaryRoute]
  }

  return [params.primaryRoute]
}

function splitCountAcrossRoutes(count: number, routes: DirectorRoute[]) {
  if (routes.length <= 1) {
    return [count]
  }

  const distributed = routes.map(() => 0)

  for (let index = 0; index < count; index += 1) {
    const bucketIndex = index % routes.length

    if (distributed[bucketIndex] !== undefined) {
      distributed[bucketIndex] += 1
    }
  }

  return distributed
}

function calculateStartSecond(durationSeconds: number, timingStyle: DirectorDecisionParams['timingStyle'], groupOffset: number, routeIndex: number) {
  const base = baseStartSecondByTiming[timingStyle]
  const step = groupStepByTiming[timingStyle]
  const rawStart = base + groupOffset * step + routeIndex * 0.8
  return roundToTenth(Math.min(durationSeconds - 6, Math.max(2, rawStart)))
}

function calculateGroupInterval(roleKey: DirectorRoleKey, aggression: number) {
  const aggressionIntervalMultiplier = 1 - clamp(aggression, 0, 1) * 0.18
  return roundToTenth(baseIntervalByRole[roleKey] * aggressionIntervalMultiplier)
}

function countReliefRemovals(nextWave: VolcanoWaveDefinition) {
  let remaining = 2

  for (const group of nextWave.enemyGroups) {
    if (group.enemyId === nextWave.bossId) {
      continue
    }

    const removableCount = Math.max(0, group.count - 1)
    const removed = Math.min(remaining, removableCount)
    remaining -= removed

    if (remaining <= 0) {
      break
    }
  }

  return 2 - remaining
}

function pickPressureRoute(lanePressure: LanePressure[]): Exclude<DirectorRoute, 'mixed'> {
  const rankedRoutes = rankRoutesByPressure(lanePressure)
  return rankedRoutes[0]?.route ?? 'center'
}

function pickSecondaryPressureRoute(
  lanePressure: LanePressure[],
  primaryRoute: Exclude<DirectorRoute, 'mixed'>
): Exclude<DirectorRoute, 'mixed'> | undefined {
  return rankRoutesByPressure(lanePressure).find((entry) => entry.route !== primaryRoute)?.route
}

function pickEconomyRoute(lanePressure: LanePressure[]): Exclude<DirectorRoute, 'mixed'> | undefined {
  const routeEconomy = aggregateRoutePressure(lanePressure)
    .map((entry) => ({
      route: entry.route,
      economyValue: entry.lanes.reduce((sum, lane) => sum + lane.economyValue, 0)
    }))
    .sort((left, right) => right.economyValue - left.economyValue)

  const richestRoute = routeEconomy[0]
  return richestRoute && richestRoute.economyValue > 0 ? richestRoute.route : undefined
}

function shouldSplitPressure(lanePressure: LanePressure[]) {
  const rankedRoutes = rankRoutesByPressure(lanePressure)
  return (rankedRoutes[0]?.score ?? 0) >= 0.64 && (rankedRoutes[1]?.score ?? 0) >= 0.52
}

function rankRoutesByPressure(lanePressure: LanePressure[]) {
  return aggregateRoutePressure(lanePressure)
    .map((entry) => ({
      route: entry.route,
      score: roundToTenth(entry.lanes.reduce((sum, lane) => sum + lane.pressureScore, 0) / Math.max(1, entry.lanes.length))
    }))
    .sort((left, right) => right.score - left.score)
}

function aggregateRoutePressure(lanePressure: LanePressure[]) {
  return [
    { route: 'left' as const, lanes: lanePressure.filter((lane) => lane.lane <= 1) },
    { route: 'center' as const, lanes: lanePressure.filter((lane) => lane.lane === 2) },
    { route: 'right' as const, lanes: lanePressure.filter((lane) => lane.lane >= 3) }
  ]
}

function buildPreviewTitle(intent: DirectorIntent, routeLabel: string) {
  switch (intent) {
    case 'relief':
      return routeLabel === '多线' ? '敌潮暂缓' : `${routeLabel}缓压试探`
    case 'probe_fast':
      return `${routeLabel}极速试探`
    case 'probe_anti_air':
      return `${routeLabel}空袭压制`
    case 'pressure_economy':
      return `${routeLabel}后排骚扰`
    case 'split_pressure':
      return routeLabel === '多线' ? '双路分压' : `${routeLabel}分压`
    case 'boss_setup':
      return `${routeLabel}重压蓄势`
  }
}

function buildPreviewSubtitle(params: DirectorDecisionParams, snapshot: BattleSnapshot) {
  const timingLead = getTimingLead(params.timingStyle)

  switch (params.intent) {
    case 'relief':
      return snapshot.baseHp <= 3
        ? '敌潮会放慢推进，这是修补防线的窗口。'
        : '压力略降，可以补线补塔，但别只顾贪经济。'
    case 'probe_fast':
      return snapshot.outputProfile.blockCapacity < 180 || snapshot.problemTags.includes('block_capacity_low')
        ? `${timingLead}快速压线，优先补阻挡或减速。`
        : `${timingLead}用高速单位抢节奏，别让前排空线。`
    case 'probe_anti_air':
      return snapshot.outputProfile.flyingDamage < 55 || snapshot.problemTags.includes('flying_pressure_high')
        ? `${timingLead}飞行单位会持续施压，尽快补对空火力。`
        : `${timingLead}会试探你的对空覆盖，别把输出全压在地面。`
    case 'pressure_economy':
      return snapshot.buildingCounts.energy >= 3
        ? `${timingLead}更想拆后排与经济位，注意保护核心塔。`
        : `${timingLead}会针对脆弱后排施压，补一层保护更稳。`
    case 'split_pressure':
      return snapshot.outputProfile.attackCoverage <= 2
        ? `${timingLead}两路会轮流吃压，不要把火力只堆一路。`
        : `${timingLead}会拉开你的火力覆盖，准备第二防线。`
    case 'boss_setup':
      return snapshot.outputProfile.blockCapacity < 260
        ? `${timingLead}会接更重的冲击，提前补承伤和爆发。`
        : `${timingLead}在为重压铺垫，别把关键技能交得太早。`
  }
}

function buildThreatLevel(params: DirectorDecisionParams, snapshot: BattleSnapshot): DirectorThreatLevel {
  const routePressure = getPreviewRoutePressure(params, snapshot.lanePressure)
  const leakPressure = clamp(snapshot.leaksLastWave / 5, 0, 1)
  const baseScore = params.aggression * 0.38 + params.spendRatio * 0.32 + routePressure * 0.2 + leakPressure * 0.1
  let score = baseScore

  if (params.intent === 'relief') score -= 0.34
  if (params.intent === 'split_pressure') score += 0.08
  if (params.intent === 'pressure_economy') score += 0.05
  if (params.intent === 'boss_setup') score += 0.16
  if (snapshot.baseHp <= 3) score += 0.08

  score = clamp(score, 0, 1)

  if (score >= 0.82) return 'critical'
  if (score >= 0.62) return 'high'
  if (score >= 0.34) return 'medium'
  return 'low'
}

function describePreviewRoute(params: DirectorDecisionParams) {
  if (params.primaryRoute === 'mixed') {
    return {
      titleLabel: '多线',
      tagLabel: '多线'
    }
  }

  if (params.secondaryRoute && params.secondaryRoute !== params.primaryRoute) {
    return {
      titleLabel: `${routeName(params.primaryRoute)}${routeName(params.secondaryRoute)}双路`,
      tagLabel: `${routeName(params.primaryRoute)}${routeName(params.secondaryRoute)}`
    }
  }

  return {
    titleLabel: `${routeName(params.primaryRoute)}路`,
    tagLabel: `${routeName(params.primaryRoute)}路`
  }
}

function getPreviewRoutePressure(params: DirectorDecisionParams, lanePressure: LanePressure[]) {
  const routePressure = rankRoutesByPressure(lanePressure)
  const routeScores = new Map(routePressure.map((entry) => [entry.route, entry.score]))
  const routes = getPlanRoutes(params).filter((route) => route !== 'mixed')

  if (routes.length === 0) {
    return Math.max(...routePressure.map((entry) => entry.score), 0)
  }

  const score =
    routes.reduce((sum, route) => sum + (routeScores.get(route) ?? 0), 0) / Math.max(1, routes.length)

  return clamp(score, 0, 1)
}

function getTimingLead(timingStyle: DirectorDecisionParams['timingStyle']) {
  switch (timingStyle) {
    case 'frontload':
      return '前段'
    case 'steady':
      return '整波'
    case 'backload':
      return '后段'
  }
}

function getTimingTag(timingStyle: DirectorDecisionParams['timingStyle']) {
  switch (timingStyle) {
    case 'frontload':
      return '前压'
    case 'steady':
      return '持续'
    case 'backload':
      return '后压'
  }
}

function getFocusTag(
  intent: DirectorIntent,
  roleWeights: DirectorDecisionParams['roleWeights']
) {
  if (intent === 'relief') {
    return '缓压'
  }

  if (intent === 'pressure_economy') {
    return '拆塔'
  }

  if (intent === 'split_pressure') {
    return '分压'
  }

  if (intent === 'boss_setup') {
    return '重攻'
  }

  const dominantRole = getDominantRole(roleWeights)

  switch (dominantRole) {
    case 'fast':
      return '高速'
    case 'flying':
      return '飞行'
    case 'heavyAttack':
      return '重攻'
    case 'normal':
    default:
      return '常规'
  }
}

function getDominantRole(roleWeights: DirectorDecisionParams['roleWeights']): DirectorRoleKey {
  return (Object.entries(roleWeights) as Array<[DirectorRoleKey, number]>)
    .sort((left, right) => right[1] - left[1] || rolePriority[left[0]] - rolePriority[right[0]])[0]?.[0] ?? 'normal'
}

function routeName(route: Exclude<DirectorRoute, 'mixed'>) {
  if (route === 'left') return '左'
  if (route === 'center') return '中'
  return '右'
}

function createRoleWeights(overrides: Partial<DirectorDecisionParams['roleWeights']>): DirectorDecisionParams['roleWeights'] {
  return {
    normal: overrides.normal ?? 0,
    fast: overrides.fast ?? 0,
    heavyAttack: overrides.heavyAttack ?? 0,
    flying: overrides.flying ?? 0
  }
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
