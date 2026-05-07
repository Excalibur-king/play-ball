import { lawn } from '@tower-rogue/game-content'
import type { GameEvent, GameState, Projectile } from '../types'

export function updateProjectiles(state: GameState, dt: number, events: GameEvent[]) {
  const projectiles: Projectile[] = []
  const hitDistance = 24

  for (const projectile of state.projectiles) {
    const target = state.zombies.find(
      (zombie) => zombie.id === projectile.targetId && zombie.hp > 0 && (!zombie.flying || projectile.canHitFlying)
    )

    if (!target) {
      continue
    }

    const targetX = target.x
    const targetY = target.y - (target.flying ? 30 : 7)
    const dx = targetX - projectile.x
    const dy = targetY - projectile.y
    const distance = Math.hypot(dx, dy)
    const travel = projectile.speed * dt

    // A large frame step can move the projectile from one side of the target
    // to the other without ever landing inside the hit radius at frame start.
    // Resolve the hit as soon as this step would cross the target's hit circle.
    if (distance <= hitDistance + travel) {
      target.hp -= projectile.damage
      events.push({ type: 'zombieHit', zombieId: target.id, at: { x: target.x, y: target.y }, damage: projectile.damage })

      if (target.hp <= 0) {
        state.currentWaveStats.killedByType[target.type] = (state.currentWaveStats.killedByType[target.type] ?? 0) + 1
        events.push({ type: 'zombieKilled', zombieId: target.id, zombieType: target.type, at: { x: target.x, y: target.y } })
      }

      continue
    }

    projectile.x += (dx / distance) * travel
    projectile.y += (dy / distance) * travel
    if (projectile.x <= lawn.spawnX + 80) {
      projectiles.push(projectile)
    }
  }

  state.projectiles = projectiles
  state.zombies = state.zombies.filter((zombie) => zombie.hp > 0)
}
