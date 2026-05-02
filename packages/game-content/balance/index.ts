import { buildings } from './buildings.js'
import { cards } from './cards.js'
import { directorRules } from './directorRules.js'
import { enemies } from './enemies.js'
import { maps } from './maps.js'
import type { ContentBundle } from './types.js'
import { waves } from './waves.js'

export const contentBundle = {
  version: 'v0.2-content-aligned',
  maps,
  buildings,
  enemies,
  cards,
  waves,
  directorRules
} as const satisfies ContentBundle

export type {
  AttackDirection,
  BuildingDef,
  BuildingType,
  BuildingUpgradeDef,
  CardSolves,
  ContentBundle,
  ContentStatus,
  DirectorRuleDef,
  EnemyDef,
  EnemyRole,
  JsonValue,
  MapDef,
  PressureTag,
  StrategyCardDef,
  StrategyCardType,
  WaveDef,
  WaveEnemyGroup
} from './types.js'
