import { createEntityId } from '../ids'
import { getPlantRuntimeStats } from '../plantStats'
import type { GameEvent, GameState, Projectile } from '../types'

export function updatePlants(state: GameState, dt: number, events: GameEvent[]) {
  for (const plant of state.plants) {
    const stats = getPlantRuntimeStats(plant)

    if (!stats.fireInterval || !stats.damage || !stats.projectileSpeed) {
      continue
    }

    plant.shootCooldown -= dt

    if (plant.shootCooldown > 0) {
      continue
    }

    const target = state.zombies.find((zombie) => zombie.row === plant.row && zombie.x > plant.x - 8)

    if (!target) {
      continue
    }

    const projectile: Projectile = {
      id: createEntityId('projectile'),
      row: plant.row,
      x: plant.x + 30,
      y: plant.y - 7,
      speed: stats.projectileSpeed,
      damage: stats.damage
    }

    plant.shootCooldown = stats.fireInterval
    state.projectiles.push(projectile)
    events.push({ type: 'projectileFired', projectileId: projectile.id, from: { x: projectile.x, y: projectile.y } })
  }
}
