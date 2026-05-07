import { randomUUID } from 'node:crypto'
import { aiStrategy, strategyCards, strategyCardDefinitions, type StrategyCardDefinition } from '@tower-rogue/game-content'
import {
  type BattleAdviceRequest,
  StrategyAdviceResponseSchema,
  type RecommendationSlot,
  type StrategyAdviceDebugError,
  type StrategyAdviceDebugModelResponse,
  type StrategyAdviceDebugRequest,
  type StrategyAdviceRequest,
  type StrategyAdviceResponse
} from '@tower-rogue/shared'
import OpenAI from 'openai'
import { measureSerializedValue, recordStrategyAdviceMetric } from './strategyAdviceMetrics.js'
import { setLatestStrategyAdviceDebug, updateLatestStrategyAdviceDebug } from './strategyAdviceDebug.js'

const DEFAULT_DEEPSEEK_API_KEY = 'sk-deepseek-default-placeholder'
const REQUIRED_SLOTS: RecommendationSlot[] = ['emergency', 'synergy', 'pivot']
const IMPLEMENTED_STRATEGY_CARD_EFFECT_KINDS = new Set([
  'grant_base_shield',
  'repair_all_buildings',
  'gain_purchase_power',
  'boost_energy_core_output',
  'boost_building_attack_power',
  'boost_building_attack_speed',
  'focus_flying_targets',
  'boost_wall_hp_and_repair',
  'spawn_temporary_wall',
  'wall_damage_reflection'
])

export async function generateStrategyAdviceWithDeepSeek(request: StrategyAdviceRequest): Promise<StrategyAdviceResponse> {
  const env = getDeepSeekEnv()
  const traceId = randomUUID()
  const startedAt = Date.now()
  const promptPayload = buildStrategyAdvicePromptPayload(request)
  const messages = [
    {
      role: 'system' as const,
      content: buildSystemPrompt()
    },
    {
      role: 'user' as const,
      content: JSON.stringify(promptPayload, null, 2)
    }
  ]
  const completionRequest = {
    model: env.model,
    temperature: aiStrategy.modelTuning.temperature,
    max_tokens: aiStrategy.modelTuning.maxTokens,
    messages,
    extra_body: {
      thinking: { type: 'disabled' as const }
    }
  }
  const requestSize = {
    promptPayload: measureSerializedValue(promptPayload),
    messages: measureSerializedValue(messages),
    completionRequest: measureSerializedValue(completionRequest)
  }
  const battleContext = {
    problemTagCount: request.snapshot.problemTags.length,
    chosenCardTagCount: request.snapshot.chosenCardTags.length,
    candidateCounts: {
      emergency: promptPayload.candidatePools.emergency.length,
      synergy: promptPayload.candidatePools.synergy.length,
      pivot: promptPayload.candidatePools.pivot.length
    }
  }
  const requestDebug: StrategyAdviceDebugRequest = {
    createdAt: new Date().toISOString(),
    model: env.model,
    baseUrl: env.baseUrl,
    timeoutMs: env.timeoutMs,
    source: request.source,
    wave: request.snapshot.wave,
    apiRequest: request,
    promptPayload,
    messages
  }

  setLatestStrategyAdviceDebug({
    updatedAt: requestDebug.createdAt,
    request: requestDebug,
    rawResponse: null,
    parsedResponse: null,
    finalResponse: null,
    error: null,
    durationMs: null,
    usedFallback: false,
    fallbackReason: null
  })

  if (env.apiKey === DEFAULT_DEEPSEEK_API_KEY) {
    const error = new Error('DEEPSEEK_API_KEY is using the default placeholder value.')
    recordStrategyAdviceMetric({
      traceId,
      recordedAt: new Date().toISOString(),
      provider: 'deepseek',
      model: env.model,
      baseUrl: env.baseUrl,
      source: request.source,
      wave: request.snapshot.wave,
      timeoutMs: env.timeoutMs,
      durationMs: Date.now() - startedAt,
      status: 'error',
      failureStage: 'preflight',
      battleContext,
      requestSize,
      responseSize: {
        content: null,
        completion: null
      },
      usage: null,
      error: toMetricError(error)
    })
    recordStrategyAdviceError(error, startedAt)
    throw error
  }

  const client = new OpenAI({
    apiKey: env.apiKey,
    baseURL: env.baseUrl,
    timeout: env.timeoutMs
  })

  debugDeepSeek(env, 'request', {
    traceId,
    model: env.model,
    baseUrl: env.baseUrl,
    timeoutMs: env.timeoutMs,
    source: request.source,
    wave: request.snapshot.wave,
    messages,
    requestSize
  })

  let rawCompletion: OpenAI.Chat.Completions.ChatCompletion | null = null
  let rawContent: string | null = null

  try {
    const completion = await client.chat.completions.create(completionRequest as any)
    rawCompletion = completion

    const content = normalizeModelContent(completion.choices[0]?.message?.content)
    rawContent = content
    const rawResponse: StrategyAdviceDebugModelResponse = {
      receivedAt: new Date().toISOString(),
      model: completion.model ?? null,
      usage: completion.usage ?? null,
      content
    }

    updateLatestStrategyAdviceDebug((current) =>
      current
        ? {
            ...current,
            updatedAt: rawResponse.receivedAt,
            rawResponse
          }
        : current
    )

    debugDeepSeek(env, 'response', {
      traceId,
      model: completion.model,
      usage: completion.usage ?? null,
      content,
      responseSize: {
        content: content ? measureSerializedValue(content) : null,
        completion: measureSerializedValue(completion)
      }
    })

    if (!content) {
      throw new Error('DeepSeek returned an empty response.')
    }

    const parsedJson = extractJsonObject(content)
    const parsedResponse = normalizeModelStrategyAdvice(parsedJson)
    const updatedAt = new Date().toISOString()

    updateLatestStrategyAdviceDebug((current) =>
      current
        ? {
            ...current,
            updatedAt,
            parsedResponse,
            finalResponse: parsedResponse,
            error: null,
            durationMs: Date.now() - startedAt,
            usedFallback: false,
            fallbackReason: null
          }
        : current
    )

    debugDeepSeek(env, 'parsed', parsedResponse)
    recordStrategyAdviceMetric({
      traceId,
      recordedAt: updatedAt,
      provider: 'deepseek',
      model: completion.model ?? env.model,
      baseUrl: env.baseUrl,
      source: request.source,
      wave: request.snapshot.wave,
      timeoutMs: env.timeoutMs,
      durationMs: Date.now() - startedAt,
      status: 'success',
      battleContext,
      requestSize,
      responseSize: {
        content: rawContent ? measureSerializedValue(rawContent) : null,
        completion: measureSerializedValue(completion)
      },
      usage: extractUsageMetrics(completion.usage),
      error: null
    })

    return parsedResponse
  } catch (error) {
    recordStrategyAdviceMetric({
      traceId,
      recordedAt: new Date().toISOString(),
      provider: 'deepseek',
      model: rawCompletion?.model ?? env.model,
      baseUrl: env.baseUrl,
      source: request.source,
      wave: request.snapshot.wave,
      timeoutMs: env.timeoutMs,
      durationMs: Date.now() - startedAt,
      status: 'error',
      failureStage: rawCompletion ? 'parse' : 'provider',
      battleContext,
      requestSize,
      responseSize: {
        content: rawContent ? measureSerializedValue(rawContent) : null,
        completion: rawCompletion ? measureSerializedValue(rawCompletion) : null
      },
      usage: extractUsageMetrics(rawCompletion?.usage ?? null),
      error: toMetricError(error)
    })
    recordStrategyAdviceError(error, startedAt)
    debugDeepSeek(env, 'error', toDebugError(error))
    throw error
  }
}

function getDeepSeekEnv() {
  return {
    apiKey: process.env.DEEPSEEK_API_KEY ?? DEFAULT_DEEPSEEK_API_KEY,
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://aicode-api2.gz4399.com/api/v1',
    model: process.env.DEEPSEEK_MODEL ?? 'gpt-5.4-mini',
    timeoutMs: Number(process.env.DEEPSEEK_TIMEOUT_MS ?? 15_000),
    debugLog: isDeepSeekDebugEnabled(process.env.DEEPSEEK_DEBUG_LOG)
  }
}

function buildStrategyAdvicePromptPayload(request: StrategyAdviceRequest) {
  const { snapshot } = request

  return {
    taskContext: buildTaskContext(request.source),
    battlefieldDigest: [
      `第 ${snapshot.wave} 波，底线剩余 ${snapshot.baseHp}，当前购买力 ${snapshot.purchasePower}。`,
      `上波漏怪 ${snapshot.leaksLastWave}，被毁魔导具 ${snapshot.destroyedBuildingsLastWave}。`,
      `场上魔导具：能量 ${snapshot.buildingCounts.energy} / 输出 ${snapshot.buildingCounts.attack} / 防御 ${snapshot.buildingCounts.defense}。`,
      `当前火力：地面 ${snapshot.outputProfile.groundDamage}，对空 ${snapshot.outputProfile.flyingDamage}，覆盖 ${snapshot.outputProfile.attackCoverage}，承伤容量 ${snapshot.outputProfile.blockCapacity}。`,
      `即将面对：普通 ${snapshot.nextWavePreview.normal} / 极速 ${snapshot.nextWavePreview.fast} / 重攻 ${snapshot.nextWavePreview.heavyAttack} / 飞行 ${snapshot.nextWavePreview.flying}${snapshot.nextWavePreview.hasBoss ? ' / Boss' : ''}。`,
      `路线压力：${snapshot.lanePressure.map((lane) => `第 ${lane.lane + 1} 路 ${Math.round(lane.pressureScore * 100)}%`).join(' / ')}。`,
      `危险标签：${snapshot.problemTags.length > 0 ? snapshot.problemTags.map(formatProblemTag).join('；') : aiStrategy.promptCopy.noProblemTagsText}`
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
    slotRules: aiStrategy.promptCopy.slotRules,
    candidatePools: buildCandidatePools(snapshot.problemTags),
    outputRequirements: {
      recommendationsOrder: REQUIRED_SLOTS,
      keepCardIdsValid: true,
      language: aiStrategy.promptCopy.language
    }
  }
}

function buildTaskContext(source: StrategyAdviceRequest['source']) {
  if (source === 'active-skill') {
    return aiStrategy.taskContext.activeSkill
  }

  return aiStrategy.taskContext.waveCleared
}

function buildCandidatePools(problemTags: string[]) {
  const implementedCards = strategyCards.filter(isStrategyCardImplemented)

  return {
    emergency: implementedCards.filter((card) => toRecommendationSlot(card) === 'emergency').map((card) => serializeCandidateCard(card, problemTags)),
    synergy: implementedCards.filter((card) => toRecommendationSlot(card) === 'synergy').map((card) => serializeCandidateCard(card, problemTags)),
    pivot: implementedCards.filter((card) => toRecommendationSlot(card) === 'pivot').map((card) => serializeCandidateCard(card, problemTags))
  }
}

function serializeCandidateCard(card: StrategyCardDefinition, problemTags: string[]) {
  return {
    cardId: card.id,
    name: card.name,
    description: card.description,
    recommendReason: card.recommendReason,
    matchedProblems: Object.keys(card.solves)
      .filter((tag) => problemTags.includes(tag))
      .map(formatProblemTag)
  }
}

function normalizeModelStrategyAdvice(parsedJson: any): StrategyAdviceResponse {
  const recommendations = Array.isArray(parsedJson?.recommendations)
    ? (parsedJson.recommendations as Array<{ slot?: RecommendationSlot; cardId?: string; reason?: string }>)
    : []
  const slotPools = getAllowedCardIdsBySlot()
  const seenCardIds = new Set<string>()

  const normalizedRecommendations = REQUIRED_SLOTS.map((slot) => {
    const recommendation = recommendations.find((item) => item?.slot === slot)

    if (!recommendation) {
      throw new Error(`DeepSeek did not return a recommendation for slot "${slot}".`)
    }

    if (typeof recommendation.cardId !== 'string' || typeof recommendation.reason !== 'string') {
      throw new Error(`DeepSeek returned an invalid recommendation shape for slot "${slot}".`)
    }

    if (!slotPools[slot].has(recommendation.cardId as keyof typeof strategyCardDefinitions)) {
      throw new Error(`DeepSeek selected invalid cardId "${recommendation.cardId}" for slot "${slot}".`)
    }

    if (seenCardIds.has(recommendation.cardId)) {
      throw new Error(`DeepSeek returned duplicate cardId "${recommendation.cardId}".`)
    }

    seenCardIds.add(recommendation.cardId)

    return {
      slot,
      cardId: recommendation.cardId,
      reason: recommendation.reason.trim()
    }
  })

  return StrategyAdviceResponseSchema.parse({
    source: 'model',
    summary: typeof parsedJson?.summary === 'string' ? parsedJson.summary.trim() : '',
    commanderLine: typeof parsedJson?.commanderLine === 'string' ? parsedJson.commanderLine.trim() : undefined,
    recommendations: normalizedRecommendations
  })
}

function getAllowedCardIdsBySlot() {
  const implementedCards = strategyCards.filter(isStrategyCardImplemented)

  return {
    emergency: new Set(implementedCards.filter((card) => toRecommendationSlot(card) === 'emergency').map((card) => card.id)),
    synergy: new Set(implementedCards.filter((card) => toRecommendationSlot(card) === 'synergy').map((card) => card.id)),
    pivot: new Set(implementedCards.filter((card) => toRecommendationSlot(card) === 'pivot').map((card) => card.id))
  }
}

function toRecommendationSlot(card: StrategyCardDefinition): RecommendationSlot {
  if (card.type === 'emergency') {
    return 'emergency'
  }

  if (card.type === 'pivot') {
    return 'pivot'
  }

  return 'synergy'
}

function isStrategyCardImplemented(card: StrategyCardDefinition) {
  return IMPLEMENTED_STRATEGY_CARD_EFFECT_KINDS.has(card.effect.kind)
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

function formatProblemTag(tag: string) {
  return `${tag}: ${aiStrategy.problemTagLabels[tag as keyof typeof aiStrategy.problemTagLabels] ?? tag}`
}

function isDeepSeekDebugEnabled(value: string | undefined) {
  return value === '1' || value === 'true'
}

function debugDeepSeek(env: ReturnType<typeof getDeepSeekEnv>, stage: 'request' | 'response' | 'parsed' | 'error', payload: unknown) {
  if (!env.debugLog) {
    return
  }

  console.info(
    `[deepseek-debug:${stage}] ${JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        payload
      },
      null,
      2
    )}`
  )
}

function normalizeModelContent(content: unknown) {
  if (typeof content === 'string' || content === null) {
    return content
  }

  return JSON.stringify(content)
}

function recordStrategyAdviceError(error: unknown, startedAt: number) {
  const errorInfo = toDebugError(error)

  updateLatestStrategyAdviceDebug((current) =>
    current
      ? {
          ...current,
          updatedAt: errorInfo.at,
          error: errorInfo,
          durationMs: Date.now() - startedAt
        }
      : current
  )
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

function toMetricError(error: unknown) {
  if (error instanceof Error) {
    const apiError = error as Error & { status?: number; code?: string }

    return {
      name: error.name,
      message: error.message,
      statusCode: typeof apiError.status === 'number' ? apiError.status : undefined,
      code: typeof apiError.code === 'string' ? apiError.code : undefined
    }
  }

  return {
    message: String(error)
  }
}

function extractUsageMetrics(usage: OpenAI.CompletionUsage | null | undefined) {
  if (!usage) {
    return null
  }

  return {
    promptTokens: usage.prompt_tokens ?? null,
    completionTokens: usage.completion_tokens ?? null,
    totalTokens: usage.total_tokens ?? null,
    reasoningTokens: usage.completion_tokens_details?.reasoning_tokens ?? null
  }
}

function buildSystemPrompt() {
  return [
    aiStrategy.systemPrompt.role,
    aiStrategy.systemPrompt.selectionTask,
    aiStrategy.systemPrompt.decisionConstraint,
    aiStrategy.systemPrompt.poolConstraint,
    aiStrategy.systemPrompt.jsonConstraint,
    aiStrategy.systemPrompt.outputSchema,
    aiStrategy.systemPrompt.slotCoverageConstraint,
    aiStrategy.systemPrompt.styleConstraint
  ].join('\n')
}

export async function streamBattleAdviceWithDeepSeek(
  request: BattleAdviceRequest,
  onChunk: (chunk: string) => void
): Promise<void> {
  const env = getDeepSeekEnv()

  if (env.apiKey === DEFAULT_DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is using the default placeholder value.')
  }

  const response = await fetch(`${env.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.apiKey}`
    },
    body: JSON.stringify({
      model: env.model,
      temperature: 0.25,
      max_tokens: 220,
      stream: true,
      messages: [
        {
          role: 'system',
          content:
            '你是塔防游戏军师。塔一旦放下就不能移动，只能补建、升级或选策略卡补救。请根据战局给出简体中文建议，不超过100字，只输出玩家可见建议，不要输出 JSON。'
        },
        {
          role: 'user',
          content: buildBattleAdvicePrompt(request)
        }
      ],
      extra_body: {
        thinking: { type: 'disabled' }
      }
    }),
    signal: AbortSignal.timeout(env.timeoutMs)
  })

  if (!response.ok || !response.body) {
    throw new Error(`DeepSeek battle advice responded with ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      const chunk = parseStreamLine(line)
      if (chunk) {
        onChunk(chunk)
      }
    }
  }
}

function parseStreamLine(line: string) {
  const trimmed = line.trim()

  if (!trimmed.startsWith('data:')) {
    return ''
  }

  const data = trimmed.slice(5).trim()

  if (!data || data === '[DONE]') {
    return ''
  }

  try {
    const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> }
    return parsed.choices?.[0]?.delta?.content ?? ''
  } catch {
    return ''
  }
}

function buildBattleAdvicePrompt(request: BattleAdviceRequest) {
  const plants =
    request.plants.map((plant) => `${plant.type}(行${plant.row + 1},列${(plant.col ?? 0) + 1},血${plant.hp}/${plant.maxHp ?? '?'})`).join('、') ||
    '无'
  const enemies =
    request.enemies.map((enemy) => `${enemy.type}(行${enemy.row + 1},x=${Math.round(enemy.x ?? 0)},血${enemy.hp}/${enemy.maxHp ?? '?'})`).join('、') ||
    '无'
  const cards =
    request.recommendations.map((card) => `${card.slot}:${card.name}(${card.description})`).join('；') || '无'

  return [
    `当前第 ${request.wave} 波，底线剩余 ${request.baseHp}，购买力 ${request.purchasePower}。`,
    `场上魔导具：${plants}。`,
    `场上敌人：${enemies}。`,
    `可选策略卡：${cards}。`,
    '请直接给一句建议：优先补哪类短板、应该偏向选哪张卡。'
  ].join('\n')
}
