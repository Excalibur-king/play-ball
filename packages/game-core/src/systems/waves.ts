import { cellCenter, lawn, waves, zombieDefinitions, type ZombieType } from '@tower-rogue/game-content'
import { createEntityId } from '../ids'
import type { GameEvent, GameState } from '../types'

export function updateWave(state: GameState, dt: number) {
  const wave = waves[state.waveIndex]

  if (!wave || !state.wave.active) {
    return
  }

  state.wave.spawnTimer -= dt

  while (state.wave.spawned < wave.totalZombies && state.wave.spawnTimer <= 0) {
    spawnZombie(state)
    state.wave.spawned += 1
    state.wave.spawnTimer += Math.max(0.9, wave.spawnInterval * state.director.spawnIntervalMultiplier)
  }
}

export function checkWaveEnd(state: GameState, events: GameEvent[]) {
  const wave = waves[state.waveIndex]

  if (!wave) {
    return
  }

  const allSpawned = state.wave.spawned >= wave.totalZombies

  if (!allSpawned || state.zombies.length > 0) {
    return
  }

  state.wave.active = false
  events.push({ type: 'waveCleared', waveIndex: state.waveIndex })

  if (state.waveIndex >= waves.length - 1) {
    state.phase = 'won'
    events.push({ type: 'runEnded', outcome: 'won' })
  } else {
    state.waveIndex += 1
    state.phase = 'ready'
  }
}

function spawnZombie(state: GameState) {
  const wave = waves[state.waveIndex]

  if (!wave) {
    return
  }

  const row = (state.wave.spawned * 2 + state.waveIndex) % lawn.rows
  const type = pickZombieType(wave.mix, state.wave.spawned + state.waveIndex)
  const definition = zombieDefinitions[type]
  const center = cellCenter(row, lawn.cols - 1)
  const maxHp = Math.round(definition.hp * wave.zombieHpMultiplier * state.director.zombieHpMultiplier)

  state.zombies.push({
    id: createEntityId('zombie'),
    type,
    category: definition.category,
    row,
    x: lawn.spawnX,
    y: center.y,
    hp: maxHp,
    maxHp,
    speed: definition.speed,
    damage: definition.damage,
    attackCooldown: 0,
    attackInterval: definition.attackInterval,
    state: 'walking'
  })
}

function pickZombieType(mix: Array<{ type: ZombieType; weight: number }>, seed: number): ZombieType {
  const totalWeight = mix.reduce((sum, item) => sum + item.weight, 0)
  let cursor = totalWeight > 0 ? seed % totalWeight : 0

  for (const item of mix) {
    if (cursor < item.weight) {
      return item.type
    }

    cursor -= item.weight
  }

  return 'shambler'
}
