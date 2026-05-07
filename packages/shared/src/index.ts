import { z } from 'zod'

export const RunPhaseSchema = z.enum(['ready', 'playing', 'card_select', 'won', 'lost'])
export const StrategyCardSelectionSourceSchema = z.enum(['wave-cleared', 'active-skill'])
export const RecommendationSlotSchema = z.enum(['emergency', 'synergy', 'pivot'])
export const DirectorIntentSchema = z.enum([
  'relief',
  'probe_fast',
  'probe_anti_air',
  'pressure_economy',
  'split_pressure',
  'boss_setup'
])
export const DirectorRouteSchema = z.enum(['left', 'center', 'right', 'mixed'])
export const AiWaveRouteSchema = z.enum(['left', 'center', 'right', 'mixed', 'row-1', 'row-2', 'row-3', 'row-4', 'row-5'])
export const DirectorTimingStyleSchema = z.enum(['frontload', 'steady', 'backload'])
export const DirectorThreatLevelSchema = z.enum(['low', 'medium', 'high', 'critical'])
export const LanePressureSchema = z.object({
  lane: z.number().int(),
  leaksLastWave: z.number().int(),
  enemiesReachedFront: z.number().int(),
  destroyedBuildingsLastWave: z.number().int(),
  groundDps: z.number(),
  flyingDps: z.number(),
  blockHp: z.number(),
  economyValue: z.number(),
  pressureScore: z.number().min(0).max(1)
})

export const BattleSnapshotSchema = z.object({
  wave: z.number().int(),
  baseHp: z.number().int(),
  purchasePower: z.number().int(),
  leaksLastWave: z.number().int(),
  destroyedBuildingsLastWave: z.number().int(),
  buildingCounts: z.object({
    energy: z.number().int(),
    attack: z.number().int(),
    defense: z.number().int()
  }),
  outputProfile: z.object({
    groundDamage: z.number(),
    flyingDamage: z.number(),
    attackCoverage: z.number(),
    blockCapacity: z.number(),
    energyIncome: z.number()
  }),
  pressureProfile: z.object({
    groundPressure: z.number(),
    flyingPressure: z.number(),
    fastPressure: z.number(),
    buildingDamagePressure: z.number()
  }),
  lanePressure: z.array(LanePressureSchema),
  nextWavePreview: z.object({
    normal: z.number().int(),
    fast: z.number().int(),
    heavyAttack: z.number().int(),
    flying: z.number().int(),
    hasBoss: z.boolean()
  }),
  problemTags: z.array(z.string()),
  chosenCardTags: z.array(z.string())
})

export const DirectorDecisionParamsSchema = z.object({
  intent: DirectorIntentSchema,
  aggression: z.number().min(0).max(1),
  primaryRoute: DirectorRouteSchema,
  secondaryRoute: DirectorRouteSchema.exclude(['mixed']).optional(),
  roleWeights: z.object({
    normal: z.number().nonnegative(),
    fast: z.number().nonnegative(),
    heavyAttack: z.number().nonnegative(),
    flying: z.number().nonnegative()
  }),
  spendRatio: z.number().min(0).max(1),
  timingStyle: DirectorTimingStyleSchema
})

export const DirectorPreviewTextSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  tags: z.array(z.string()),
  threatLevel: DirectorThreatLevelSchema
})

export const DirectorHistoryEntrySchema = z.object({
  wave: z.number().int(),
  intent: DirectorIntentSchema,
  primaryRoute: DirectorRouteSchema,
  reasonTag: z.string().optional()
})

export const StrategyAdviceCardInputSchema = z.object({
  cardId: z.string(),
  slot: RecommendationSlotSchema,
  score: z.number().int(),
  reason: z.string()
})

export const StrategyAdviceRequestSchema = z.object({
  source: StrategyCardSelectionSourceSchema,
  snapshot: BattleSnapshotSchema
})

export const BattleAdviceUnitSchema = z.object({
  type: z.string(),
  row: z.number().int(),
  col: z.number().int().optional(),
  x: z.number().optional(),
  hp: z.number().int(),
  maxHp: z.number().int().optional()
})

export const BattleAdviceRequestSchema = z.object({
  baseHp: z.number().int(),
  purchasePower: z.number().int(),
  wave: z.number().int(),
  phase: RunPhaseSchema,
  plants: z.array(BattleAdviceUnitSchema),
  enemies: z.array(BattleAdviceUnitSchema),
  recommendations: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      slot: RecommendationSlotSchema
    })
  )
})

export const DirectorParamsRequestSchema = z.object({
  levelId: z.string(),
  snapshot: BattleSnapshotSchema,
  lastDirectorReasonTag: z.string().nullable().optional(),
  recentDirectorHistory: z.array(DirectorHistoryEntrySchema).max(3).optional()
})

export const DirectorParamsResponseSchema = DirectorDecisionParamsSchema.nullable()

export const AiWaveRoleSchema = z.enum(['normal', 'fast', 'heavyAttack', 'flying'])
export const AiWaveCadenceSchema = z.enum(['sparse', 'steady', 'dense'])
export const AiWaveDirectiveSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('role'),
    role: AiWaveRoleSchema,
    route: AiWaveRouteSchema,
    budgetUnits: z.number().positive(),
    cadence: AiWaveCadenceSchema,
    startOffset: z.number().nonnegative().optional()
  }),
  z.object({
    kind: z.literal('enemy'),
    enemyId: z.string().min(1),
    route: AiWaveRouteSchema,
    count: z.number().int().positive(),
    cadence: AiWaveCadenceSchema,
    startOffset: z.number().nonnegative().optional()
  })
])

export const AiWavePhaseSchema = z.object({
  label: z.string().min(1),
  description: z.string().min(1).optional(),
  startSecond: z.number().nonnegative(),
  directives: z.array(AiWaveDirectiveSchema).min(1)
})

export const AiWavePlanSchema = z.object({
  pressureGoal: z.string().min(1),
  nextWaveHint: z.string().min(1),
  phases: z.array(AiWavePhaseSchema).min(1).max(10)
})

export const AiWavePlanRequestSchema = z.object({
  levelId: z.string(),
  snapshot: BattleSnapshotSchema,
  lastDirectorReasonTag: z.string().nullable().optional(),
  recentDirectorHistory: z.array(DirectorHistoryEntrySchema).max(3).optional()
})

export const AiWavePlanResponseSchema = AiWavePlanSchema.nullable()

export const RealtimeAiWavePlanRequestSchema = AiWavePlanRequestSchema.extend({
  currentWaveElapsed: z.number().nonnegative()
})

export const RealtimeAiWavePlanResponseSchema = AiWavePlanResponseSchema

export const AiWaveCompiledPhaseSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  startSecond: z.number().nonnegative(),
  endSecond: z.number().nonnegative()
})

export const AiWaveCompiledGroupSchema = z.object({
  enemyId: z.string(),
  count: z.number().int().positive(),
  route: AiWaveRouteSchema,
  startSecond: z.number().nonnegative(),
  interval: z.number().positive()
})

export const AiWaveCompileResultSchema = z.object({
  targetWaveIndex: z.number().int().nonnegative(),
  pressureGoal: z.string(),
  nextWaveHint: z.string(),
  phases: z.array(AiWaveCompiledPhaseSchema),
  groups: z.array(AiWaveCompiledGroupSchema),
  preview: DirectorPreviewTextSchema,
  source: z.literal('ai-wave-director')
})

export const StrategyAdviceResponseSchema = z.object({
  source: z.enum(['backend-mock', 'model']),
  summary: z.string(),
  commanderLine: z.string().optional(),
  recommendations: z.array(
    z.object({
      cardId: z.string(),
      slot: RecommendationSlotSchema,
      reason: z.string()
    })
  )
})

export const StrategyAdviceDebugMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string()
})

export const StrategyAdviceDebugRequestSchema = z.object({
  createdAt: z.string(),
  model: z.string(),
  baseUrl: z.string(),
  timeoutMs: z.number().int().nonnegative(),
  source: StrategyCardSelectionSourceSchema,
  wave: z.number().int(),
  apiRequest: StrategyAdviceRequestSchema,
  promptPayload: z.unknown(),
  messages: z.array(StrategyAdviceDebugMessageSchema)
})

export const StrategyAdviceDebugModelResponseSchema = z.object({
  receivedAt: z.string(),
  model: z.string().nullable(),
  usage: z.unknown().nullable(),
  content: z.string().nullable()
})

export const StrategyAdviceDebugErrorSchema = z.object({
  at: z.string(),
  message: z.string(),
  name: z.string().optional()
})

export const StrategyAdviceDebugSnapshotSchema = z.object({
  updatedAt: z.string(),
  request: StrategyAdviceDebugRequestSchema.nullable(),
  rawResponse: StrategyAdviceDebugModelResponseSchema.nullable(),
  parsedResponse: StrategyAdviceResponseSchema.nullable(),
  finalResponse: StrategyAdviceResponseSchema.nullable(),
  error: StrategyAdviceDebugErrorSchema.nullable(),
  durationMs: z.number().nonnegative().nullable(),
  usedFallback: z.boolean(),
  fallbackReason: z.string().nullable()
})

export const StrategyAdviceDebugEnvelopeSchema = z.object({
  latest: StrategyAdviceDebugSnapshotSchema.nullable()
})

export const DirectorDebugRequestSchema = z.object({
  createdAt: z.string(),
  model: z.string(),
  baseUrl: z.string(),
  timeoutMs: z.number().int().nonnegative(),
  levelId: z.string(),
  wave: z.number().int(),
  apiRequest: DirectorParamsRequestSchema,
  promptPayload: z.unknown(),
  messages: z.array(StrategyAdviceDebugMessageSchema)
})

export const DirectorDebugModelResponseSchema = z.object({
  receivedAt: z.string(),
  model: z.string().nullable(),
  usage: z.unknown().nullable(),
  content: z.string().nullable()
})

export const DirectorDebugSnapshotSchema = z.object({
  updatedAt: z.string(),
  request: DirectorDebugRequestSchema.nullable(),
  rawResponse: DirectorDebugModelResponseSchema.nullable(),
  parsedResponse: DirectorParamsResponseSchema,
  finalResponse: DirectorParamsResponseSchema,
  resultSource: z.enum(['model', 'fallback', 'none']),
  error: StrategyAdviceDebugErrorSchema.nullable(),
  durationMs: z.number().nonnegative().nullable(),
  usedFallback: z.boolean(),
  fallbackReason: z.string().nullable()
})

export const DirectorDebugEnvelopeSchema = z.object({
  latest: DirectorDebugSnapshotSchema.nullable()
})

export const AiWaveDebugRequestSchema = z.object({
  createdAt: z.string(),
  model: z.string(),
  baseUrl: z.string(),
  timeoutMs: z.number().int().nonnegative(),
  levelId: z.string(),
  wave: z.number().int(),
  apiRequest: AiWavePlanRequestSchema,
  promptPayload: z.unknown(),
  messages: z.array(StrategyAdviceDebugMessageSchema)
})

export const AiWaveDebugModelResponseSchema = z.object({
  receivedAt: z.string(),
  model: z.string().nullable(),
  usage: z.unknown().nullable(),
  content: z.string().nullable()
})

export const AiWaveDebugSnapshotSchema = z.object({
  updatedAt: z.string(),
  request: AiWaveDebugRequestSchema.nullable(),
  rawResponse: AiWaveDebugModelResponseSchema.nullable(),
  parsedPlan: AiWavePlanResponseSchema,
  compileResult: AiWaveCompileResultSchema.nullable(),
  finalResponse: AiWavePlanResponseSchema,
  error: StrategyAdviceDebugErrorSchema.nullable(),
  durationMs: z.number().nonnegative().nullable(),
  usedFallback: z.boolean(),
  fallbackReason: z.string().nullable()
})

export const AiWaveDebugEnvelopeSchema = z.object({
  latest: AiWaveDebugSnapshotSchema.nullable()
})

export type RunPhase = z.infer<typeof RunPhaseSchema>
export type StrategyCardSelectionSource = z.infer<typeof StrategyCardSelectionSourceSchema>
export type RecommendationSlot = z.infer<typeof RecommendationSlotSchema>
export type DirectorIntent = z.infer<typeof DirectorIntentSchema>
export type DirectorRoute = z.infer<typeof DirectorRouteSchema>
export type AiWaveRoute = z.infer<typeof AiWaveRouteSchema>
export type DirectorTimingStyle = z.infer<typeof DirectorTimingStyleSchema>
export type DirectorThreatLevel = z.infer<typeof DirectorThreatLevelSchema>
export type LanePressure = z.infer<typeof LanePressureSchema>
export type BattleSnapshot = z.infer<typeof BattleSnapshotSchema>
export type DirectorDecisionParams = z.infer<typeof DirectorDecisionParamsSchema>
export type DirectorPreviewText = z.infer<typeof DirectorPreviewTextSchema>
export type DirectorHistoryEntry = z.infer<typeof DirectorHistoryEntrySchema>
export type BattleAdviceUnit = z.infer<typeof BattleAdviceUnitSchema>
export type BattleAdviceRequest = z.infer<typeof BattleAdviceRequestSchema>
export type StrategyAdviceCardInput = z.infer<typeof StrategyAdviceCardInputSchema>
export type StrategyAdviceRequest = z.infer<typeof StrategyAdviceRequestSchema>
export type DirectorParamsRequest = z.infer<typeof DirectorParamsRequestSchema>
export type DirectorParamsResponse = z.infer<typeof DirectorParamsResponseSchema>
export type AiWaveRole = z.infer<typeof AiWaveRoleSchema>
export type AiWaveCadence = z.infer<typeof AiWaveCadenceSchema>
export type AiWaveDirective = z.infer<typeof AiWaveDirectiveSchema>
export type AiWavePhase = z.infer<typeof AiWavePhaseSchema>
export type AiWavePlan = z.infer<typeof AiWavePlanSchema>
export type AiWavePlanRequest = z.infer<typeof AiWavePlanRequestSchema>
export type AiWavePlanResponse = z.infer<typeof AiWavePlanResponseSchema>
export type RealtimeAiWavePlanRequest = z.infer<typeof RealtimeAiWavePlanRequestSchema>
export type RealtimeAiWavePlanResponse = z.infer<typeof RealtimeAiWavePlanResponseSchema>
export type AiWaveCompiledPhase = z.infer<typeof AiWaveCompiledPhaseSchema>
export type AiWaveCompiledGroup = z.infer<typeof AiWaveCompiledGroupSchema>
export type AiWaveCompileResult = z.infer<typeof AiWaveCompileResultSchema>
export type StrategyAdviceResponse = z.infer<typeof StrategyAdviceResponseSchema>
export type StrategyAdviceDebugMessage = z.infer<typeof StrategyAdviceDebugMessageSchema>
export type StrategyAdviceDebugRequest = z.infer<typeof StrategyAdviceDebugRequestSchema>
export type StrategyAdviceDebugModelResponse = z.infer<typeof StrategyAdviceDebugModelResponseSchema>
export type StrategyAdviceDebugError = z.infer<typeof StrategyAdviceDebugErrorSchema>
export type StrategyAdviceDebugSnapshot = z.infer<typeof StrategyAdviceDebugSnapshotSchema>
export type DirectorDebugRequest = z.infer<typeof DirectorDebugRequestSchema>
export type DirectorDebugModelResponse = z.infer<typeof DirectorDebugModelResponseSchema>
export type DirectorDebugSnapshot = z.infer<typeof DirectorDebugSnapshotSchema>
export type AiWaveDebugRequest = z.infer<typeof AiWaveDebugRequestSchema>
export type AiWaveDebugModelResponse = z.infer<typeof AiWaveDebugModelResponseSchema>
export type AiWaveDebugSnapshot = z.infer<typeof AiWaveDebugSnapshotSchema>
