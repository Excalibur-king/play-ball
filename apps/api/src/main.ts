import cors from '@fastify/cors'
import { plantDefinitions, waves, zombieDefinitions } from '@tower-rogue/game-content'
import {
  HiddenDirectorRequestSchema,
  type HiddenDirectorAdjustment,
  type HiddenDirectorResponse,
  type HiddenDirectorRun
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

server.post('/api/director/internal-dialogue', async (request, reply) => {
  const parsed = HiddenDirectorRequestSchema.safeParse(request.body)

  if (!parsed.success) {
    return reply.code(400).send({
      error: 'invalid_hidden_director_request',
      issues: parsed.error.issues
    })
  }

  const run = parsed.data.run
  const adjustment = deriveDirectorAdjustment(run)

  const response: HiddenDirectorResponse = {
    source: 'backend-mock',
    privateDialogue: buildPrivateDialogue(run, adjustment),
    adjustment
  }

  return response
})

const port = Number(process.env.PORT ?? 8787)
const host = process.env.HOST ?? '0.0.0.0'

await server.listen({ port, host })

function deriveDirectorAdjustment(run: HiddenDirectorRun): HiddenDirectorAdjustment {
  if (run.baseHp <= 1) {
    return {
      spawnIntervalMultiplier: 1.14,
      zombieHpMultiplier: 0.92,
      sunDripMultiplier: 1.18
    }
  }

  if (run.plantCount >= 8 && run.sun >= 125) {
    return {
      spawnIntervalMultiplier: 0.88,
      zombieHpMultiplier: 1.08,
      sunDripMultiplier: 0.96
    }
  }

  if (run.zombieCount === 0 && run.sun < 50) {
    return {
      spawnIntervalMultiplier: 1.05,
      zombieHpMultiplier: 0.98,
      sunDripMultiplier: 1.12
    }
  }

  return {
    spawnIntervalMultiplier: 1,
    zombieHpMultiplier: 1,
    sunDripMultiplier: 1
  }
}

function buildPrivateDialogue(run: HiddenDirectorRun, adjustment: HiddenDirectorAdjustment) {
  return [
    `Read run state: wave=${run.wave}, baseHp=${run.baseHp}, sun=${run.sun}, plants=${run.plantCount}.`,
    `Adjust hidden pacing: spawnIntervalMultiplier=${adjustment.spawnIntervalMultiplier}, zombieHpMultiplier=${adjustment.zombieHpMultiplier}, sunDripMultiplier=${adjustment.sunDripMultiplier}.`,
    'No player-facing text is emitted from this director pass.'
  ]
}
