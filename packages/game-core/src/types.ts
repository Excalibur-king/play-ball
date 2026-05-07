import type {
  BuildingDefinition,
  BuildingId,
  EnemyCategory,
  EnemyId,
  LevelId,
  Point,
  StrategyCardDefinition,
  StrategyCardId,
  VolcanoWaveDefinition
} from '@tower-rogue/game-content'

export type RunPhase = 'ready' | 'playing' | 'card_select' | 'won' | 'lost'

export type Plant = {
  id: string
  type: BuildingId
  components: BuildingId[]
  row: number
  col: number
  x: number
  y: number
  hp: number
  maxHp: number
  shootCooldown: number
  sunTimer: number
  attackDirection: 'up' | 'down' | 'left' | 'right'
  upgraded: boolean
  chargesRemaining?: number
  temporaryUntilWave?: number
  temporaryUntilTime?: number
}

export type Zombie = {
  id: string
  type: EnemyId
  category: EnemyCategory
  row: number
  x: number
  y: number
  hp: number
  maxHp: number
  speed: number
  buildingDamage: number
  baseDamage: number
  attackCooldown: number
  attackInterval: number
  blockable: boolean
  flying: boolean
  spawnSource?: WaveRuntimeGroup['source']
  frozenUntil?: number
  state: 'walking' | 'attacking'
}

export type Projectile = {
  id: string
  targetId: string
  row: number
  x: number
  y: number
  speed: number
  damage: number
  canHitFlying: boolean
  visualKey?: string
}

export type HiddenDirectorAdjustment = {
  spawnIntervalMultiplier: number
  zombieHpMultiplier: number
  sunDripMultiplier: number
}

export type WaveRuntimeGroup = {
  groupIndex: number
  enemyId: EnemyId
  count: number
  route: AiWaveRoute
  interval: number
  spawned: number
  spawnTimer: number
  source: 'base' | 'director' | 'ai-wave-director'
}

export type WavePhaseRuntime = VolcanoWaveDefinition['phases'][number]

export type WaveRuntime = {
  active: boolean
  elapsed: number
  phaseIndex: number
  phases: WavePhaseRuntime[]
  groups: WaveRuntimeGroup[]
}

export type WaveStats = {
  leaks: number
  destroyedBuildings: number
  killedByType: Partial<Record<EnemyId, number>>
  byLane: LaneWaveStats[]
}

export type LaneWaveStats = {
  leaks: number
  destroyedBuildings: number
}

export type LanePressure = {
  lane: number
  leaksLastWave: number
  enemiesReachedFront: number
  destroyedBuildingsLastWave: number
  groundDps: number
  flyingDps: number
  blockHp: number
  economyValue: number
  pressureScore: number
}

export type BattleSnapshot = {
  wave: number
  baseHp: number
  purchasePower: number
  leaksLastWave: number
  destroyedBuildingsLastWave: number
  buildingCounts: {
    energy: number
    attack: number
    defense: number
  }
  outputProfile: {
    groundDamage: number
    flyingDamage: number
    attackCoverage: number
    blockCapacity: number
    energyIncome: number
  }
  pressureProfile: {
    groundPressure: number
    flyingPressure: number
    fastPressure: number
    buildingDamagePressure: number
  }
  lanePressure: LanePressure[]
  nextWavePreview: {
    normal: number
    fast: number
    heavyAttack: number
    flying: number
    hasBoss: boolean
  }
  problemTags: string[]
  chosenCardTags: string[]
}

export type CardRecommendation = {
  cardId: StrategyCardId
  slot: 'emergency' | 'synergy' | 'pivot'
  score: number
  reason: string
}

export type StrategyCardSelectionSource = 'wave-cleared' | 'active-skill'

export type StrategyCardSelectionContext = {
  source: StrategyCardSelectionSource
  resumePhase: 'ready' | 'playing'
  resumePaused: boolean
}

export type ActiveCardEffects = {
  baseShield: number
  attackPowerBonus: number
  attackIntervalBonus: number
  attackIntervalMin: number
  antiAirFocus: boolean
  antiAirDamageMultiplier: number
  wallHpBonus: number
  energyOutputBonus: number
  wallReflectionDamage: number
  wallReflectionInterval: number
  wallReflectionLastTriggeredAt: number
  directionResetAvailable: boolean
  energySpriteEndsAt?: number
  energySpriteIntervalSeconds: number
  energySpriteNextTickAt: number
  expiresAfterWave: Partial<Record<string, number>>
}

export type EnemyDirectorAddedGroup = {
  enemyId: EnemyId
  count: number
  route: 'left' | 'center' | 'right' | 'mixed'
  startSecond: number
  interval: number
}

export type DirectorIntent =
  | 'relief'
  | 'probe_fast'
  | 'probe_anti_air'
  | 'pressure_economy'
  | 'split_pressure'
  | 'boss_setup'

export type DirectorDecisionParams = {
  intent: DirectorIntent
  aggression: number
  primaryRoute: 'left' | 'center' | 'right' | 'mixed'
  secondaryRoute?: 'left' | 'center' | 'right'
  roleWeights: {
    normal: number
    fast: number
    heavyAttack: number
    flying: number
  }
  spendRatio: number
  timingStyle: 'frontload' | 'steady' | 'backload'
}

export type DirectorThreatLevel = 'low' | 'medium' | 'high' | 'critical'

export type DirectorPreviewText = {
  title: string
  subtitle: string
  tags: string[]
  threatLevel: DirectorThreatLevel
}

export type AiWaveRoute = 'left' | 'center' | 'right' | 'mixed' | 'row-1' | 'row-2' | 'row-3' | 'row-4' | 'row-5'
export type AiWaveCadence = 'sparse' | 'steady' | 'dense'
export type AiWaveRole = 'normal' | 'fast' | 'heavyAttack' | 'flying'

export type AiWaveDirective =
  | {
      kind: 'role'
      role: AiWaveRole
      route: AiWaveRoute
      budgetUnits: number
      cadence: AiWaveCadence
      startOffset?: number
    }
  | {
      kind: 'enemy'
      enemyId: string
      route: AiWaveRoute
      count: number
      cadence: AiWaveCadence
      startOffset?: number
    }

export type AiWavePlan = {
  pressureGoal: string
  nextWaveHint: string
  phases: Array<{
    label: string
    description?: string
    startSecond: number
    directives: AiWaveDirective[]
  }>
}

export type AiWaveCompiledGroup = {
  enemyId: EnemyId
  count: number
  route: AiWaveRoute
  startSecond: number
  interval: number
}

export type AiWaveCompiledPlan = {
  targetWaveIndex: number
  pressureGoal: string
  nextWaveHint: string
  phases: WavePhaseRuntime[]
  groups: AiWaveCompiledGroup[]
  preview: DirectorPreviewText
  source: 'ai-wave-director'
}

export type DirectorHistoryEntry = {
  wave: number
  intent: DirectorIntent
  primaryRoute: DirectorDecisionParams['primaryRoute']
  reasonTag?: string
}

export type DirectorOutcomeVerdict = 'too_weak' | 'on_target' | 'too_strong'

export type DirectorOutcome = {
  wave: number
  intent: DirectorIntent
  primaryRoute: DirectorDecisionParams['primaryRoute']
  leaks: number
  destroyedBuildings: number
  baseHpDelta: number
  verdict: DirectorOutcomeVerdict
}

export type EnemyDirectorPlan = {
  targetWaveIndex: number
  intent: DirectorIntent
  params: DirectorDecisionParams
  budget: {
    reserve: number
    spendCap: number
    spent: number
  }
  addedGroups: EnemyDirectorAddedGroup[]
  removedEnemyCount: number
  reasonTags: string[]
  preview: DirectorPreviewText
}

export type PendingSkillEffect = {
  cardId: StrategyCardId
  triggerAt: number
}

export type BuildSelectionMode = 'single' | 'persistent'

// GameState is the single source of truth for a run. Keep it serializable:
// no Phaser objects, DOM nodes, timers, or closures should ever be stored here.
export type GameState = {
  levelId: LevelId
  time: number
  phase: RunPhase
  paused: boolean
  sun: number
  baseHp: number
  waveIndex: number
  selectedPlantType: BuildingId | null
  selectedPlantMode: BuildSelectionMode
  seedCooldowns: Record<BuildingId, number>
  passiveSunTimer: number
  plants: Plant[]
  zombies: Zombie[]
  projectiles: Projectile[]
  wave: WaveRuntime
  waveStartBaseHp: number
  director: HiddenDirectorAdjustment
  pendingDirectorAdjustment?: HiddenDirectorAdjustment
  currentWaveStats: WaveStats
  lastWaveStats: WaveStats
  activeRecommendations: CardRecommendation[]
  lastBattleSnapshot?: BattleSnapshot
  strategyCardSelection?: StrategyCardSelectionContext
  nextStrategyCardDrawAt: number
  chosenCardTags: string[]
  activeCardEffects: ActiveCardEffects
  recentDirectorHistory: DirectorHistoryEntry[]
  pendingAiWavePlan?: AiWaveCompiledPlan
  activeAiWavePlanForWave?: AiWaveCompiledPlan
  directorPlan?: EnemyDirectorPlan
  activeDirectorPlanForWave?: EnemyDirectorPlan
  lastDirectorReasonTag?: string
  lastDirectorOutcome?: DirectorOutcome
  realtimeDirectorRequestCount: number
  resultReason?: string
  skillLoadout: StrategyCardId[]
  skillLevels: Partial<Record<StrategyCardId, number>>
  usedSkillCards: StrategyCardId[]
  pendingSkillEffects: PendingSkillEffect[]
  readyAutoStartAt?: number
  cardSelectionAutoPickAt?: number
}

// Commands are the only public way for UI/rendering layers to mutate the run.
// This prevents React or Phaser code from reaching into state and changing rules directly.
export type GameCommand =
  | { type: 'selectPlant'; plantType: BuildingId; mode?: BuildSelectionMode }
  | { type: 'selectBuilding'; buildingId: BuildingId; mode?: BuildSelectionMode }
  | { type: 'clearSelectedPlant' }
  | { type: 'placePlant'; row: number; col: number; keepSelected?: boolean }
  | { type: 'placeBuilding'; row: number; col: number; keepSelected?: boolean }
  | { type: 'upgradeBuilding'; buildingId: string }
  | { type: 'startWave' }
  | { type: 'drawStrategyCards' }
  | { type: 'hydrateStrategyRecommendations'; recommendations: CardRecommendation[] }
  | { type: 'hydrateAiWavePlan'; clearedWave: number; plan: AiWavePlan | null }
  | { type: 'hydrateRealtimeAiWavePlan'; wave: number; plan: AiWavePlan | null }
  | { type: 'applyRealtimeDirectorFallback'; wave: number }
  | { type: 'hydrateDirectorDecisionParams'; clearedWave: number; params: DirectorDecisionParams | null }
  | { type: 'selectStrategyCard'; cardId: StrategyCardId }
  | { type: 'setSkillLoadout'; cardIds: StrategyCardId[] }
  | { type: 'useSkillCard'; cardId: StrategyCardId }
  | { type: 'setPaused'; paused: boolean }
  | { type: 'applyDirectorAdjustment'; adjustment: HiddenDirectorAdjustment }
  | { type: 'resetRun' }

// Events are transient presentation hooks. Renderers can animate from them,
// but gameplay must not depend on whether an event was rendered.
export type GameEvent =
  | { type: 'plantPlaced'; plantId: string; plantType: BuildingId; at: Point }
  | { type: 'sunChanged'; amount: number; at?: Point }
  | { type: 'projectileFired'; projectileId: string; from: Point }
  | { type: 'laserFired'; plantId: string; from: Point; to: Point }
  | { type: 'zombieHit'; zombieId: string; at: Point; damage: number }
  | { type: 'zombieKilled'; zombieId: string; zombieType: EnemyId; at: Point }
  | { type: 'plantDamaged'; plantId: string; at: Point; dangerous?: boolean; blockedDangerous?: boolean }
  | { type: 'plantDestroyed'; plantId: string; at: Point }
  | { type: 'baseHit'; zombieId: string }
  | { type: 'wavePhaseChanged'; waveIndex: number; phaseIndex: number; label: string }
  | { type: 'waveCleared'; waveIndex: number }
  | { type: 'cardRecommendationsReady'; waveIndex: number }
  | { type: 'strategyCardSelected'; cardId: StrategyCardId }
  | { type: 'skillSummoned'; cardId: StrategyCardId; at: Point }
  | {
      type: 'cardEffectImpact'
      cardId: StrategyCardId
      at: Point
      impactKind: 'strike' | 'heal' | 'reflection' | 'energyGain'
      targetType?: 'zombie' | 'plant' | 'hud'
      targetId?: string
    }
  | { type: 'runEnded'; outcome: 'won' | 'lost' }

export type SeedSlot = {
  type: BuildingId
  name: string
  cost: number
  cooldown: number
  cooldownRemaining: number
  selected: boolean
  selectedMode?: BuildSelectionMode
  canPlant: boolean
  role: BuildingDefinition['type']
}

export type RecommendationSlot = {
  cardId: StrategyCardId
  card: StrategyCardDefinition
  slot: CardRecommendation['slot']
  reason: string
  score: number
}

export type SkillPackSlot = {
  cardId: StrategyCardId
  card: StrategyCardDefinition
  level: number
  used: boolean
  usable: boolean
  disabledReason?: string
}

export type WavePhaseSnapshot = {
  id: string
  label: string
  description?: string
  index: number
  total: number
  startSecond: number
  endSecond: number
  progress: number
}

// HudSnapshot is intentionally smaller than GameState. React receives only
// display-ready data so HUD components stay independent of simulation internals.
export type HudSnapshot = {
  levelId: LevelId
  phase: RunPhase
  paused: boolean
  sun: number
  purchasePower: number
  baseHp: number
  baseMaxHp: number
  baseShield: number
  wave: number
  totalWaves: number
  currentWaveElapsed: number
  plantCount: number
  fusionCount: number
  zombieCount: number
  dangerousZombieCount: number
  flyingEnemyCount: number
  selectedPlantType: BuildingId | null
  selectedPlantMode: BuildSelectionMode
  seedBank: SeedSlot[]
  plants: Array<Pick<Plant, 'type' | 'row' | 'col' | 'hp' | 'maxHp'>>
  enemies: Array<Pick<Zombie, 'type' | 'row' | 'x' | 'hp' | 'maxHp'>>
  canStartWave: boolean
  canDrawStrategyCards: boolean
  strategyCardDrawCost: number
  strategyCardDrawCooldownRemaining: number
  strategyCardDrawDisabledReason?: string
  readyCountdownRemaining: number
  cardSelectionCountdownRemaining: number
  recommendations: RecommendationSlot[]
  battleSnapshot: BattleSnapshot
  skillPack: SkillPackSlot[]
  cardSelectionSource?: StrategyCardSelectionSource
  cardSelectionSnapshot?: BattleSnapshot
  lastDirectorReasonTag?: string
  recentDirectorHistory: DirectorHistoryEntry[]
  lastDirectorOutcome?: DirectorOutcome
  lanePressure: LanePressure[]
  currentWavePhase?: WavePhaseSnapshot
  nextWaveHint: string
  wavePlanPreview?: DirectorPreviewText
  directorPreview?: DirectorPreviewText
  resultReason?: string
}

export type { BuildingId as PlantType, EnemyCategory as ZombieCategory, EnemyId as ZombieType, Point, StrategyCardId }
