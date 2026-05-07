import { buildingDefinitions } from '@tower-rogue/game-content'
import type { Plant, Zombie } from '../types'

export function findBuildingInBiteRange(plants: Plant[], zombie: Zombie) {
  const candidates = plants.filter(
    (plant) => plant.hp > 0 && plant.row === zombie.row && plant.x <= zombie.x + 32 && plant.x >= zombie.x - 44
  )
  const blockers = candidates.filter((plant) => buildingDefinitions[plant.type].canBlockGround)

  return (blockers.length > 0 ? blockers : candidates).sort((a, b) => b.x - a.x)[0]
}
