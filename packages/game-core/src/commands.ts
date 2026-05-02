import { cellCenter, getPlantFusionKey, lawn, plantDefinitions, waves } from '@tower-rogue/game-content'
import { createEntityId } from './ids'
import { getPlantRuntimeStats } from './plantStats'
import type { GameEvent, GameState, Plant } from './types'

export function placePlant(state: GameState, row: number, col: number, events: GameEvent[]) {
  if (!isCellInsideLawn(row, col)) {
    return
  }

  const existingPlant = state.plants.find((plant) => plant.row === row && plant.col === col)
  const definition = plantDefinitions[state.selectedPlantType]

  if (existingPlant) {
    fusePlant(state, existingPlant, events)
    return
  }

  if (state.sun < definition.cost || state.seedCooldowns[state.selectedPlantType] > 0) {
    return
  }

  const center = cellCenter(row, col)
  const plant: Plant = {
    id: createEntityId('plant'),
    type: definition.type,
    components: [definition.type],
    row,
    col,
    x: center.x,
    y: center.y,
    hp: definition.hp,
    maxHp: definition.hp,
    shootCooldown: definition.fireInterval ?? 0,
    sunTimer: definition.sunInterval ? definition.sunInterval * 0.35 : 0
  }

  state.sun -= definition.cost
  state.seedCooldowns[definition.type] = definition.cooldown
  state.plants.push(plant)
  events.push({ type: 'plantPlaced', plantId: plant.id, plantType: plant.type, at: center })
  events.push({ type: 'sunChanged', amount: -definition.cost, at: center })
}

export function startWave(state: GameState) {
  if (state.phase !== 'ready' || state.waveIndex >= waves.length) {
    return
  }

  state.phase = 'playing'
  state.wave = {
    active: true,
    spawned: 0,
    spawnTimer: 1.2
  }
}

function isCellInsideLawn(row: number, col: number) {
  return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < lawn.rows && col >= 0 && col < lawn.cols
}

function fusePlant(state: GameState, plant: Plant, events: GameEvent[]) {
  const addedType = state.selectedPlantType
  const addedDefinition = plantDefinitions[addedType]
  const alreadyFused = plant.components.length > 1
  const alreadyContainsType = plant.components.includes(addedType)
  const fusionKey = getPlantFusionKey(plant.type, addedType)

  if (
    alreadyFused ||
    alreadyContainsType ||
    !fusionKey ||
    state.sun < addedDefinition.cost ||
    state.seedCooldowns[addedType] > 0
  ) {
    return
  }

  const previousStats = getPlantRuntimeStats(plant)
  plant.components = [plant.type, addedType]
  plant.fusionKey = fusionKey

  const nextStats = getPlantRuntimeStats(plant)
  plant.maxHp = nextStats.hp
  plant.hp = Math.min(nextStats.hp, plant.hp + addedDefinition.hp)
  plant.shootCooldown = nextStats.fireInterval
    ? previousStats.fireInterval
      ? Math.min(plant.shootCooldown, nextStats.fireInterval)
      : nextStats.fireInterval * 0.35
    : 0
  plant.sunTimer = nextStats.sunInterval
    ? previousStats.sunInterval
      ? Math.min(plant.sunTimer, nextStats.sunInterval)
      : nextStats.sunInterval * 0.5
    : 0

  state.sun -= addedDefinition.cost
  state.seedCooldowns[addedType] = addedDefinition.cooldown
  events.push({ type: 'plantFused', plantId: plant.id, fusionKey, components: [...plant.components], at: { x: plant.x, y: plant.y } })
  events.push({ type: 'sunChanged', amount: -addedDefinition.cost, at: { x: plant.x, y: plant.y } })
}
