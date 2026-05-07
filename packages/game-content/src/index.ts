import { aiStrategy as v02AiStrategy } from '../balance/aiStrategy.js'
import { buildings } from '../balance/buildings.js'
import { cards } from '../balance/cards.js'
import { directorRules as v02DirectorRules } from '../balance/directorRules.js'
import { enemyBalanceProfiles } from '../balance/enemyBalanceProfiles.js'
import { enemies } from '../balance/enemies.js'
import { maps } from '../balance/maps.js'
import { waves as v02Waves } from '../balance/waves.js'
import type {
  AiStrategyConfigDef,
  AttackDirection,
  AttackKind,
  BuildingDef,
  BuildingType,
  ContentStatus,
  DirectorIntentDef,
  DirectorPolicyDef,
  DirectorRuleDef,
  EnemyBalanceProfileDef,
  EnemyBalanceScalarModifier,
  EnemyDef,
  EnemyRole,
  StrategyCardDef,
  StrategyCardType,
  WaveDef,
  WavePhaseDef
} from '../balance/types.js'

export type Point = {
  x: number
  y: number
}

export type LevelDefinition = {
  id: string
  order: number
  name: string
  difficulty: 'easy' | 'normal' | 'hard'
  enemyProfileId: EnemyBalanceProfileId
  mapId: string
  waveCount: number
  clearReward: {
    gold: [number, number]
    skillCrystals: [number, number]
    firstClearCardId?: StrategyCardId
  }
  chapterLabel: string
  summary: string
  briefing: string
  accentLabel: string
  unlockText: string
  recommendedRunTimeMinutes: [number, number]
  status: ContentStatus
}

export type BuildingId = (typeof buildings)[number]['id']
export type EnemyId = (typeof enemies)[number]['id']
export type StrategyCardId = (typeof cards)[number]['id']
export type EnemyBalanceProfileId = (typeof enemyBalanceProfiles)[number]['id']

export type BuildingDefinition = BuildingDef
export type EnemyDefinition = EnemyDef
export type StrategyCardDefinition = StrategyCardDef
export type VolcanoWaveDefinition = WaveDef
export type EnemyBalanceProfileDefinition = EnemyBalanceProfileDef
export type EnemyCategory = EnemyRole
export type {
  AiStrategyConfigDef,
  AttackDirection,
  AttackKind,
  BuildingType,
  DirectorIntentDef,
  DirectorPolicyDef,
  DirectorRuleDef,
  EnemyBalanceScalarModifier,
  StrategyCardType,
  WavePhaseDef
}

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

export const levels = [
  {
    id: 'volcano_frontier_easy',
    order: 1,
    name: '火山前线·简单',
    difficulty: 'easy',
    enemyProfileId: 'standard',
    mapId: 'volcano',
    waveCount: 3,
    clearReward: {
      gold: [100, 1000],
      skillCrystals: [1, 3]
    },
    chapterLabel: 'Episode 01',
    summary: '3 波短战，适合快速刷取金币和技能原石。',
    briefing: '能源核心先站稳，顶住前三波火山敌人的基础压力。',
    accentLabel: 'Easy Run',
    unlockText: '默认解锁',
    recommendedRunTimeMinutes: [1, 3],
    status: 'draft'
  },
  {
    id: 'volcano_frontier',
    order: 2,
    name: '火山前线·困难',
    difficulty: 'hard',
    enemyProfileId: 'standard',
    mapId: 'volcano',
    waveCount: 5,
    clearReward: {
      gold: [800, 2000],
      skillCrystals: [3, 5],
      firstClearCardId: 'reward_fire_dragon_breath'
    },
    chapterLabel: 'Episode 01+',
    summary: '完整 5 波火山挑战，首次通关会解锁地图技能卡。',
    briefing: '能源核心先站稳，随后补火力与阻挡，最后顶住火山核心兽的冲锋。',
    accentLabel: 'Hard Run',
    unlockText: '默认解锁',
    recommendedRunTimeMinutes: [2, 5],
    status: 'draft'
  }
] as const satisfies readonly LevelDefinition[]

export type LevelId = (typeof levels)[number]['id']
export const defaultLevelId = levels[0].id

const mapDefinitions = Object.fromEntries(maps.map((map) => [map.id, map])) as Record<(typeof maps)[number]['id'], (typeof maps)[number]>
const levelDefinitionsRecord = Object.fromEntries(levels.map((level) => [level.id, level])) as Record<LevelId, (typeof levels)[number]>
const enemyBalanceProfileDefinitions = Object.fromEntries(
  enemyBalanceProfiles.map((profile) => [profile.id, profile])
) as Record<EnemyBalanceProfileId, (typeof enemyBalanceProfiles)[number]>

export const volcanoMap = mapDefinitions[levels[0].mapId]

export const lawn = {
  rows: 5,
  cols: 9,
  buildableColStart: 0,
  buildableColEnd: 8,
  originX: 100,
  originY: 60,
  cellWidth: 120,
  cellHeight: 120,
  houseLineX: 40,
  spawnX: 1240
}

export const buildingTypes = buildings.map((building) => building.id) as BuildingId[]
export const enemyTypes = enemies.map((enemy) => enemy.id) as EnemyId[]
export const strategyCardIds = cards.map((card) => card.id) as StrategyCardId[]
export const enemyBalanceProfileIds = enemyBalanceProfiles.map((profile) => profile.id) as EnemyBalanceProfileId[]

export const buildingDefinitions = Object.fromEntries(buildings.map((building) => [building.id, building])) as unknown as Record<
  BuildingId,
  BuildingDefinition
>

export const enemyDefinitions = Object.fromEntries(enemies.map((enemy) => [enemy.id, enemy])) as unknown as Record<EnemyId, EnemyDefinition>
export const enemyBalanceProfileRecords = enemyBalanceProfileDefinitions

const enemyDefinitionsByProfile = Object.fromEntries(
  enemyBalanceProfiles.map((profile) => [profile.id, resolveEnemyDefinitionsForProfile(profile)])
) as Record<EnemyBalanceProfileId, Record<EnemyId, EnemyDefinition>>

export const strategyCardDefinitions = Object.fromEntries(cards.map((card) => [card.id, card])) as unknown as Record<
  StrategyCardId,
  StrategyCardDefinition
>

export const volcanoWaves = v02Waves
export const strategyCards = cards
export const directorRules = v02DirectorRules
export const aiStrategy = v02AiStrategy
export { enemyBalanceProfiles }
export const enemyBalanceProfileDefinitionsMap = enemyBalanceProfileDefinitions
export const levelIds = levels.map((level) => level.id) as LevelId[]
export const levelDefinitions = levelDefinitionsRecord

export const plantTypes = buildingTypes
export const plantDefinitions = buildingDefinitions
export const plantFusionDefinitions = {} as Record<PlantFusionKey, PlantFusionDefinition>
export const zombieDefinitions = enemyDefinitions
export const waves = v02Waves

export function getLevelDefinition(levelId: LevelId) {
  return levelDefinitions[levelId] ?? levelDefinitions[defaultLevelId]
}

export function getLevelMap(levelId: LevelId) {
  const level = getLevelDefinition(levelId)
  return mapDefinitions[level.mapId as keyof typeof mapDefinitions] ?? volcanoMap
}

export function getEnemyBalanceProfileDefinition(profileId: EnemyBalanceProfileId) {
  return enemyBalanceProfileDefinitions[profileId] ?? enemyBalanceProfileDefinitions.standard
}

export function getEnemyDefinitionsForProfile(profileId: EnemyBalanceProfileId) {
  return enemyDefinitionsByProfile[profileId] ?? enemyDefinitionsByProfile.standard
}

export function getLevelEnemyDefinitions(levelId: LevelId) {
  const level = getLevelDefinition(levelId)
  return getEnemyDefinitionsForProfile(level.enemyProfileId)
}

export function getEnemyDefinitionForLevel(levelId: LevelId, enemyId: EnemyId) {
  const definitions = getLevelEnemyDefinitions(levelId)
  return definitions[enemyId] ?? enemyDefinitions[enemyId]
}

export function getLevelWaveDefinitions(levelId: LevelId) {
  const level = getLevelDefinition(levelId)
  return v02Waves
    .filter((wave) => wave.mapId === level.mapId)
    .slice(0, level.waveCount) as readonly VolcanoWaveDefinition[]
}

const routeRows: Record<'left' | 'center' | 'right', number[]> = {
  left: [0, 1],
  center: [2],
  right: [3, 4]
}
type RouteRowKey = keyof typeof routeRows

export function cellCenter(row: number, col: number): Point {
  return {
    x: lawn.originX + col * lawn.cellWidth + lawn.cellWidth / 2,
    y: lawn.originY + row * lawn.cellHeight + lawn.cellHeight / 2
  }
}

export function rowsForRoute(route: 'left' | 'center' | 'right' | 'mixed' | 'row-1' | 'row-2' | 'row-3' | 'row-4' | 'row-5') {
  if (route === 'mixed') {
    return Array.from({ length: lawn.rows }, (_, row) => row)
  }

  if (route.startsWith('row-')) {
    const row = Number(route.slice(4)) - 1
    return Number.isInteger(row) && row >= 0 && row < lawn.rows ? [row] : [2]
  }

  return routeRows[route as RouteRowKey]
}

export function getPlantFusionKey(): PlantFusionKey | undefined {
  return undefined
}

function resolveEnemyDefinitionsForProfile(profile: EnemyBalanceProfileDefinition) {
  return Object.fromEntries(
    enemies.map((enemy) => [enemy.id, applyEnemyBalanceProfile(enemy, profile)])
  ) as Record<EnemyId, EnemyDefinition>
}

function applyEnemyBalanceProfile(baseEnemy: (typeof enemies)[number], profile: EnemyBalanceProfileDefinition): EnemyDefinition {
  const modifiers = mergeEnemyModifiers(
    profile.globalModifiers,
    profile.roleModifiers?.[baseEnemy.role],
    profile.enemyModifiers?.[baseEnemy.id]
  )

  if (!modifiers) {
    return baseEnemy
  }

  return {
    ...baseEnemy,
    hp: scalePositive(baseEnemy.hp, modifiers.hpMultiplier),
    speed: scaleDecimal(baseEnemy.speed, modifiers.speedMultiplier, { min: 0.05 }),
    buildingDamage: scaleNonNegative(baseEnemy.buildingDamage, modifiers.buildingDamageMultiplier),
    baseDamage: scalePositive(baseEnemy.baseDamage, modifiers.baseDamageMultiplier),
    attackInterval:
      baseEnemy.attackInterval > 0
        ? scaleDecimal(baseEnemy.attackInterval, modifiers.attackIntervalMultiplier, { min: 0.1 })
        : 0,
    directorCost: scalePositive(baseEnemy.directorCost, modifiers.directorCostMultiplier),
    firstWave: Math.max(1, Math.round(baseEnemy.firstWave + (modifiers.firstWaveOffset ?? 0)))
  }
}

function mergeEnemyModifiers(...modifiers: Array<EnemyBalanceScalarModifier | undefined>) {
  const filtered = modifiers.filter(Boolean) as EnemyBalanceScalarModifier[]

  if (filtered.length === 0) {
    return undefined
  }

  return filtered.reduce<EnemyBalanceScalarModifier>(
    (combined, modifier) => ({
      hpMultiplier: multiplyModifier(combined.hpMultiplier, modifier.hpMultiplier),
      speedMultiplier: multiplyModifier(combined.speedMultiplier, modifier.speedMultiplier),
      buildingDamageMultiplier: multiplyModifier(combined.buildingDamageMultiplier, modifier.buildingDamageMultiplier),
      baseDamageMultiplier: multiplyModifier(combined.baseDamageMultiplier, modifier.baseDamageMultiplier),
      attackIntervalMultiplier: multiplyModifier(combined.attackIntervalMultiplier, modifier.attackIntervalMultiplier),
      directorCostMultiplier: multiplyModifier(combined.directorCostMultiplier, modifier.directorCostMultiplier),
      firstWaveOffset: (combined.firstWaveOffset ?? 0) + (modifier.firstWaveOffset ?? 0)
    }),
    {}
  )
}

function multiplyModifier(left?: number, right?: number) {
  if (left === undefined) return right
  if (right === undefined) return left
  return left * right
}

function scalePositive(value: number, multiplier = 1) {
  return Math.max(1, Math.round(value * multiplier))
}

function scaleNonNegative(value: number, multiplier = 1) {
  return Math.max(0, Math.round(value * multiplier))
}

function scaleDecimal(value: number, multiplier = 1, options: { min?: number } = {}) {
  const nextValue = value * multiplier
  const rounded = Math.round(nextValue * 100) / 100
  return Math.max(options.min ?? 0, rounded)
}

export type { ContentValidationIssue } from './contentValidation.js'
export { assertValidCurrentContent, validateCurrentContent } from './contentValidation.js'
