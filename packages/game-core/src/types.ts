import type {
  PlantDefinition,
  PlantFusionKey,
  PlantType,
  Point,
  ZombieCategory,
  ZombieType
} from '@tower-rogue/game-content'

export type RunPhase = 'ready' | 'playing' | 'won' | 'lost'

export type Plant = {
  id: string
  type: PlantType
  components: PlantType[]
  fusionKey?: PlantFusionKey
  row: number
  col: number
  x: number
  y: number
  hp: number
  maxHp: number
  shootCooldown: number
  sunTimer: number
}

export type Zombie = {
  id: string
  type: ZombieType
  category: ZombieCategory
  row: number
  x: number
  y: number
  hp: number
  maxHp: number
  speed: number
  damage: number
  attackCooldown: number
  attackInterval: number
  state: 'walking' | 'attacking'
}

export type Projectile = {
  id: string
  row: number
  x: number
  y: number
  speed: number
  damage: number
}

export type HiddenDirectorAdjustment = {
  spawnIntervalMultiplier: number
  zombieHpMultiplier: number
  sunDripMultiplier: number
}

export type WaveRuntime = {
  active: boolean
  spawned: number
  spawnTimer: number
}

// GameState is the single source of truth for a run. Keep it serializable:
// no Phaser objects, DOM nodes, timers, or closures should ever be stored here.
export type GameState = {
  time: number
  phase: RunPhase
  paused: boolean
  sun: number
  baseHp: number
  waveIndex: number
  selectedPlantType: PlantType
  seedCooldowns: Record<PlantType, number>
  passiveSunTimer: number
  plants: Plant[]
  zombies: Zombie[]
  projectiles: Projectile[]
  wave: WaveRuntime
  director: HiddenDirectorAdjustment
}

// Commands are the only public way for UI/rendering layers to mutate the run.
// This prevents React or Phaser code from reaching into state and changing rules directly.
export type GameCommand =
  | { type: 'selectPlant'; plantType: PlantType }
  | { type: 'placePlant'; row: number; col: number }
  | { type: 'startWave' }
  | { type: 'setPaused'; paused: boolean }
  | { type: 'applyDirectorAdjustment'; adjustment: HiddenDirectorAdjustment }
  | { type: 'resetRun' }

// Events are transient presentation hooks. Renderers can animate from them,
// but gameplay must not depend on whether an event was rendered.
export type GameEvent =
  | { type: 'plantPlaced'; plantId: string; plantType: PlantType; at: Point }
  | { type: 'plantFused'; plantId: string; fusionKey: PlantFusionKey; components: PlantType[]; at: Point }
  | { type: 'sunChanged'; amount: number; at?: Point }
  | { type: 'projectileFired'; projectileId: string; from: Point }
  | { type: 'zombieHit'; zombieId: string; at: Point; damage: number }
  | { type: 'zombieKilled'; zombieId: string; zombieType: ZombieType; at: Point }
  | { type: 'plantDamaged'; plantId: string; at: Point; dangerous?: boolean; blockedDangerous?: boolean }
  | { type: 'plantDestroyed'; plantId: string; at: Point }
  | { type: 'baseHit'; zombieId: string }
  | { type: 'waveCleared'; waveIndex: number }
  | { type: 'runEnded'; outcome: 'won' | 'lost' }

export type SeedSlot = {
  type: PlantType
  name: string
  cost: number
  cooldown: number
  cooldownRemaining: number
  selected: boolean
  canPlant: boolean
  role: PlantDefinition['role']
}

// HudSnapshot is intentionally smaller than GameState. React receives only
// display-ready data so HUD components stay independent of simulation internals.
export type HudSnapshot = {
  phase: RunPhase
  paused: boolean
  sun: number
  baseHp: number
  wave: number
  totalWaves: number
  plantCount: number
  fusionCount: number
  zombieCount: number
  dangerousZombieCount: number
  selectedPlantType: PlantType
  seedBank: SeedSlot[]
  canStartWave: boolean
}

export type { PlantFusionKey, PlantType, Point, ZombieCategory, ZombieType }
