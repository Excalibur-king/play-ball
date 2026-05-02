import { buildings } from '../balance/buildings.js'
import { cards } from '../balance/cards.js'
import { directorRules as v02DirectorRules } from '../balance/directorRules.js'
import { enemies } from '../balance/enemies.js'
import { maps } from '../balance/maps.js'
import { waves as v02Waves } from '../balance/waves.js'
import type {
  AttackDirection,
  BuildingDef,
  BuildingType,
  DirectorRuleDef,
  EnemyDef,
  EnemyRole,
  StrategyCardDef,
  StrategyCardType,
  WaveDef
} from '../balance/types.js'

export type Point = {
  x: number
  y: number
}

export type BuildingId = (typeof buildings)[number]['id']
export type EnemyId = (typeof enemies)[number]['id']
export type StrategyCardId = (typeof cards)[number]['id']

export type BuildingDefinition = BuildingDef
export type EnemyDefinition = EnemyDef
export type StrategyCardDefinition = StrategyCardDef
export type VolcanoWaveDefinition = WaveDef
export type EnemyCategory = EnemyRole
export type { AttackDirection, BuildingType, DirectorRuleDef, StrategyCardType }

// Compatibility aliases used by the current game-core and render layer while
// V0.2 migrates from plant/zombie wording to building/enemy wording.
export type PlantType = BuildingId
export type ZombieType = EnemyId
export type ZombieCategory = EnemyCategory
export type PlantFusionKey = never
export type PlantDefinition = BuildingDefinition
export type ZombieDefinition = EnemyDefinition
export type WaveDefinition = VolcanoWaveDefinition
export type PlantFusionDefinition = {
  key: PlantFusionKey
  name: string
  components: [PlantType, PlantType]
  artDirection: string
}

export const volcanoMap = maps[0]

export const lawn = {
  rows: 5,
  cols: 9,
  originX: 176,
  originY: 132,
  cellWidth: 104,
  cellHeight: 96,
  houseLineX: 104,
  spawnX: 1188
}

export const buildingTypes = buildings.map((building) => building.id) as BuildingId[]
export const enemyTypes = enemies.map((enemy) => enemy.id) as EnemyId[]
export const strategyCardIds = cards.map((card) => card.id) as StrategyCardId[]

export const buildingDefinitions = Object.fromEntries(buildings.map((building) => [building.id, building])) as unknown as Record<
  BuildingId,
  BuildingDefinition
>

export const enemyDefinitions = Object.fromEntries(enemies.map((enemy) => [enemy.id, enemy])) as unknown as Record<EnemyId, EnemyDefinition>
export const strategyCardDefinitions = Object.fromEntries(cards.map((card) => [card.id, card])) as unknown as Record<
  StrategyCardId,
  StrategyCardDefinition
>

export const volcanoWaves = v02Waves
export const strategyCards = cards
export const directorRules = v02DirectorRules

export const plantTypes = buildingTypes
export const plantDefinitions = buildingDefinitions
export const plantFusionDefinitions = {} as Record<PlantFusionKey, PlantFusionDefinition>
export const zombieDefinitions = enemyDefinitions
export const waves = volcanoWaves

const routeRows: Record<'left' | 'center' | 'right', number[]> = {
  left: [0, 1],
  center: [2],
  right: [3, 4]
}

export function cellCenter(row: number, col: number): Point {
  return {
    x: lawn.originX + col * lawn.cellWidth + lawn.cellWidth / 2,
    y: lawn.originY + row * lawn.cellHeight + lawn.cellHeight / 2
  }
}

export function rowsForRoute(route: 'left' | 'center' | 'right' | 'mixed') {
  if (route === 'mixed') {
    return [0, 1, 2, 3, 4]
  }

  return routeRows[route]
}

export function getPlantFusionKey(): PlantFusionKey | undefined {
  return undefined
}
