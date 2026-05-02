import { z } from 'zod'

export const RunPhaseSchema = z.enum(['ready', 'playing', 'won', 'lost'])

export const HiddenDirectorRunSchema = z.object({
  baseHp: z.number().int(),
  sun: z.number().int(),
  wave: z.number().int(),
  phase: RunPhaseSchema,
  plantCount: z.number().int(),
  zombieCount: z.number().int()
})

export const HiddenDirectorRequestSchema = z.object({
  run: HiddenDirectorRunSchema,
  lastOutcome: z.enum(['wave-cleared', 'base-hit', 'manual']).optional()
})

export const HiddenDirectorAdjustmentSchema = z.object({
  spawnIntervalMultiplier: z.number().min(0.75).max(1.25),
  zombieHpMultiplier: z.number().min(0.85).max(1.2),
  sunDripMultiplier: z.number().min(0.85).max(1.25)
})

export const HiddenDirectorResponseSchema = z.object({
  source: z.enum(['backend-mock', 'model']),
  privateDialogue: z.array(z.string()),
  adjustment: HiddenDirectorAdjustmentSchema
})

export type RunPhase = z.infer<typeof RunPhaseSchema>
export type HiddenDirectorRun = z.infer<typeof HiddenDirectorRunSchema>
export type HiddenDirectorRequest = z.infer<typeof HiddenDirectorRequestSchema>
export type HiddenDirectorAdjustment = z.infer<typeof HiddenDirectorAdjustmentSchema>
export type HiddenDirectorResponse = z.infer<typeof HiddenDirectorResponseSchema>
