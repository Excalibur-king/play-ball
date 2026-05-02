import { cellCenter, lawn, plantDefinitions } from '@tower-rogue/game-content'
import { describe, expect, it } from 'vitest'
import { GameEngine } from './engine'
import { updateZombies } from './systems/zombies'
import type { GameEvent, Plant, Zombie } from './types'

describe('GameEngine core rules', () => {
  it('places a selected plant, spends sun, and records a plant placement', () => {
    const engine = new GameEngine()
    engine.dispatch({ type: 'selectPlant', plantType: 'pea-shooter' })
    engine.dispatch({ type: 'placePlant', row: 2, col: 2 })

    expect(engine.state.sun).toBe(150 - plantDefinitions['pea-shooter'].cost)
    expect(engine.state.plants).toHaveLength(1)
    expect(engine.state.plants[0]?.type).toBe('pea-shooter')

    const events = engine.drainEvents()
    expect(events.some((event) => event.type === 'plantPlaced' && event.plantType === 'pea-shooter')).toBe(true)
  })

  it('removes a zombie that reaches the house line and damages the base', () => {
    const engine = new GameEngine()
    const zombie = createZombie({ x: lawn.houseLineX - 1 })
    engine.state.zombies.push(zombie)

    engine.step(0.1)

    expect(engine.state.baseHp).toBe(2)
    expect(engine.state.zombies).toHaveLength(0)

    const events = engine.drainEvents()
    expect(events.some((event) => event.type === 'baseHit' && event.zombieId === zombie.id)).toBe(true)
  })

  it('lets dangerous zombies destroy ordinary plants in one attack', () => {
    const plant = createPlant({ type: 'pea-shooter', components: ['pea-shooter'] })
    const zombie = createZombie({
      category: 'dangerous',
      damage: 22,
      x: plant.x,
      row: plant.row,
      type: 'conehead'
    })
    const engine = new GameEngine()
    const events: GameEvent[] = []
    engine.state.plants = [plant]
    engine.state.zombies = [zombie]

    updateZombies(engine.state, 0.1, events)

    expect(engine.state.plants).toHaveLength(0)
    expect(events.some((event) => event.type === 'plantDestroyed' && event.plantId === plant.id)).toBe(true)
  })

  it('lets wall-nut fusions block dangerous zombie attacks with normal damage', () => {
    const plant = createPlant({
      type: 'pea-shooter',
      components: ['pea-shooter', 'wall-nut'],
      hp: 550,
      maxHp: 550
    })
    const zombie = createZombie({
      category: 'dangerous',
      damage: 22,
      x: plant.x,
      row: plant.row,
      type: 'conehead'
    })
    const engine = new GameEngine()
    const events: GameEvent[] = []
    engine.state.plants = [plant]
    engine.state.zombies = [zombie]

    updateZombies(engine.state, 0.1, events)

    expect(engine.state.plants).toHaveLength(1)
    expect(engine.state.plants[0]?.hp).toBe(528)
    expect(events.some((event) => event.type === 'plantDamaged' && event.blockedDangerous === true)).toBe(true)
  })
})

function createPlant(overrides: Partial<Plant> = {}): Plant {
  const row = overrides.row ?? 2
  const col = overrides.col ?? 3
  const center = cellCenter(row, col)

  return {
    id: 'plant-test',
    type: 'pea-shooter',
    components: ['pea-shooter'],
    row,
    col,
    x: center.x,
    y: center.y,
    hp: 130,
    maxHp: 130,
    shootCooldown: 0,
    sunTimer: 0,
    ...overrides
  }
}

function createZombie(overrides: Partial<Zombie> = {}): Zombie {
  const row = overrides.row ?? 2
  const center = cellCenter(row, lawn.cols - 1)

  return {
    id: 'zombie-test',
    type: 'shambler',
    category: 'normal',
    row,
    x: lawn.spawnX,
    y: center.y,
    hp: 84,
    maxHp: 84,
    speed: 19,
    damage: 18,
    attackCooldown: 0,
    attackInterval: 1.05,
    state: 'walking',
    ...overrides
  }
}
