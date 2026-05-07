import './env.js'
import cors from '@fastify/cors'
import { plantDefinitions, waves, zombieDefinitions } from '@tower-rogue/game-content'
import { getLatestAiWaveDebug } from './aiWaveDebug.js'
import { generateRealtimeAiWavePlan } from './aiWavePlan.js'
import { generateStrategyAdviceWithDeepSeek, streamBattleAdviceWithDeepSeek } from './deepseek.js'
import { getLatestDirectorDebug } from './directorDebug.js'
import { generateDirectorParams } from './directorParams.js'
import { getLatestStrategyAdviceDebug } from './strategyAdviceDebug.js'
import { getStrategyAdviceMetricsDir } from './strategyAdviceMetrics.js'
import {
  AiWaveDebugEnvelopeSchema,
  BattleAdviceRequestSchema,
  DirectorDebugEnvelopeSchema,
  DirectorParamsRequestSchema,
  RealtimeAiWavePlanRequestSchema,
  StrategyAdviceDebugEnvelopeSchema,
  StrategyAdviceRequestSchema
} from '@tower-rogue/shared'
import Fastify from 'fastify'

const server = Fastify({
  logger: true
})

await server.register(cors, {
  origin: true
})

server.get('/api/health', async () => ({
  ok: true,
  service: 'yard-defense-api'
}))

server.get('/api/content/game', async () => ({
  plants: plantDefinitions,
  zombies: zombieDefinitions,
  waves
}))

server.get('/api/debug/strategy-advice/latest', async (_request, reply) => {
  reply.header('cache-control', 'no-store')

  return StrategyAdviceDebugEnvelopeSchema.parse({
    latest: getLatestStrategyAdviceDebug()
  })
})

server.get('/api/debug/director/latest', async (_request, reply) => {
  reply.header('cache-control', 'no-store')

  return DirectorDebugEnvelopeSchema.parse({
    latest: getLatestDirectorDebug()
  })
})

server.get('/api/debug/ai-wave/latest', async (_request, reply) => {
  reply.header('cache-control', 'no-store')

  return AiWaveDebugEnvelopeSchema.parse({
    latest: getLatestAiWaveDebug()
  })
})

server.post('/api/advice/draw-cards', async (request, reply) => {
  const parsed = BattleAdviceRequestSchema.safeParse(request.body)

  if (!parsed.success) {
    return reply.code(400).send({
      error: 'invalid_battle_advice_request',
      issues: parsed.error.issues
    })
  }

  const origin = request.headers.origin
  reply.raw.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': typeof origin === 'string' ? origin : '*',
    Vary: 'Origin'
  })

  try {
    await streamBattleAdviceWithDeepSeek(parsed.data, (chunk) => {
      reply.raw.write(chunk)
    })
  } catch (error) {
    request.log.warn(
      {
        err: error,
        wave: parsed.data.wave
      },
      'Battle advice stream failed.'
    )
    reply.raw.write('AI分析暂不可用，优先补足薄弱路线，并选择能立刻缓解当前压力的卡牌。')
  } finally {
    reply.raw.end()
  }
})

server.post('/api/strategy/advice', async (request, reply) => {
  const parsed = StrategyAdviceRequestSchema.safeParse(request.body)

  if (!parsed.success) {
    return reply.code(400).send({
      error: 'invalid_strategy_advice_request',
      issues: parsed.error.issues
    })
  }

  try {
    return await generateStrategyAdviceWithDeepSeek(parsed.data)
  } catch (error) {
    request.log.warn(
      {
        err: error,
        source: parsed.data.source,
        wave: parsed.data.snapshot.wave
      },
      'Strategy advice model request failed.'
    )

    return reply.code(502).send({
      error: 'strategy_advice_unavailable',
      message: getErrorMessage(error)
    })
  }
})

server.post('/api/director/next-wave-params', async (request, reply) => {
  const parsed = DirectorParamsRequestSchema.safeParse(request.body)

  if (!parsed.success) {
    return reply.code(400).send({
      error: 'invalid_director_params_request',
      issues: parsed.error.issues
    })
  }

  try {
    return generateDirectorParams(parsed.data)
  } catch (error) {
    request.log.warn(
      {
        err: error,
        levelId: parsed.data.levelId,
        wave: parsed.data.snapshot.wave
      },
      'Director params request failed.'
    )

    return reply.code(502).send({
      error: 'director_params_unavailable',
      message: getErrorMessage(error)
    })
  }
})

server.post('/api/director/realtime-wave-plan', async (request, reply) => {
  const parsed = RealtimeAiWavePlanRequestSchema.safeParse(request.body)

  if (!parsed.success) {
    return reply.code(400).send({
      error: 'invalid_realtime_ai_wave_plan_request',
      issues: parsed.error.issues
    })
  }

  try {
    return generateRealtimeAiWavePlan(parsed.data)
  } catch (error) {
    request.log.warn(
      {
        err: error,
        levelId: parsed.data.levelId,
        wave: parsed.data.snapshot.wave
      },
      'Realtime AI wave plan request failed.'
    )

    return reply.code(502).send({
      error: 'realtime_ai_wave_plan_unavailable',
      message: getErrorMessage(error)
    })
  }
})

const port = Number(process.env.PORT ?? 8787)
const host = process.env.HOST ?? '0.0.0.0'

server.log.info(
  {
    strategyAdviceMetricsDir: getStrategyAdviceMetricsDir()
  },
  'Strategy advice metrics will be persisted to disk.'
)

await server.listen({ port, host })

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}
