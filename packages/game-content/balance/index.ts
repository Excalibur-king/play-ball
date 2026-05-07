import { aiStrategy } from './aiStrategy.js'
import { buildings } from './buildings.js'
import { cards } from './cards.js'
import { combatBalance } from './combatBalance.js'
import { directorRules } from './directorRules.js'
import { enemyBalanceProfiles } from './enemyBalanceProfiles.js'
import { enemies } from './enemies.js'
import { gameplay } from './gameplay.js'
import { maps } from './maps.js'
import type { ContentBundle } from './types.js'
import { buildWave, phaseWave } from './waveBuilder.js'
import { waves } from './waves.js'

export const contentBundle = {
  version: 'v0.2-content-aligned',
  maps,
  buildings,
  enemies,
  enemyBalanceProfiles,
  cards,
  waves,
  directorRules,
  aiStrategy,
  gameplay
} as const satisfies ContentBundle

export type {
  AiStrategyConfigDef,
  AiStrategyModelTuningDef,
  AiStrategyPromptCopyDef,
  AiStrategySystemPromptDef,
  AiStrategyTaskContextDef,
  AttackDirection,
  AttackKind,
  BuildingDef,
  BuildingType,
  BuildingUpgradeDef,
  CardSolves,
  CombatBalanceDef,
  ContentBundle,
  ContentStatus,
  DirectorRuleDef,
  EnemyDef,
  EnemyBalanceProfileDef,
  EnemyBalanceScalarModifier,
  EnemyRole,
  GameplayConfigDef,
  JsonValue,
  MapDef,
  PressureTag,
  StrategyCardDef,
  StrategyCardType,
  WaveDef,
  WaveEnemyGroup,
  WavePhaseDef
} from './types.js'

export { combatBalance }
export { buildWave, phaseWave }
