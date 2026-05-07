import { getLevelEnemyDefinitions, getLevelMap, getLevelWaveDefinitions, levelIds, type LevelId } from '@tower-rogue/game-content'
import type { EnemyDefinition } from '@tower-rogue/game-content'
import { calculateWaveDirectorCost, compileAiWavePlan } from '../../../packages/game-core/src/aiWave.js'
import {
  AiWavePlanRequestSchema,
  AiWavePlanResponseSchema,
  AiWavePlanSchema,
  RealtimeAiWavePlanRequestSchema,
  type RealtimeAiWavePlanRequest,
  type RealtimeAiWavePlanResponse,
  type AiWaveDebugModelResponse,
  type AiWaveDebugRequest,
  type AiWavePlan,
  type AiWavePlanRequest,
  type AiWaveRoute,
  type StrategyAdviceDebugError
} from '@tower-rogue/shared'
import OpenAI from 'openai'
import { z } from 'zod'
import { setLatestAiWaveDebug, updateLatestAiWaveDebug } from './aiWaveDebug.js'

const AI_DIRECTOR_API_KEY = 'cr_98b7d4ba512f215f1f9e23a9e992f3fd1c8308049c912f397ee5225e3dacb5d5'
const AI_DIRECTOR_BASE_URL = 'https://aicode-api2.gz4399.com/api/v1'
const AI_DIRECTOR_MODEL = 'gpt-5.4-mini'
const AI_DIRECTOR_TIMEOUT_MS = 15_000
const REALTIME_AI_WAVE_MODEL_TEMPERATURE = 0.7
const REALTIME_AI_WAVE_MODEL_MAX_TOKENS = 512

const RealtimeAiIntentSchema = z.object({
  rows: z.array(z.coerce.number().int().min(1).max(5)).min(1).max(3),
  roles: z.array(z.enum(['normal', 'fast', 'heavyAttack', 'flying'])).min(1).max(3),
  intensity: z.coerce.number().int().min(1).max(3),
  cadence: z.enum(['sparse', 'steady', 'dense'])
})

type RealtimeAiIntent = z.infer<typeof RealtimeAiIntentSchema>

export async function generateRealtimeAiWavePlan(request: RealtimeAiWavePlanRequest): Promise<RealtimeAiWavePlanResponse> {
  const startedAt = Date.now()
  const levelId = resolveLevelId(request.levelId)

  if (!levelId) {
    throw new Error(`Unknown levelId "${request.levelId}"`)
  }

  const currentWave = getLevelWaveDefinitions(levelId)[request.snapshot.wave - 1]
  const env = getDeepSeekEnv()
  const promptContext = buildAiWavePromptContext({
    levelId,
    request,
    nextWave: currentWave,
    currentWaveElapsed: request.currentWaveElapsed
  })
  const enemyDefinitions = getLevelEnemyDefinitions(levelId)
  const systemPrompt = buildAiWaveSystemPrompt({
    levelId,
    promptContext,
    enemyDefinitions
  })
  const battleSnapshotPayload = buildRealtimeBattleSnapshotPromptPayload(request, levelId)
  const messages = [
    {
      role: 'system' as const,
      content: systemPrompt
    },
    {
      role: 'user' as const,
      content: JSON.stringify(battleSnapshotPayload)
    }
  ]
  const requestDebug: AiWaveDebugRequest = {
    createdAt: new Date().toISOString(),
    model: env.model,
    baseUrl: env.baseUrl,
    timeoutMs: env.timeoutMs,
    levelId: request.levelId,
    wave: request.snapshot.wave,
    apiRequest: RealtimeAiWavePlanRequestSchema.parse(request),
    promptPayload: battleSnapshotPayload,
    messages
  }

  setLatestAiWaveDebug({
    updatedAt: requestDebug.createdAt,
    request: requestDebug,
    rawResponse: null,
    parsedPlan: null,
    compileResult: null,
    finalResponse: null,
    error: null,
    durationMs: null,
    usedFallback: false,
    fallbackReason: null
  })

  if (!currentWave?.aiDirectorAllowed) {
    updateLatestAiWaveDebug((current) =>
      current
        ? {
            ...current,
            updatedAt: new Date().toISOString(),
            finalResponse: null,
            durationMs: Date.now() - startedAt,
            usedFallback: true,
            fallbackReason: 'Realtime AI wave director is disabled for the current wave.'
          }
        : current
    )
    return AiWavePlanResponseSchema.parse(null)
  }

  const client = new OpenAI({
    apiKey: env.apiKey,
    baseURL: env.baseUrl,
    timeout: env.timeoutMs
  })

  let parsedPlan: RealtimeAiWavePlanResponse = null

  try {
    const completion = await client.chat.completions.create({
      model: env.model,
      temperature: REALTIME_AI_WAVE_MODEL_TEMPERATURE,
      max_tokens: REALTIME_AI_WAVE_MODEL_MAX_TOKENS,
      messages,
      extra_body: {
        thinking: { type: 'disabled' as const }
      }
    } as any)
    const content = normalizeModelContent(completion.choices[0]?.message?.content)

    if (!content) {
      throw new Error('AI director returned an empty realtime wave response.')
    }

    const rawResponse: AiWaveDebugModelResponse = {
      receivedAt: new Date().toISOString(),
      model: completion.model ?? null,
      usage: completion.usage ?? null,
      content
    }

    updateLatestAiWaveDebug((current) =>
      current
        ? {
            ...current,
            updatedAt: rawResponse.receivedAt,
            rawResponse
          }
        : current
    )

    const parsedIntent = normalizeRealtimeAiIntent(extractJsonObject(content))
    parsedPlan = buildAiWavePlanFromRealtimeIntent(parsedIntent, promptContext, enemyDefinitions)
    const updatedAt = new Date().toISOString()

    updateLatestAiWaveDebug((current) =>
      current
        ? {
            ...current,
            updatedAt,
            parsedPlan,
            compileResult: null,
            finalResponse: parsedPlan,
            error: null,
            durationMs: Date.now() - startedAt,
            usedFallback: false,
            fallbackReason: null
          }
        : current
    )

    return AiWavePlanResponseSchema.parse(parsedPlan)
  } catch (error) {
    const fallbackReason = error instanceof Error ? error.message : String(error)
    const updatedAt = new Date().toISOString()

    updateLatestAiWaveDebug((current) =>
      current
        ? {
            ...current,
            updatedAt,
            parsedPlan,
            compileResult: null,
            finalResponse: null,
            error: toDebugError(error),
            durationMs: Date.now() - startedAt,
            usedFallback: true,
            fallbackReason
          }
        : current
    )

    return AiWavePlanResponseSchema.parse(null)
  }
}

function getDeepSeekEnv() {
  return {
    apiKey: AI_DIRECTOR_API_KEY,
    baseUrl: AI_DIRECTOR_BASE_URL,
    model: AI_DIRECTOR_MODEL,
    timeoutMs: AI_DIRECTOR_TIMEOUT_MS
  }
}

function buildAiWavePromptContext(input: {
  levelId: LevelId
  request: AiWavePlanRequest
  nextWave: ReturnType<typeof getLevelWaveDefinitions>[number] | undefined
  currentWaveElapsed?: number
}) {
  const { levelId, request, nextWave, currentWaveElapsed = 0 } = input
  const enemyDefinitions = getLevelEnemyDefinitions(levelId)
  const baseWaveCost = nextWave ? calculateWaveDirectorCost(nextWave, enemyDefinitions) : 0
  const allowedCostRange = [3, Math.max(6, roundToTenth(baseWaveCost * 0.5))]
  const safeEarliestStart = roundToTenth(currentWaveElapsed + 3)
  const recommendedPhaseCount = estimateRealtimePhaseCount(request.snapshot)

  return {
    wave: request.snapshot.wave,
    currentWaveElapsed: roundToTenth(currentWaveElapsed),
    baseWaveCost,
    safeEarliestStart,
    allowedCostRange,
    allowedPhaseCount: [2, 10] as const,
    recommendedPhaseCount
  }
}

function buildRealtimeBattleSnapshotPromptPayload(request: AiWavePlanRequest, levelId: LevelId) {
  const { snapshot } = request
  const weakestLane = [...snapshot.lanePressure].sort(compareLaneWeakness)[0] ?? null
  const hottestLane = [...snapshot.lanePressure].sort((left, right) => right.pressureScore - left.pressureScore)[0] ?? null
  const levelMap = getLevelMap(levelId)

  return {
    w: snapshot.wave,
    hp: snapshot.baseHp,
    hpMax: levelMap.baseHp,
    sun: snapshot.purchasePower,
    build: [snapshot.buildingCounts.energy, snapshot.buildingCounts.attack, snapshot.buildingCounts.defense],
    power: [
      roundToTenth(snapshot.outputProfile.groundDamage),
      roundToTenth(snapshot.outputProfile.flyingDamage),
      roundToTenth(snapshot.outputProfile.attackCoverage),
      roundToTenth(snapshot.outputProfile.blockCapacity)
    ],
    pressure: [
      roundToTenth(snapshot.pressureProfile.groundPressure),
      roundToTenth(snapshot.pressureProfile.flyingPressure),
      roundToTenth(snapshot.pressureProfile.fastPressure),
      roundToTenth(snapshot.pressureProfile.buildingDamagePressure)
    ],
    rows: snapshot.lanePressure.map((lane) => [
      lane.lane + 1,
      roundToTenth(lane.pressureScore),
      roundToTenth(lane.groundDps),
      roundToTenth(lane.flyingDps),
      roundToTenth(lane.blockHp),
      roundToTenth(lane.economyValue)
    ]),
    tags: snapshot.problemTags.slice(0, 4),
    hint: [weakestLane ? weakestLane.lane + 1 : 3, hottestLane ? hottestLane.lane + 1 : 3]
  }
}

function estimateRealtimePhaseCount(snapshot: AiWavePlanRequest['snapshot']) {
  const totalBuildings = snapshot.buildingCounts.energy + snapshot.buildingCounts.attack + snapshot.buildingCounts.defense
  const totalLanePressure = snapshot.lanePressure.reduce((sum, lane) => sum + lane.pressureScore, 0)
  const resourceScore = snapshot.purchasePower / 80
  const formationScore = totalBuildings * 0.45
  const damageScore =
    snapshot.outputProfile.groundDamage / 120 +
    snapshot.outputProfile.flyingDamage / 120 +
    snapshot.outputProfile.attackCoverage * 0.35 +
    snapshot.outputProfile.blockCapacity / 220
  const economyScore = snapshot.buildingCounts.energy * 0.55
  const pressureScore = totalLanePressure / 3
  const strengthScore = resourceScore + formationScore + damageScore + economyScore + pressureScore

  return clampInteger(Math.round(2 + strengthScore), 2, 10)
}

function clampInteger(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function compareLaneWeakness(left: AiWavePlanRequest['snapshot']['lanePressure'][number], right: AiWavePlanRequest['snapshot']['lanePressure'][number]) {
  return getLaneDefenseScore(left) - getLaneDefenseScore(right)
}

function getLaneDefenseScore(lane: AiWavePlanRequest['snapshot']['lanePressure'][number]) {
  return lane.groundDps + lane.flyingDps + lane.blockHp * 0.2 + lane.economyValue * 0.1
}

function buildAiWaveSystemPrompt(input: {
  levelId: LevelId
  promptContext: ReturnType<typeof buildAiWavePromptContext>
  enemyDefinitions: ReturnType<typeof getLevelEnemyDefinitions>
}) {
  const allowedEnemies = Object.values(input.enemyDefinitions)
    .filter((enemy) => enemy.role !== 'boss')
    .sort((left, right) => left.firstWave - right.firstWave || left.directorCost - right.directorCost)
    .map((enemy) => `- \`${enemy.id}\`: ${enemy.role}, cost=${enemy.directorCost}, firstWave=${enemy.firstWave}`)
    .join('\n')

  return [
    '## 角色',
    '你是塔防实时增援导演，只根据用户提供的当前战况 JSON，选择本次增援意图。',
    '',
    '## 当前约束',
    `- 关卡：${input.levelId}`,
    `- 当前波次：${input.promptContext.wave}`,
    `- 当前波次已进行：${input.promptContext.currentWaveElapsed} 秒`,
    '- 地图是 5x9 格子，出兵只选择 row 1-5。',
    '- 可选敌人类型为普通 / 快速 / 重装 / 飞行。',
    '',
    '## 用户战况 JSON 字段说明',
    '- `w`: 当前波次。',
    '- `hp`: 玩家基地当前血量。',
    '- `hpMax`: 玩家基地血量上限；用 `hp / hpMax` 判断危险程度。',
    '- `sun`: 玩家当前资源；平均约 100 点可购买 1 个御敌装置，越高代表阵容更强。',
    '- `build`: `[能量建筑数, 输出建筑数, 防御建筑数]`。',
    '- `power`: `[对地输出, 对空输出, 覆盖率, 阻挡承伤]`。',
    '- `pressure`: `[地面压力, 飞行压力, 快速压力, 重攻压力]`。',
    '- `rows`: 每项为 `[行号, 综合压力, 对地输出, 对空输出, 阻挡承伤, 经济价值]`。',
    '- `tags`: 当前战况标签。',
    '- `hint`: `[最薄弱行, 压力最高行]`。',
    '',
    '## 可选敌人',
    allowedEnemies,
    '',
    '## 输出字段',
    '- `rows`: 1-3 个行号，取值 1-5；优先压最薄弱行，也可以转移压力。',
    '- `roles`: 1-3 个类型，可选 `normal` / `fast` / `heavyAttack` / `flying`。',
    '- `intensity`: 1-3，1=试探，2=施压，3=强压；资源高且防线强时用更高强度。',
    '- `cadence`: `sparse` / `steady` / `dense`；强压优先 `dense`。',
    '',
    '## 输出规则',
    '- 只返回严格 JSON，不要 Markdown，不要解释。',
    '- 不要输出 `phases`、`pressureGoal`、`nextWaveHint`、`budgetUnits`、`startSecond`。',
    '- 如果对空薄弱，优先包含 `flying`；如果阻挡薄弱，优先包含 `fast` 或 `heavyAttack`。',
    '- 不要总是选择中间行；根据 `rows` 和 `hint` 选择真实薄弱点。',
    '',
    '## 完整输出示例',
    '```json',
    JSON.stringify({ rows: [5, 3], roles: ['fast', 'flying'], intensity: 2, cadence: 'dense' }, null, 2),
    '```',
    '',
    '## 最终要求',
    '- 只返回严格 JSON。',
    '- 不要输出 Markdown。',
    '- 不要解释。'
  ].join('\n')
}

export function parseAiWavePlanResponse(input: {
  content: string
  levelId: LevelId
  targetWaveIndex: number
  nextWave: NonNullable<ReturnType<typeof getLevelWaveDefinitions>[number]>
}) {
  const parsedJson = extractJsonObject(input.content)
  const plan = normalizeModelAiWavePlan(parsedJson)
  const compileResult = compileAiWavePlan(plan, {
    levelId: input.levelId,
    targetWaveIndex: input.targetWaveIndex,
    nextWave: input.nextWave,
    baseWaveCost: calculateWaveDirectorCost(input.nextWave, getLevelEnemyDefinitions(input.levelId)),
    bossId: input.nextWave.bossId
  })

  return {
    plan,
    compileResult
  }
}

export function normalizeRealtimeAiIntent(parsedJson: unknown) {
  return RealtimeAiIntentSchema.parse(sanitizeRealtimeAiIntentInput(parsedJson))
}

function buildAiWavePlanFromRealtimeIntent(
  intent: RealtimeAiIntent,
  promptContext: ReturnType<typeof buildAiWavePromptContext>,
  enemyDefinitions: Record<string, EnemyDefinition>
): AiWavePlan {
  const rowNumbers = normalizeUniqueValues(intent.rows)
  const roles = normalizeUniqueValues(intent.roles)
  const intensityMultiplier = [0.45, 0.7, 0.95][intent.intensity - 1] ?? 0.7
  const maximumAllowedCost = promptContext.allowedCostRange[1] ?? 6
  const targetTotalBudget = roundToTenth(maximumAllowedCost * intensityMultiplier)
  const minimumDirectiveBudget = Math.max(
    getMostExpensiveSelectedRoleCost(roles, promptContext.wave, enemyDefinitions),
    roundToTenth(targetTotalBudget / promptContext.recommendedPhaseCount)
  )
  const phaseCount = clampInteger(
    Math.min(promptContext.recommendedPhaseCount, Math.floor(maximumAllowedCost / minimumDirectiveBudget)),
    2,
    10
  )
  const budgetPerDirective = Math.max(minimumDirectiveBudget, roundToTenth(targetTotalBudget / phaseCount))
  const phaseSpacingSeconds = 4

  const phases = Array.from({ length: phaseCount }, (_, phaseIndex) => {
    const row = rowNumbers[phaseIndex % rowNumbers.length] ?? 3
    const role = roles[phaseIndex % roles.length] ?? 'normal'
    const startSecond = roundToTenth(promptContext.safeEarliestStart + phaseIndex * phaseSpacingSeconds)

    return {
      label: buildRealtimePhaseLabel(row, role, intent.intensity),
      startSecond,
      directives: [
        {
          kind: 'role' as const,
          role,
          route: getRouteFromOneBasedRow(row) ?? 'row-3',
          budgetUnits: budgetPerDirective,
          cadence: intent.cadence
        }
      ]
    }
  })

  return {
    pressureGoal: buildRealtimePressureGoal(rowNumbers, roles, intent.intensity),
    nextWaveHint: buildRealtimeNextWaveHint(rowNumbers, roles),
    phases
  }
}

function getMostExpensiveSelectedRoleCost(
  roles: RealtimeAiIntent['roles'],
  waveNumber: number,
  enemyDefinitions: Record<string, EnemyDefinition>
) {
  return Math.max(
    1,
    ...roles.map((role) => getUnlockedEnemyCostForRole(role, waveNumber, enemyDefinitions)).filter((cost) => cost > 0)
  )
}

function getUnlockedEnemyCostForRole(
  role: RealtimeAiIntent['roles'][number],
  waveNumber: number,
  enemyDefinitions: Record<string, EnemyDefinition>
) {
  const expectedRole = getEnemyDefinitionRoleFromIntentRole(role)
  const enemy = Object.values(enemyDefinitions)
    .filter((definition) => definition.role === expectedRole && definition.firstWave <= waveNumber)
    .sort((left, right) => left.firstWave - right.firstWave || left.directorCost - right.directorCost)[0]

  return enemy?.directorCost ?? 0
}

function getEnemyDefinitionRoleFromIntentRole(role: RealtimeAiIntent['roles'][number]) {
  switch (role) {
    case 'fast':
      return 'fast'
    case 'heavyAttack':
      return 'heavy_attack'
    case 'flying':
      return 'flying'
    case 'normal':
    default:
      return 'normal'
  }
}

function sanitizeRealtimeAiIntentInput(parsedJson: unknown) {
  if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) {
    return parsedJson
  }

  const candidate = parsedJson as Record<string, unknown>
  const rows = candidate.rows ?? candidate.row ?? candidate.targetRows
  const roles = candidate.roles ?? candidate.role ?? candidate.enemyTypes

  return {
    rows: Array.isArray(rows) ? rows : [rows],
    roles: Array.isArray(roles) ? roles : [roles],
    intensity: candidate.intensity ?? 2,
    cadence: candidate.cadence ?? getCadenceFromIntensity(candidate.intensity)
  }
}

function normalizeUniqueValues<T>(values: T[]) {
  return [...new Set(values)]
}

function getCadenceFromIntensity(value: unknown) {
  const intensity = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : 2

  if (intensity >= 3) {
    return 'dense'
  }

  if (intensity <= 1) {
    return 'sparse'
  }

  return 'steady'
}

function buildRealtimePhaseLabel(row: number, role: RealtimeAiIntent['roles'][number], intensity: number) {
  const intensityLabel = intensity >= 3 ? '强压' : intensity <= 1 ? '试探' : '施压'
  const roleLabel = getRealtimeRoleLabel(role)

  return `第${row}行${roleLabel}${intensityLabel}`
}

function buildRealtimePressureGoal(rows: number[], roles: RealtimeAiIntent['roles'], intensity: number) {
  const rowText = rows.map((row) => `第${row}行`).join('、')
  const roleText = roles.map(getRealtimeRoleLabel).join('、')
  const intensityText = intensity >= 3 ? '强压' : intensity <= 1 ? '试探' : '施压'

  return trimToThirtyChineseChars(`${rowText}${roleText}${intensityText}`)
}

function buildRealtimeNextWaveHint(rows: number[], roles: RealtimeAiIntent['roles']) {
  const rowText = rows.map((row) => `第${row}行`).join('、')
  const hasFlying = roles.includes('flying')
  const suffix = hasFlying ? '注意补对空' : '注意补防'

  return trimToThirtyChineseChars(`${rowText}${suffix}`)
}

function getRealtimeRoleLabel(role: RealtimeAiIntent['roles'][number]) {
  switch (role) {
    case 'fast':
      return '快怪'
    case 'heavyAttack':
      return '重装'
    case 'flying':
      return '飞行'
    case 'normal':
    default:
      return '普通'
  }
}

function trimToThirtyChineseChars(value: string) {
  return value.length <= 30 ? value : value.slice(0, 30)
}

export function normalizeModelAiWavePlan(parsedJson: unknown) {
  const normalized = AiWavePlanSchema.parse(sanitizeAiWavePlanInput(parsedJson))

  return {
    pressureGoal: normalized.pressureGoal,
    nextWaveHint: normalized.nextWaveHint,
    phases: [...normalized.phases]
      .map((phase) => ({
        label: phase.label,
        description: phase.description,
        startSecond: roundToTenth(phase.startSecond),
        directives: phase.directives.map((directive) =>
          directive.kind === 'role'
            ? {
                kind: 'role' as const,
                role: directive.role,
                route: directive.route,
                budgetUnits: roundToTenth(directive.budgetUnits),
                cadence: directive.cadence,
                startOffset: directive.startOffset === undefined ? undefined : roundToTenth(directive.startOffset)
              }
            : {
                kind: 'enemy' as const,
                enemyId: directive.enemyId,
                route: directive.route,
                count: directive.count,
                cadence: directive.cadence,
                startOffset: directive.startOffset === undefined ? undefined : roundToTenth(directive.startOffset)
              }
        )
      }))
      .sort((left, right) => left.startSecond - right.startSecond)
  } satisfies AiWavePlan
}

function sanitizeAiWavePlanInput(parsedJson: unknown) {
  if (!parsedJson || typeof parsedJson !== 'object' || Array.isArray(parsedJson)) {
    return parsedJson
  }

  const candidate = parsedJson as Record<string, unknown>
  const phases = Array.isArray(candidate.phases) ? candidate.phases : candidate.phases

  return {
    ...candidate,
    pressureGoal: getNonEmptyStringOrDefault(candidate.pressureGoal, '实时增援：按当前战局追加小规模压力。'),
    nextWaveHint: getNonEmptyStringOrDefault(candidate.nextWaveHint, '注意 AI 增援路线，及时补强薄弱防线。'),
    phases: Array.isArray(phases)
      ? phases.map((phase) => {
          if (!phase || typeof phase !== 'object' || Array.isArray(phase)) {
            return phase
          }

          const phaseCandidate = { ...(phase as Record<string, unknown>) }

          if (phaseCandidate.description === null) {
            delete phaseCandidate.description
          }

          if (Array.isArray(phaseCandidate.directives)) {
            phaseCandidate.directives = phaseCandidate.directives.map((directive) => {
              if (!directive || typeof directive !== 'object' || Array.isArray(directive)) {
                return directive
              }

              const directiveCandidate = { ...(directive as Record<string, unknown>) }
              const rowRoute = getRouteFromOneBasedRow(directiveCandidate.row)

              if (directiveCandidate.startOffset === null) {
                delete directiveCandidate.startOffset
              }

              if (rowRoute) {
                directiveCandidate.route = rowRoute
                delete directiveCandidate.row
              }

              return directiveCandidate
            })
          }

          return phaseCandidate
        })
      : phases
  }
}

function getNonEmptyStringOrDefault(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

function getRouteFromOneBasedRow(value: unknown): AiWaveRoute | undefined {
  const rowNumber = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN

  if (!Number.isInteger(rowNumber) || rowNumber < 1 || rowNumber > 5) {
    return undefined
  }

  return `row-${rowNumber}` as AiWaveRoute
}

export function extractJsonObject(content: string) {
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

function resolveLevelId(levelId: string): LevelId | undefined {
  return levelIds.find((candidate) => candidate === levelId)
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
