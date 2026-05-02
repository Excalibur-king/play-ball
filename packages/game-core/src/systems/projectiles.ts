import { lawn } from '@tower-rogue/game-content'
import type { GameEvent, GameState, Projectile } from '../types'

export function updateProjectiles(state: GameState, dt: number, events: GameEvent[]) {
  const projectiles: Projectile[] = []

  for (const projectile of state.projectiles) {
    projectile.x += projectile.speed * dt

    const target = state.zombies
      .filter((zombie) => zombie.row === projectile.row && zombie.hp > 0 && Math.abs(zombie.x - projectile.x) <= 24)
      .sort((a, b) => a.x - b.x)[0]

    if (target) {
      target.hp -= projectile.damage
      events.push({ type: 'zombieHit', zombieId: target.id, at: { x: target.x, y: target.y }, damage: projectile.damage })

      if (target.hp <= 0) {
        events.push({ type: 'zombieKilled', zombieId: target.id, zombieType: target.type, at: { x: target.x, y: target.y } })
      }

      continue
    }

    if (projectile.x <= lawn.spawnX + 80) {
      projectiles.push(projectile)
    }
  }

  state.projectiles = projectiles
  state.zombies = state.zombies.filter((zombie) => zombie.hp > 0)
}
