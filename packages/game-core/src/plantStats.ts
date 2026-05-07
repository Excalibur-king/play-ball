import { buildingDefinitions } from '@tower-rogue/game-content'
import type { PlantType } from '@tower-rogue/game-content'
import type { Plant } from './types'

export type PlantRuntimeStats = {
  hp: number
  damage?: number
  fireInterval?: number
  projectileSpeed?: number
  sunInterval?: number
  sunAmount?: number
  roles: Array<'energy' | 'attack' | 'defense'>
}

export function getPlantComponents(plant: Pick<Plant, 'type' | 'components'>): PlantType[] {
  return plant.components.length > 0 ? plant.components : [plant.type]
}

export function getPlantRuntimeStats(plant: Pick<Plant, 'type' | 'components'>): PlantRuntimeStats {
  const components = getPlantComponents(plant)
  let hp = 0
  let damage = 0
  let fireInterval: number | undefined
  let sunInterval: number | undefined
  let sunAmount = 0
  const roles: PlantRuntimeStats['roles'] = []

  for (const type of components) {
    const definition = buildingDefinitions[type]
    hp += definition.hp
    roles.push(definition.type)

    if (definition.attackPower) {
      damage += definition.attackPower
    }

    if (definition.attackInterval) {
      fireInterval = fireInterval === undefined ? definition.attackInterval : Math.min(fireInterval, definition.attackInterval)
    }

    if (definition.productionInterval) {
      sunInterval = sunInterval === undefined ? definition.productionInterval : Math.min(sunInterval, definition.productionInterval)
    }

    if (definition.purchasePowerPerTick) {
      sunAmount += definition.purchasePowerPerTick
    }
  }

  return {
    hp,
    damage: damage > 0 ? damage : undefined,
    fireInterval,
    projectileSpeed: 420,
    sunInterval,
    sunAmount: sunAmount > 0 ? sunAmount : undefined,
    roles
  }
}

export function canBlockDangerousZombie(plant: Pick<Plant, 'type' | 'components'>) {
  return getPlantComponents(plant).some((type) => buildingDefinitions[type].canBlockGround)
}

