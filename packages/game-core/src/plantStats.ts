import { plantDefinitions } from '@tower-rogue/game-content'
import type { PlantDefinition, PlantType } from '@tower-rogue/game-content'
import type { Plant } from './types'

export type PlantRuntimeStats = {
  hp: number
  damage?: number
  fireInterval?: number
  projectileSpeed?: number
  sunInterval?: number
  sunAmount?: number
  roles: PlantDefinition['role'][]
}

export function getPlantComponents(plant: Pick<Plant, 'type' | 'components'>): PlantType[] {
  return plant.components.length > 0 ? plant.components : [plant.type]
}

export function getPlantRuntimeStats(plant: Pick<Plant, 'type' | 'components'>): PlantRuntimeStats {
  const components = getPlantComponents(plant)
  let hp = 0
  let damage = 0
  let fireInterval: number | undefined
  let projectileSpeed: number | undefined
  let sunInterval: number | undefined
  let sunAmount = 0
  const roles: PlantDefinition['role'][] = []

  for (const type of components) {
    const definition = plantDefinitions[type]
    hp += definition.hp
    roles.push(definition.role)

    if (definition.damage) {
      damage += definition.damage
    }

    if (definition.fireInterval) {
      fireInterval = fireInterval === undefined ? definition.fireInterval : Math.min(fireInterval, definition.fireInterval)
    }

    if (definition.projectileSpeed) {
      projectileSpeed =
        projectileSpeed === undefined ? definition.projectileSpeed : Math.max(projectileSpeed, definition.projectileSpeed)
    }

    if (definition.sunInterval) {
      sunInterval = sunInterval === undefined ? definition.sunInterval : Math.min(sunInterval, definition.sunInterval)
    }

    if (definition.sunAmount) {
      sunAmount += definition.sunAmount
    }
  }

  return {
    hp,
    damage: damage > 0 ? damage : undefined,
    fireInterval,
    projectileSpeed,
    sunInterval,
    sunAmount: sunAmount > 0 ? sunAmount : undefined,
    roles
  }
}

export function canBlockDangerousZombie(plant: Pick<Plant, 'type' | 'components'>) {
  const components = getPlantComponents(plant)
  return components.length > 1 && components.some((type) => plantDefinitions[type].role === 'blocker')
}
