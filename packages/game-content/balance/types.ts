export type ContentStatus = 'draft' | 'ready' | 'implemented' | 'tuning'

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue }

export type MapDef = {
  id: string
  name: string
  theme: string
  laneCount: number
  baseHp: number
  initialPurchasePower: number
  runTimeMinutes: [number, number]
  bossId: string
  status: ContentStatus
  notes?: string
}

export type BuildingType = 'energy' | 'attack' | 'defense'
export type AttackDirection = 'up' | 'down' | 'left' | 'right'

export type BuildingUpgradeDef = {
  cost: number
  hpBonus?: number
  attackPowerBonus?: number
  attackRangeBonus?: number
  purchasePowerPerTickBonus?: number
}

export type BuildingDef = {
  id: string
  name: string
  type: BuildingType
  cost: number
  hp: number
  purchasePowerPerTick?: number
  productionInterval?: number
  attackPower?: number
  attackInterval?: number
  attackRange?: number
  attackDirection?: AttackDirection
  canBlockGround: boolean
  canTargetGround: boolean
  canTargetFlying: boolean
  tags: string[]
  specialEffectHooks: string[]
  upgrade?: BuildingUpgradeDef
  visualRule: string
  status: ContentStatus
  notes?: string
}

export type EnemyRole = 'normal' | 'fast' | 'heavy_attack' | 'flying' | 'boss'

export type EnemyDef = {
  id: string
  name: string
  role: EnemyRole
  hp: number
  speed: number
  buildingDamage: number
  attackInterval: number
  baseDamage: number
  blockable: boolean
  flying: boolean
  tags: string[]
  special: string
  counterBy: string[]
  visualRule: string
  firstWave: number
  status: ContentStatus
  notes?: string
}

export type StrategyCardType = 'emergency' | 'energy' | 'attack' | 'defense' | 'pivot'

export type PressureTag =
  | 'low_economy'
  | 'ground_damage_low'
  | 'fast_pressure_high'
  | 'building_break_high'
  | 'flying_pressure_high'
  | 'block_capacity_low'
  | 'boss_incoming'
  | 'base_danger'
  | 'coverage_low'
  | 'defense_heavy'
  | 'energy_heavy'

export type CardSolves = Partial<Record<PressureTag, number>>

export type StrategyCardDef = {
  id: string
  name: string
  type: StrategyCardType
  tags: string[]
  solves: CardSolves
  synergy: string[]
  effect: { kind: string; [key: string]: JsonValue }
  description: string
  recommendReason: string
  status: ContentStatus
  notes?: string
}

export type WaveEnemyGroup = {
  enemyId: string
  count: number
  route: 'left' | 'center' | 'right' | 'mixed'
  startSecond: number
  interval: number
}

export type WaveDef = {
  id: string
  mapId: string
  index: number
  durationSeconds: number
  enemyGroups: WaveEnemyGroup[]
  bossId?: string
  rewardPurchasePower?: number
  clearRewardId?: string
  pressureGoal: string
  nextWaveHint: string
  aiDirectorAllowed: boolean
  status: ContentStatus
  notes?: string
}

export type DirectorRuleDef = {
  id: string
  playerState: string
  allowedAdjustment: string
  limits: string
  reasonTags: PressureTag[]
  status: ContentStatus
  notes?: string
}

export type ContentBundle = {
  version: string
  maps: readonly MapDef[]
  buildings: readonly BuildingDef[]
  enemies: readonly EnemyDef[]
  cards: readonly StrategyCardDef[]
  waves: readonly WaveDef[]
  directorRules: readonly DirectorRuleDef[]
}
