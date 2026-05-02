import type { GameEvent, GameState, Plant, Zombie } from '../types'
import { lawn } from '@tower-rogue/game-content'
import { canBlockDangerousZombie } from '../plantStats'

export function updateZombies(state: GameState, dt: number, events: GameEvent[]) {
  const zombies: Zombie[] = []

  for (const zombie of state.zombies) {
    const target = findPlantInBiteRange(state.plants, zombie)

    if (target) {
      zombie.state = 'attacking'
      zombie.attackCooldown -= dt

      if (zombie.attackCooldown <= 0) {
        zombie.attackCooldown = zombie.attackInterval
        const blockedDangerous = zombie.category === 'dangerous' && canBlockDangerousZombie(target)

        if (zombie.category === 'dangerous' && !blockedDangerous) {
          target.hp = 0
        } else {
          target.hp -= zombie.damage
        }

        events.push({
          type: 'plantDamaged',
          plantId: target.id,
          at: { x: target.x, y: target.y },
          dangerous: zombie.category === 'dangerous',
          blockedDangerous
        })

        if (target.hp <= 0) {
          events.push({ type: 'plantDestroyed', plantId: target.id, at: { x: target.x, y: target.y } })
        }
      }
    } else {
      zombie.state = 'walking'
      zombie.attackCooldown = Math.min(zombie.attackCooldown, zombie.attackInterval)
      zombie.x -= zombie.speed * dt
    }

    if (zombie.x <= lawn.houseLineX) {
      state.baseHp -= 1
      events.push({ type: 'baseHit', zombieId: zombie.id })

      if (state.baseHp <= 0) {
        state.baseHp = 0
        state.phase = 'lost'
        events.push({ type: 'runEnded', outcome: 'lost' })
      }

      continue
    }

    zombies.push(zombie)
  }

  state.zombies = zombies
  state.plants = state.plants.filter((plant) => plant.hp > 0)
}

function findPlantInBiteRange(plants: Plant[], zombie: Zombie) {
  return plants
    .filter((plant) => plant.hp > 0 && plant.row === zombie.row && plant.x <= zombie.x + 32 && plant.x >= zombie.x - 44)
    .sort((a, b) => b.x - a.x)[0]
}
