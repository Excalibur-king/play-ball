import { getLevelWaveDefinitions, levelIds, type LevelId } from '@tower-rogue/game-content'
import {
  DirectorDecisionParamsSchema,
  type DirectorDebugModelResponse,
  type DirectorDebugRequest,
  type DirectorParamsResponse,
  DirectorParamsResponseSchema,
  type StrategyAdviceDebugError,
  type BattleSnapshot,
  type DirectorDecisionParams,
  type DirectorHistoryEntry,
  type DirectorIntent,
  type DirectorParamsRequest,
} from '@tower-rogue/shared'
import OpenAI from 'openai'
import { setLatestDirectorDebug, updateLatestDirectorDebug } from './directorDebug.js'

const DEFAULT_DEEPSEEK_API_KEY = 'sk-deepseek-default-placeholder'
const DIRECTOR_MODEL_TEMPERATURE = 0.2
const DIRECTOR_MODEL_MAX_TOKENS = 500

export async function generateDirectorParams(request: DirectorParamsRequest): Promise<DirectorParamsResponse> {
  const startedAt = Date.now()
  const levelId = resolveLevelId(request.levelId)

  if (!levelId) {
    throw new Error(`Unknown levelId "${request.levelId}"`)
  }

  const nextWave = getLevelWaveDefinitions(levelId)[request.snapshot.wave]

  const env = getDeepSeekEnv()
  const fallbackParams =
    createFallbackDirectorDecisionParams({
      snapshot: request.snapshot,
      lastDirectorReasonTag: request.lastDirectorReasonTag ?? undefined,
      nextWave,
      recentDirectorHistory: request.recentDirectorHistory ?? []
    }) ?? null

  const promptPayload = buildDirectorPromptPayload({
    request,
    nextWave
  })
  const messages = [
    {
      role: 'system' as const,
      content: buildDirectorSystemPrompt()
    },
    {
      role: 'user' as const,
      content: JSON.stringify(promptPayload, null, 2)
    }
  ]
  const requestDebug: DirectorDebugRequest = {
    createdAt: new Date().toISOString(),
    model: env.model,
    baseUrl: env.baseUrl,
    timeoutMs: env.timeoutMs,
    levelId: request.levelId,
    wave: request.snapshot.wave,
    apiRequest: request,
    promptPayload,
    messages
  }

  setLatestDirectorDebug({
    updatedAt: requestDebug.createdAt,
    request: requestDebug,
    rawResponse: null,
    parsedResponse: null,
    finalResponse: null,
    resultSource: 'none',
    error: null,
    durationMs: null,
    usedFallback: false,
    fallbackReason: null
  })

  if (!nextWave?.aiDirectorAllowed) {
    updateLatestDirectorDebug((current) =>
      current
        ? {
            ...current,
            updatedAt: new Date().toISOString(),
            finalResponse: null,
            resultSource: 'none',
            durationMs: Date.now() - startedAt,
            usedFallback: true,
            fallbackReason: 'Director disabled for the next wave.'
          }
        : current
    )
    return DirectorParamsResponseSchema.parse(null)
  }

  if (env.apiKey === DEFAULT_DEEPSEEK_API_KEY) {
    updateLatestDirectorDebug((current) =>
      current
        ? {
            ...current,
            updatedAt: new Date().toISOString(),
            finalResponse: fallbackParams,
            resultSource: fallbackParams ? 'fallback' : 'none',
            durationMs: Date.now() - startedAt,
            usedFallback: true,
            fallbackReason: 'DEEPSEEK_API_KEY is using the default placeholder value.'
          }
        : current
    )
    return DirectorParamsResponseSchema.parse(fallbackParams)
  }

  const client = new OpenAI({
    apiKey: env.apiKey,
    baseURL: env.baseUrl,
    timeout: env.timeoutMs
  })

  try {
    const completion = await client.chat.completions.create({
      model: env.model,
      temperature: DIRECTOR_MODEL_TEMPERATURE,
      max_tokens: DIRECTOR_MODEL_MAX_TOKENS,
      messages,
      extra_body: {
        thinking: { type: 'disabled' as const }
      }
    } as any)
    const content = normalizeModelContent(completion.choices[0]?.message?.content)

    if (!content) {
      throw new Error('DeepSeek returned an empty director params response.')
    }

    const rawResponse: DirectorDebugModelResponse = {
      receivedAt: new Date().toISOString(),
      model: completion.model ?? null,
      usage: completion.usage ?? null,
      content
    }

    updateLatestDirectorDebug((current) =>
      current
        ? {
            ...current,
            updatedAt: rawResponse.receivedAt,
            rawResponse
          }
        : current
    )

    const parsedJson = extractJsonObject(content)
    const normalized = normalizeModelDirectorParams(parsedJson, {
      hasBoss: request.snapshot.nextWavePreview.hasBoss,
      nextWave
    })
    const updatedAt = new Date().toISOString()

    updateLatestDirectorDebug((current) =>
      current
        ? {
            ...current,
            updatedAt,
            parsedResponse: normalized,
            finalResponse: normalized,
            resultSource: 'model',
            error: null,
            durationMs: Date.now() - startedAt,
            usedFallback: false,
            fallbackReason: null
          }
        : current
    )

    return DirectorParamsResponseSchema.parse(normalized)
  } catch (error) {
    const fallbackReason = error instanceof Error ? error.message : String(error)
    console.warn(
      '[director-params] model request failed, falling back to rule params:',
      fallbackReason
    )
    const updatedAt = new Date().toISOString()

    updateLatestDirectorDebug((current) =>
      current
        ? {
            ...current,
            updatedAt,
            finalResponse: fallbackParams,
            resultSource: fallbackParams ? 'fallback' : 'none',
            error: toDebugError(error),
            durationMs: Date.now() - startedAt,
            usedFallback: true,
            fallbackReason
          }
        : current
    )

    return DirectorParamsResponseSchema.parse(fallbackParams)
  }
}

function getDeepSeekEnv() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY ?? DEFAULT_DEEPSEEK_API_KEY,
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://aicode-api2.gz4399.com/api/v1',
    model: process.env.DEEPSEEK_MODEL ?? 'gpt-5.4-mini',
    timeoutMs: Number(process.env.DEEPSEEK_TIMEOUT_MS ?? 15_000)
  }
}

function buildDirectorPromptPayload(input: {
  request: DirectorParamsRequest
  nextWave: ReturnType<typeof getLevelWaveDefinitions>[number] | undefined
}) {
  const { request, nextWave } = input
  const { snapshot } = request
  const routePressure = summarizeRoutePressure(snapshot.lanePressure)
  const policy = normalizeDirectorPolicy(nextWave?.directorPolicy, snapshot.nextWavePreview.hasBoss)

  return {
    task: '根据当前塔防战局，为下一波输出一个合法的 Enemy Director 参数对象。',
    designIntent: [
      '你只负责出参数，不直接出最终刷怪表。',
      '你的输出会被本地规则执行器再编译成 addedGroups。',
      '目标是根据玩家当前短板出题，但不要跳出系统做不公平决策。'
    ],
    nextWave: {
      wave: snapshot.wave + 1,
      pressureGoal: nextWave?.pressureGoal ?? 'unknown',
      hint: nextWave?.nextWaveHint ?? 'unknown',
      directorReserveBudget: nextWave?.directorReserveBudget ?? 0,
      preview: snapshot.nextWavePreview
    },
    battleDigest: [
      `当前结算到第 ${snapshot.wave} 波，底线血量 ${snapshot.baseHp}，当前购买力 ${snapshot.purchasePower}。`,
      `上波漏怪 ${snapshot.leaksLastWave}，被毁魔导具 ${snapshot.destroyedBuildingsLastWave}。`,
      `魔导具数量：能量 ${snapshot.buildingCounts.energy} / 输出 ${snapshot.buildingCounts.attack} / 防御 ${snapshot.buildingCounts.defense}。`,
      `当前火力：地面 ${snapshot.outputProfile.groundDamage}，对空 ${snapshot.outputProfile.flyingDamage}，覆盖 ${snapshot.outputProfile.attackCoverage}，承伤 ${snapshot.outputProfile.blockCapacity}，经济产出 ${snapshot.outputProfile.energyIncome}。`,
      `路线压力：左路 ${Math.round(routePressure.left * 100)}%，中路 ${Math.round(routePressure.center * 100)}%，右路 ${Math.round(routePressure.right * 100)}%。`,
      `危险标签：${snapshot.problemTags.length > 0 ? snapshot.problemTags.join(' / ') : '无额外危险标签'}。`,
      `已选卡牌标签：${snapshot.chosenCardTags.length > 0 ? snapshot.chosenCardTags.join(' / ') : '暂无'}。`,
      `上一条导演标签：${request.lastDirectorReasonTag ?? 'none'}。`,
      `最近导演历史：${formatRecentDirectorHistory(request.recentDirectorHistory ?? [])}。`
    ],
    lanePressureTable: snapshot.lanePressure.map((lane) => ({
      lane: lane.lane + 1,
      pressureScore: lane.pressureScore,
      leaksLastWave: lane.leaksLastWave,
      destroyedBuildingsLastWave: lane.destroyedBuildingsLastWave,
      groundDps: lane.groundDps,
      flyingDps: lane.flyingDps,
      blockHp: lane.blockHp,
      economyValue: lane.economyValue
    })),
    allowedEnums: {
      intent: policy.allowedIntents,
      primaryRoute: ['left', 'center', 'right', 'mixed'],
      secondaryRoute: ['left', 'center', 'right'],
      timingStyle: ['frontload', 'steady', 'backload']
    },
    directorPolicy: {
      allowedIntents: policy.allowedIntents,
      preferredIntents: policy.preferredIntents,
      maxSpendRatio: policy.maxSpendRatio ?? null
    },
    outputRules: [
      '必须返回严格 JSON，不要输出 Markdown。',
      '只能返回一个 DirectorDecisionParams 对象。',
      'aggression 与 spendRatio 必须在 0 到 1 之间。',
      'roleWeights 四个字段都要给，数值 >= 0，至少一个字段 > 0。',
      '如果 intent 不是 split_pressure，就不要设置 secondaryRoute。',
      '如果下一波没有 Boss，就不要选择 boss_setup。',
      policy.preferredIntents.length > 0 ? `如果条件允许，优先选择这些意图：${policy.preferredIntents.join(' / ')}。` : '没有额外的优先意图。',
      policy.maxSpendRatio !== undefined ? `spendRatio 不得超过 ${policy.maxSpendRatio}。` : '本波没有额外 spendRatio 上限。',
      '尽量避免和上一条导演标签表达完全重复的意图。'
    ],
    outputSchema:
      '{"intent":"probe_fast","aggression":0.8,"primaryRoute":"right","secondaryRoute":"left","roleWeights":{"normal":0.3,"fast":1,"heavyAttack":0,"flying":0},"spendRatio":0.75,"timingStyle":"frontload"}',
    referenceRuleFallback: fallbackParamsToReference(
      createFallbackDirectorDecisionParams({
        snapshot,
        lastDirectorReasonTag: request.lastDirectorReasonTag ?? undefined,
        nextWave,
        recentDirectorHistory: request.recentDirectorHistory ?? []
      }) ?? null
    )
  }
}

function buildDirectorSystemPrompt() {
  return [
    '你是塔防游戏《玩个球》的敌方导演 AI。',
    '你的任务是根据当前战局，只输出下一波导演参数 DirectorDecisionParams。',
    '你不能直接输出最终敌潮、不能改规则、不能脱离预算、不能新增枚举值。',
    '必须在合法枚举内选择 intent、route、timingStyle。',
    '必须返回严格 JSON，不要输出 Markdown，不要解释。'
  ].join('\n')
}

function normalizeModelDirectorParams(
  parsedJson: unknown,
  options: {
    hasBoss: boolean
    nextWave: ReturnType<typeof getLevelWaveDefinitions>[number] | undefined
  }
) {
  const normalized = DirectorDecisionParamsSchema.parse(sanitizeDirectorParamsInput(parsedJson))
  const policy = normalizeDirectorPolicy(options.nextWave?.directorPolicy, options.hasBoss)
  const roleWeights = normalized.roleWeights
  const totalWeight = roleWeights.normal + roleWeights.fast + roleWeights.heavyAttack + roleWeights.flying

  if (totalWeight <= 0) {
    throw new Error('Director params roleWeights must contain at least one positive value.')
  }

  if (!policy.allowedIntents.includes(normalized.intent)) {
    throw new Error(`Director params selected disallowed intent "${normalized.intent}".`)
  }

  if (!options.hasBoss && normalized.intent === 'boss_setup') {
    throw new Error('Director params selected boss_setup without an incoming boss wave.')
  }

  if (normalized.intent === 'split_pressure') {
    if (!normalized.secondaryRoute) {
      throw new Error('split_pressure must include secondaryRoute.')
    }

    if (normalized.secondaryRoute === normalized.primaryRoute || normalized.primaryRoute === 'mixed') {
      throw new Error('split_pressure requires two distinct concrete routes.')
    }
  }

  if (normalized.intent !== 'split_pressure' && normalized.secondaryRoute !== undefined) {
    return {
      ...applyDirectorPolicyToParams(normalized, policy),
      secondaryRoute: undefined
    }
  }

  return applyDirectorPolicyToParams(normalized, policy)
}

function sanitizeDirectorParamsInput(parsedJson: unknown) {
  if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) {
    return parsedJson
  }

  const candidate = { ...parsedJson } as Record<string, unknown>

  if (candidate.secondaryRoute === null) {
    delete candidate.secondaryRoute
  }

  return candidate
}

function resolveLevelId(levelId: string): LevelId | undefined {
  return levelIds.find((candidate) => candidate === levelId)
}

function createFallbackDirectorDecisionParams(input: {
  snapshot: BattleSnapshot
  lastDirectorReasonTag?: string
  nextWave?: ReturnType<typeof getLevelWaveDefinitions>[number]
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
    recentEntry
  })
}

function fallbackParamsToReference(params: DirectorDecisionParams | null) {
  if (!params) {
    return '当前规则回退结果为 null。'
  }

  return params
}

function summarizeRoutePressure(lanePressure: BattleSnapshot['lanePressure']) {
  const ranked = aggregateRoutePressure(lanePressure)

  return {
    left: averageRoutePressure(ranked.left),
    center: averageRoutePressure(ranked.center),
    right: averageRoutePressure(ranked.right)
  }
}

function averageRoutePressure(lanes: BattleSnapshot['lanePressure']) {
  if (lanes.length === 0) {
    return 0
  }

  return lanes.reduce((sum, lane) => sum + lane.pressureScore, 0) / lanes.length
}

function pickPressureRoute(lanePressure: BattleSnapshot['lanePressure']): 'left' | 'center' | 'right' {
  const rankedRoutes = rankRoutesByPressure(lanePressure)
  return rankedRoutes[0]?.route ?? 'center'
}

function pickSecondaryPressureRoute(
  lanePressure: BattleSnapshot['lanePressure'],
  primaryRoute: 'left' | 'center' | 'right'
): 'left' | 'center' | 'right' | undefined {
  return rankRoutesByPressure(lanePressure).find((entry) => entry.route !== primaryRoute)?.route
}

function pickEconomyRoute(lanePressure: BattleSnapshot['lanePressure']): 'left' | 'center' | 'right' | undefined {
  const routeEconomy = Object.entries(aggregateRoutePressure(lanePressure))
    .map(([route, lanes]) => ({
      route: route as 'left' | 'center' | 'right',
      economyValue: lanes.reduce((sum, lane) => sum + lane.economyValue, 0)
    }))
    .sort((left, right) => right.economyValue - left.economyValue)

  const richestRoute = routeEconomy[0]
  return richestRoute && richestRoute.economyValue > 0 ? richestRoute.route : undefined
}

function shouldSplitPressure(lanePressure: BattleSnapshot['lanePressure']) {
  const rankedRoutes = rankRoutesByPressure(lanePressure)
  return (rankedRoutes[0]?.score ?? 0) >= 0.64 && (rankedRoutes[1]?.score ?? 0) >= 0.52
}

function rankRoutesByPressure(lanePressure: BattleSnapshot['lanePressure']) {
  return Object.entries(aggregateRoutePressure(lanePressure))
    .map(([route, lanes]) => ({
      route: route as 'left' | 'center' | 'right',
      score: roundToTenth(averageRoutePressure(lanes))
    }))
    .sort((left, right) => right.score - left.score)
}

function aggregateRoutePressure(lanePressure: BattleSnapshot['lanePressure']) {
  return {
    left: lanePressure.filter((lane) => lane.lane <= 1),
    center: lanePressure.filter((lane) => lane.lane === 2),
    right: lanePressure.filter((lane) => lane.lane >= 3)
  }
}

function createRoleWeights(overrides: Partial<DirectorDecisionParams['roleWeights']>): DirectorDecisionParams['roleWeights'] {
  return {
    normal: overrides.normal ?? 0,
    fast: overrides.fast ?? 0,
    heavyAttack: overrides.heavyAttack ?? 0,
    flying: overrides.flying ?? 0
  }
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

function createDirectorDecisionCandidates(input: {
  snapshot: BattleSnapshot
  lastDirectorReasonTag?: string
  primaryPressureRoute: 'left' | 'center' | 'right'
  secondaryPressureRoute?: 'left' | 'center' | 'right'
  economyRoute: 'left' | 'center' | 'right'
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
      primaryRoute: primaryPressureRoute,
      secondaryRoute: secondaryPressureRoute,
      aggression: 0.66,
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
  primaryPressureRoute: 'left' | 'center' | 'right'
  secondaryPressureRoute?: 'left' | 'center' | 'right'
  economyRoute: 'left' | 'center' | 'right'
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
  policy: ReturnType<typeof getLevelWaveDefinitions>[number]['directorPolicy'] | undefined,
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

function formatRecentDirectorHistory(history: DirectorHistoryEntry[]) {
  if (history.length === 0) {
    return '无'
  }

  return history
    .map((entry) => `第${entry.wave}波:${entry.intent}/${entry.primaryRoute}${entry.reasonTag ? `/${entry.reasonTag}` : ''}`)
    .join(' | ')
}

function extractJsonObject(content: string) {
  const trimmed = content.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const raw = fenced?.[1] ?? trimmed
  const firstBrace = raw.indexOf('{')
  const lastBrace = raw.lastIndexOf('}')
  const jsonCandidate = firstBrace >= 0 && lastBrace >= firstBrace ? raw.slice(firstBrace, lastBrace + 1) : raw
  return JSON.parse(jsonCandidate)
}

function normalizeModelContent(content: unknown) {
  if (typeof content === 'string' || content === null) {
    return content
  }

  return JSON.stringify(content)
}

function toDebugError(error: unknown): StrategyAdviceDebugError {
  const at = new Date().toISOString()

  if (error instanceof Error) {
    return {
      at,
      message: error.message,
      name: error.name
    }
  }

  return {
    at,
    message: String(error)
  }
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10
}
