import { buildingDefinitions, lawn } from '@tower-rogue/game-content'
import type { GameEvent, GameState, Zombie } from '../types'
import { findBuildingInBiteRange } from './engagement'

export function updateZombies(state: GameState, dt: number, events: GameEvent[]) {
  const zombies: Zombie[] = []

  for (const zombie of state.zombies) {
    if ((zombie.frozenUntil ?? 0) > state.time) {
      zombies.push(zombie)
      continue
    }

    zombie.frozenUntil = undefined
    const target = zombie.flying ? undefined : findBuildingInBiteRange(state.plants, zombie)

    if (target) {
      zombie.state = 'attacking'
      zombie.attackCooldown -= dt

      if (zombie.attackCooldown <= 0) {
        zombie.attackCooldown = zombie.attackInterval || 1
        target.hp -= zombie.buildingDamage

        events.push({
          type: 'plantDamaged',
          plantId: target.id,
          at: { x: target.x, y: target.y },
          dangerous: zombie.category === 'heavy_attack' || zombie.category === 'boss',
          blockedDangerous: buildingDefinitions[target.type].canBlockGround
        })

        if (target.hp <= 0) {
          state.currentWaveStats.destroyedBuildings += 1
          state.currentWaveStats.byLane[target.row]!.destroyedBuildings += 1
          events.push({ type: 'plantDestroyed', plantId: target.id, at: { x: target.x, y: target.y } })
        }

        if (
          target.type === 'lava_wall' &&
          state.activeCardEffects.wallReflectionDamage > 0 &&
          state.time - state.activeCardEffects.wallReflectionLastTriggeredAt >= state.activeCardEffects.wallReflectionInterval
        ) {
          state.activeCardEffects.wallReflectionLastTriggeredAt = state.time
          zombie.hp -= state.activeCardEffects.wallReflectionDamage
          const reflectAt = { x: zombie.x, y: zombie.y }
          events.push({
            type: 'zombieHit',
            zombieId: zombie.id,
            at: reflectAt,
            damage: state.activeCardEffects.wallReflectionDamage
          })
          events.push({
            type: 'cardEffectImpact',
            cardId: 'pivot_wall_feedback',
            at: reflectAt,
            impactKind: 'reflection',
            targetType: 'zombie',
            targetId: zombie.id
          })

          if (zombie.hp <= 0) {
            state.currentWaveStats.killedByType[zombie.type] = (state.currentWaveStats.killedByType[zombie.type] ?? 0) + 1
            events.push({ type: 'zombieKilled', zombieId: zombie.id, zombieType: zombie.type, at: { x: zombie.x, y: zombie.y } })
            continue
          }
        }
      }
    } else {
      zombie.state = 'walking'
      zombie.attackCooldown = Math.min(zombie.attackCooldown, zombie.attackInterval || 1)
      zombie.x -= zombie.speed * lawn.cellWidth * dt
    }

    if (zombie.x <= lawn.houseLineX) {
      const blockedByShield = Math.min(state.activeCardEffects.baseShield, zombie.baseDamage)
      state.activeCardEffects.baseShield -= blockedByShield
      state.baseHp -= zombie.baseDamage - blockedByShield
      state.currentWaveStats.leaks += 1
      state.currentWaveStats.byLane[zombie.row]!.leaks += 1
      events.push({ type: 'baseHit', zombieId: zombie.id })

      if (state.baseHp <= 0) {
        state.baseHp = 0
        state.phase = 'lost'
        state.resultReason = getLossReason(state, zombie)
        events.push({ type: 'runEnded', outcome: 'lost' })
      }

      continue
    }

    zombies.push(zombie)
  }

  state.zombies = zombies
  state.plants = state.plants.filter((plant) => plant.hp > 0)
}

function getLossReason(state: GameState, lastZombie: Zombie) {
  if (state.currentWaveStats.destroyedBuildings > 1) return '魔导具被毁'
  if (lastZombie.flying || state.zombies.some((zombie) => zombie.flying)) return '对空不足'
  if (state.plants.filter((plant) => buildingDefinitions[plant.type].type === 'attack').length === 0) return '输出不足'
  if (state.plants.filter((plant) => buildingDefinitions[plant.type].canBlockGround).length === 0) return '防御不足'
  if (state.sun < 50 && state.plants.filter((plant) => plant.type === 'energy_core').length <= 1) return '购买力不足'
  if (state.lastWaveStats.leaks > 0 || state.currentWaveStats.leaks > 1) return '防线被突破'
  return '底线失守'
}
