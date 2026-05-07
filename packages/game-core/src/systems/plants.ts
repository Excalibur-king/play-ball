import { buildingDefinitions, lawn } from '@tower-rogue/game-content'
import { createEntityId } from '../ids'
import type { GameEvent, GameState, Projectile, Zombie } from '../types'
import { findBuildingInBiteRange } from './engagement'

const projectileSpeed = 420

export function updatePlants(state: GameState, dt: number, events: GameEvent[]) {
  const expiredPlantIds = new Set<string>()

  for (const plant of state.plants) {
    const definition = buildingDefinitions[plant.type]

    if (definition.type !== 'attack' || !definition.attackInterval || !definition.attackPower || !definition.attackRange) {
      continue
    }

    plant.shootCooldown -= dt

    if (plant.shootCooldown > 0) {
      continue
    }

    const target =
      definition.attackKind === 'melee'
        ? findMeleeTarget(state, plant, definition.attackRange, {
            attackDirection: plant.attackDirection,
            canTargetGround: definition.canTargetGround,
            canTargetFlying: definition.canTargetFlying
          })
        : findTarget(state, plant.row, plant.x, definition.attackRange, {
            attackDirection: plant.attackDirection,
            canTargetGround: definition.canTargetGround,
            canTargetFlying: definition.canTargetFlying
          })

    if (!target) {
      continue
    }

    if (plant.chargesRemaining !== undefined && plant.chargesRemaining <= 0) {
      expiredPlantIds.add(plant.id)
      continue
    }

    const upgradedDamage = plant.upgraded ? definition.upgrade?.attackPowerBonus ?? 0 : 0
    const antiAirMultiplier = target.flying && state.activeCardEffects.antiAirFocus ? state.activeCardEffects.antiAirDamageMultiplier : 1
    const damage = Math.round((definition.attackPower + upgradedDamage + state.activeCardEffects.attackPowerBonus) * antiAirMultiplier)
    const interval = Math.max(
      state.activeCardEffects.attackIntervalMin,
      definition.attackInterval + state.activeCardEffects.attackIntervalBonus
    )
    plant.shootCooldown = interval

    if (definition.attackKind === 'melee') {
      target.hp -= damage
      events.push({ type: 'projectileFired', projectileId: plant.id, from: { x: plant.x + 30, y: plant.y - 7 } })
      events.push({ type: 'zombieHit', zombieId: target.id, at: { x: target.x, y: target.y }, damage })

      if (target.hp <= 0) {
        state.currentWaveStats.killedByType[target.type] = (state.currentWaveStats.killedByType[target.type] ?? 0) + 1
        events.push({ type: 'zombieKilled', zombieId: target.id, zombieType: target.type, at: { x: target.x, y: target.y } })
        state.zombies = state.zombies.filter((zombie) => zombie.hp > 0)
      }

      continue
    }

    if (definition.attackKind === 'laser') {
      fireLaser(state, plant, target, damage, definition.attackRange, events)
      consumeCharge(plant, expiredPlantIds)
      continue
    }

    const projectile: Projectile = {
      id: createEntityId('projectile'),
      targetId: target.id,
      row: plant.row,
      x: plant.x + 30,
      y: plant.y - (target.flying ? 30 : 7),
      speed: projectileSpeed,
      damage,
      canHitFlying: Boolean(definition.canTargetFlying),
      visualKey: definition.projectileKey
    }

    consumeCharge(plant, expiredPlantIds)
    state.projectiles.push(projectile)
    events.push({ type: 'projectileFired', projectileId: projectile.id, from: { x: projectile.x, y: projectile.y } })
  }

  if (expiredPlantIds.size > 0) {
    state.plants = state.plants.filter((plant) => !expiredPlantIds.has(plant.id))
  }
}

function findMeleeTarget(
  state: GameState,
  plant: GameState['plants'][number],
  range: number,
  targetRules: {
    attackDirection: GameState['plants'][number]['attackDirection']
    canTargetGround: boolean
    canTargetFlying: boolean
  }
) {
  const retaliatingTargets = sortByDistance(
    state.zombies.filter(
      (zombie) =>
        zombie.hp > 0 &&
        !zombie.flying &&
        targetRules.canTargetGround &&
        findBuildingInBiteRange(state.plants, zombie)?.id === plant.id
    ),
    plant.x,
    plant.row
  )

  if (retaliatingTargets.length > 0) {
    return retaliatingTargets[0]
  }

  return findTarget(state, plant.row, plant.x, range, {
    attackDirection: targetRules.attackDirection,
    canTargetGround: targetRules.canTargetGround,
    canTargetFlying: targetRules.canTargetFlying
  })
}

function findTarget(
  state: GameState,
  row: number,
  buildingX: number,
  range: number,
  targetRules: {
    attackDirection: GameState['plants'][number]['attackDirection']
    canTargetGround: boolean
    canTargetFlying: boolean
  }
): Zombie | undefined {
  const maxDistance = range * lawn.cellWidth
  const maxDistanceSquared = maxDistance * maxDistance
  const candidates = state.zombies.filter(
    (zombie) =>
      zombie.hp > 0 &&
      zombie.row === row &&
      isZombieInAttackDirection(zombie, buildingX, targetRules.attackDirection) &&
      distanceSquared(buildingX, laneY(row), zombie.x, zombie.y) <= maxDistanceSquared &&
      ((zombie.flying && targetRules.canTargetFlying) || (!zombie.flying && targetRules.canTargetGround))
  )

  if (state.activeCardEffects.antiAirFocus) {
    const flying = sortByDistance(candidates.filter((zombie) => zombie.flying), buildingX, row)[0]
    if (flying) {
      return flying
    }
  }

  return sortByDistance(candidates, buildingX, row)[0]
}

function fireLaser(
  state: GameState,
  plant: GameState['plants'][number],
  target: Zombie,
  damage: number,
  range: number,
  events: GameEvent[]
) {
  const from = { x: plant.x + 30, y: plant.y - (target.flying ? 30 : 7) }
  const beamWidth = 34
  const maxDistance = range * lawn.cellWidth
  const targetPoint = { x: target.x, y: target.y - (target.flying ? 30 : 7) }
  const dx = targetPoint.x - from.x
  const dy = targetPoint.y - from.y
  const distance = Math.hypot(dx, dy)
  const to =
    distance > 0
      ? { x: from.x + (dx / distance) * maxDistance, y: from.y + (dy / distance) * maxDistance }
      : targetPoint

  for (const zombie of state.zombies) {
    if (
      zombie.hp <= 0 ||
      zombie.row !== plant.row ||
      !isZombieInAttackDirection(zombie, plant.x, plant.attackDirection) ||
      (zombie.flying && !buildingDefinitions[plant.type].canTargetFlying)
    ) {
      continue
    }

    const zombiePoint = { x: zombie.x, y: zombie.y - (zombie.flying ? 30 : 7) }
    if (distanceSquared(from.x, from.y, zombiePoint.x, zombiePoint.y) > maxDistance * maxDistance) {
      continue
    }

    if (distanceToSegment(zombiePoint.x, zombiePoint.y, from.x, from.y, to.x, to.y) > beamWidth) {
      continue
    }

    zombie.hp -= damage
    events.push({ type: 'zombieHit', zombieId: zombie.id, at: { x: zombie.x, y: zombie.y }, damage })

    if (zombie.hp <= 0) {
      state.currentWaveStats.killedByType[zombie.type] = (state.currentWaveStats.killedByType[zombie.type] ?? 0) + 1
      events.push({ type: 'zombieKilled', zombieId: zombie.id, zombieType: zombie.type, at: { x: zombie.x, y: zombie.y } })
    }
  }

  state.zombies = state.zombies.filter((zombie) => zombie.hp > 0)
  events.push({ type: 'laserFired', plantId: plant.id, from, to })
}

function consumeCharge(plant: GameState['plants'][number], expiredPlantIds: Set<string>) {
  if (plant.chargesRemaining === undefined) {
    return
  }

  plant.chargesRemaining -= 1
  if (plant.chargesRemaining <= 0) {
    expiredPlantIds.add(plant.id)
  }
}

function sortByDistance(zombies: Zombie[], buildingX: number, row: number) {
  const y = laneY(row)
  return zombies.sort((a, b) => distanceSquared(buildingX, y, a.x, a.y) - distanceSquared(buildingX, y, b.x, b.y))
}

// V0.2 attack buildings are fixed to attack rightward. The helper keeps the
// rule in one place so future direction variants can extend it safely.
function isZombieInAttackDirection(
  zombie: Pick<Zombie, 'x' | 'y'>,
  buildingX: number,
  attackDirection: GameState['plants'][number]['attackDirection']
) {
  if (attackDirection === 'left') {
    return zombie.x <= buildingX
  }

  return zombie.x >= buildingX
}

function laneY(row: number) {
  return lawn.originY + row * lawn.cellHeight + lawn.cellHeight / 2
}

function distanceSquared(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  return dx * dx + dy * dy
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lengthSquared = dx * dx + dy * dy

  if (lengthSquared === 0) {
    return Math.sqrt(distanceSquared(px, py, x1, y1))
  }

  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared))
  const closestX = x1 + t * dx
  const closestY = y1 + t * dy
  return Math.sqrt(distanceSquared(px, py, closestX, closestY))
}
