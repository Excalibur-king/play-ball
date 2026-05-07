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
export type AttackKind = 'melee' | 'projectile' | 'laser'

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
  attackKind?: AttackKind
  charges?: number
  projectileKey?: string
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
  directorCost: number
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

export type EnemyBalanceScalarModifier = {
  hpMultiplier?: number
  speedMultiplier?: number
  buildingDamageMultiplier?: number
  baseDamageMultiplier?: number
  attackIntervalMultiplier?: number
  directorCostMultiplier?: number
  firstWaveOffset?: number
}

export type EnemyBalanceProfileDef = {
  id: string
  name: string
  globalModifiers?: EnemyBalanceScalarModifier
  roleModifiers?: Partial<Record<EnemyRole, EnemyBalanceScalarModifier>>
  enemyModifiers?: Partial<Record<string, EnemyBalanceScalarModifier>>
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

export type WavePhaseDef = {
  id: string
  label: string
  startSecond: number
  endSecond: number
  description?: string
}

export type DirectorIntentDef =
  | 'relief'
  | 'probe_fast'
  | 'probe_anti_air'
  | 'pressure_economy'
  | 'split_pressure'
  | 'boss_setup'

export type DirectorPolicyDef = {
  allowedIntents?: readonly DirectorIntentDef[]
  preferredIntents?: readonly DirectorIntentDef[]
  maxSpendRatio?: number
}

export type WaveDef = {
  id: string
  mapId: string
  index: number
  durationSeconds: number
  phases: WavePhaseDef[]
  enemyGroups: WaveEnemyGroup[]
  directorReserveBudget: number
  bossId?: string
  rewardPurchasePower?: number
  clearRewardId?: string
  pressureGoal: string
  nextWaveHint: string
  aiDirectorAllowed: boolean
  directorPolicy?: DirectorPolicyDef
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

export type ActiveStrategyDrawDef = {
  cost: number
  cooldownSeconds: number
}

export type RunLoopDef = {
  initialReadySeconds: number
  postCardReadySeconds: number
  waveCardSelectSeconds: number
}

export type CombatBalanceDef = {
  timeUnitSeconds: number
  standardTowerDps: number
  heavySiegeDpsToTowerDpsRatio: number
  enemySpeedMultiplier: number
  enemyTtkUnits: Record<EnemyRole, number>
  buildingTtdUnitsAgainstHeavy: {
    wall: number
    meleeTower: number
    rangedTower: number
    economy: number
    laserTower: number
  }
}

export type AiStrategyModelTuningDef = {
  temperature: number
  maxTokens: number
}

export type AiStrategyTaskContextDef = {
  activeSkill: string
  waveCleared: string
}

export type AiStrategySystemPromptDef = {
  role: string
  selectionTask: string
  decisionConstraint: string
  poolConstraint: string
  jsonConstraint: string
  outputSchema: string
  slotCoverageConstraint: string
  styleConstraint: string
}

export type AiStrategyPromptCopyDef = {
  slotRules: readonly [string, string, string]
  noProblemTagsText: string
  language: string
}

export type AiStrategyConfigDef = {
  modelTuning: AiStrategyModelTuningDef
  taskContext: AiStrategyTaskContextDef
  systemPrompt: AiStrategySystemPromptDef
  promptCopy: AiStrategyPromptCopyDef
  problemTagLabels: Record<PressureTag, string>
}

export type GameplayConfigDef = {
  combatBalance: CombatBalanceDef
  activeStrategyDraw: ActiveStrategyDrawDef
  runLoop: RunLoopDef
}

export type ContentBundle = {
  version: string
  maps: readonly MapDef[]
  buildings: readonly BuildingDef[]
  enemies: readonly EnemyDef[]
  enemyBalanceProfiles: readonly EnemyBalanceProfileDef[]
  cards: readonly StrategyCardDef[]
  waves: readonly WaveDef[]
  directorRules: readonly DirectorRuleDef[]
  aiStrategy: AiStrategyConfigDef
  gameplay: GameplayConfigDef
}
