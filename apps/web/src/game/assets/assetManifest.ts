import type { PlantType, ZombieType } from '@tower-rogue/game-core'

type AtlasAsset = {
  key: string
  textureUrl: string
  atlasUrl: string
}

type TextureAsset = {
  key: string
  url: string
  width: number
  height: number
}

type ImageAsset = {
  key: string
  url: string
  width: number
  height: number
}

type BattleBackgroundAsset = ImageAsset & {
  mapId: string
}

type SpritesheetAsset = {
  key: string
  url: string
  frameWidth: number
  frameHeight: number
  frameCount: number
}

type AnimationAsset = {
  key: string
  atlas: string
  prefix: string
  frames: number
  frameRate: number
  repeat: number
}

type SpritesheetAnimationAsset = {
  key: string
  spritesheet: string
  frameRate: number
  repeat: number
}

type SpriteState = {
  textureKey: string
  frame?: string
  animationKey?: string
}

type ShadowSpec = {
  width: number
  height: number
  offsetY: number
  alpha: number
}

type BuildingVisualSpec = {
  body: SpriteState
  displayWidth: number
  displayHeight: number
  bodyOffsetY: number
  hpOffsetY: number
  shadow: ShadowSpec
  idleBob: {
    distance: number
    duration: number
  }
  recoil?: {
    distance: number
    duration: number
    scaleX: number
  }
  attackAnimation?: {
    body: SpriteState
    displayWidth: number
    displayHeight: number
    bodyOffsetY: number
  }
  upgradeRing: {
    radius: number
    offsetY: number
  }
}

type EnemyVisualSpec = {
  body: SpriteState
  states?: {
    walk: SpriteState
    attack: SpriteState
    hit: SpriteState
  }
  displayWidth: number
  displayHeight: number
  bodyOffsetY: number
  hpOffsetY: number
  shadow: ShadowSpec
  hoverOffsetY: number
}

type ProjectileVisualSpec = {
  body: SpriteState
  displayWidth: number
  displayHeight: number
  auraRadius: number
  auraColor: number
  auraAlpha: number
}

type EffectVisualSpec = {
  body: SpriteState
  displayWidth: number
  displayHeight: number
  offsetY: number
  depth: number
  scale?: number
}

type SummonVisualSpec = {
  textureKey: string
  // Optional frame-by-frame animation key. Renderers should fall back to a
  // simple alpha tween when this is undefined so legacy SVG summons keep working.
  animationKey?: string
  // When true the summon animation loops while the sprite is on stage (used for
  // sustained allies like the energy sprite or furnace golem). Otherwise the
  // animation plays once across the entry/hold window.
  repeatAnimation?: boolean
  // Phaser sprite origin (0,0 = top-left, 1,1 = bottom-right; default 0.5,0.5).
  // Use 0.5 / 0.85 for ground-standing creatures (golem, ward) so the sprite
  // sits on its feet at the spawn point. Use 0.5 / 0.7 for "drop from above"
  // bursts (starfall, lava rain) so the impact reads at the spawn point.
  origin?: { x: number; y: number }
  displayWidth: number
  displayHeight: number
  offsetY: number
  depth: number
  label: string
  tintColor: number
}

// Persistent overlays attached to game-state entities (frozen zombies,
// temporary walls, summoned golems, orbiting energy sprites). EffectsRenderer
// keeps a sprite per entity and syncs position / lifecycle every frame.
type SummonOverlaySpec = {
  textureKey: string
  // Either a static frame index (0..3 maps to f1..f4) or a looping animation key.
  frame?: number
  animationKey?: string
  displayWidth: number
  displayHeight: number
  // Pixel offset added on top of the entity's anchor. Useful to lift a freeze
  // ring above zombie shoulders, or to drop a wall ward onto cell ground.
  offsetY?: number
  origin?: { x: number; y: number }
  alpha?: number
  depth: number
  tintColor: number
}

const atlases: AtlasAsset[] = [
  {
    key: 'melee-turret-attack',
    textureUrl: '/assets/game/atlases/melee-turret-attack.png',
    atlasUrl: '/assets/game/atlases/melee-turret-attack.json'
  },
  {
    key: 'melee-turret-idle',
    textureUrl: '/assets/game/atlases/melee-turret-idle.png',
    atlasUrl: '/assets/game/atlases/melee-turret-idle.json'
  },
  {
    key: 'melee-turret-shield',
    textureUrl: '/assets/game/atlases/melee-turret-shield.png',
    atlasUrl: '/assets/game/atlases/melee-turret-shield.json'
  },
  {
    key: 'ranged-turret-bolt',
    textureUrl: '/assets/game/atlases/ranged-turret-bolt.png',
    atlasUrl: '/assets/game/atlases/ranged-turret-bolt.json'
  },
  {
    key: 'laser-turret-attack',
    textureUrl: '/assets/game/atlases/laser-turret-attack.png',
    atlasUrl: '/assets/game/atlases/laser-turret-attack.json'
  },
  {
    key: 'lava-wall-shield',
    textureUrl: '/assets/game/atlases/lava-wall-shield.png',
    atlasUrl: '/assets/game/atlases/lava-wall-shield.json'
  },
  {
    key: 'energy-core-idle',
    textureUrl: '/assets/game/atlases/energy-core-idle.png',
    atlasUrl: '/assets/game/atlases/energy-core-idle.json'
  },
  {
    key: 'fx-premium',
    textureUrl: '/assets/game/atlases/fx-premium.webp',
    atlasUrl: '/assets/game/atlases/fx-premium.json'
  }
]

const battleBackgrounds: readonly BattleBackgroundAsset[] = [
  {
    mapId: 'volcano',
    key: 'battle:fire_element_map:bg',
    url: '/assets/ui/fire_element_map.png',
    width: 2752,
    height: 1536
  }
]

const defaultBattleBackground = battleBackgrounds[0]!

const images: ImageAsset[] = [
  ...battleBackgrounds,
  {
    key: 'fx:ranged_turret:muzzle_flash',
    url: '/assets/game/fx/ranged_turret_muzzle_flash.png',
    width: 256,
    height: 256
  },
  {
    key: 'building:energy_core:base',
    url: '/assets/game/units/buildings/energy_core/base.png',
    width: 160,
    height: 160
  },
  {
    key: 'building:melee_turret:base',
    url: '/assets/game/units/buildings/melee_turret/base.png',
    width: 160,
    height: 160
  },
  {
    key: 'building:ranged_turret:base',
    url: '/assets/game/units/buildings/ranged_turret/base.png',
    width: 160,
    height: 160
  },
  {
    key: 'building:laser_turret:base',
    url: '/assets/game/units/buildings/laser_turret/base.png',
    width: 160,
    height: 160
  },
  {
    key: 'building:lava_wall:base',
    url: '/assets/game/units/buildings/lava_wall/base.png',
    width: 160,
    height: 160
  }
]

const textures: TextureAsset[] = [
  {
      key: 'enemy:ember_grunt:base',
      url: '/assets/game/units/enemies/ember_grunt/base.svg',
      width: 160,
      height: 160
  },
  {
      key: 'enemy:spark_runner:base',
      url: '/assets/game/units/enemies/spark_runner/base.svg',
      width: 160,
      height: 160
  },
  {
      key: 'enemy:basalt_smasher:base',
      url: '/assets/game/units/enemies/basalt_smasher/base.svg',
      width: 176,
      height: 176
  },
  {
      key: 'enemy:ash_wing:base',
      url: '/assets/game/units/enemies/ash_wing/base.svg',
      width: 176,
      height: 176
  },
  {
      key: 'enemy:volcano_core_beast:base',
      url: '/assets/game/units/enemies/volcano_core_beast/base.svg',
      width: 192,
      height: 192
  },
  {
    key: 'summon:wind_feather:base',
    url: '/assets/game/summons/wind_feather.svg',
    width: 180,
    height: 140
  },
  {
    key: 'summon:arcane_construct:base',
    url: '/assets/game/summons/arcane_construct.svg',
    width: 180,
    height: 180
  },
  {
    key: 'summon:energy_sprite:base',
    url: '/assets/game/summons/energy_sprite.svg',
    width: 160,
    height: 160
  },
  {
    key: 'summon:fire_dragon_breath:base',
    url: '/assets/game/summons/fire_dragon_breath.svg',
    width: 256,
    height: 160
  },
  {
    key: 'summon:energy_burst:base',
    url: '/assets/game/summons/energy_burst.svg',
    width: 160,
    height: 160
  },
  {
    key: 'summon:time_runes:base',
    url: '/assets/game/summons/time_runes.svg',
    width: 180,
    height: 180
  },
  {
    key: 'summon:heal_pulse:base',
    url: '/assets/game/summons/heal_pulse.svg',
    width: 160,
    height: 160
  },
  {
    key: 'summon:star_burst:base',
    url: '/assets/game/summons/star_burst.svg',
    width: 200,
    height: 200
  },
  {
    key: 'summon:ether_ward:base',
    url: '/assets/game/summons/ether_ward.svg',
    width: 160,
    height: 200
  },
  {
    key: 'summon:arcane_recoil:base',
    url: '/assets/game/summons/arcane_recoil.svg',
    width: 180,
    height: 180
  },
  {
    key: 'summon:mystic_chain:base',
    url: '/assets/game/summons/mystic_chain.svg',
    width: 220,
    height: 120
  },
  {
    key: 'summon:starfall:base',
    url: '/assets/game/summons/starfall.svg',
    width: 200,
    height: 200
  }
]

const animations: AnimationAsset[] = [
  {
    key: 'building:melee_turret:idle',
    atlas: 'melee-turret-idle',
    prefix: 'building/melee_turret/idle/',
    frames: 12,
    frameRate: 8,
    repeat: -1
  },
  {
    key: 'building:melee_turret:shield',
    atlas: 'melee-turret-shield',
    prefix: 'building/melee_turret/shield/',
    frames: 12,
    frameRate: 10,
    repeat: -1
  },
  {
    key: 'building:melee_turret:attack',
    atlas: 'melee-turret-attack',
    prefix: 'building/melee_turret/attack/',
    frames: 16,
    frameRate: 30,
    repeat: 0
  },
  {
    key: 'projectile:ranged_bolt:fly',
    atlas: 'ranged-turret-bolt',
    prefix: 'projectile/ranged_bolt/fly/',
    frames: 6,
    frameRate: 12,
    repeat: -1
  },
  {
    key: 'building:laser_turret:attack',
    atlas: 'laser-turret-attack',
    prefix: 'building/laser_turret/attack/',
    frames: 16,
    frameRate: 18,
    repeat: 0
  },
  {
    key: 'building:lava_wall:shield',
    atlas: 'lava-wall-shield',
    prefix: 'building/lava_wall/shield/',
    frames: 12,
    frameRate: 12,
    repeat: 0
  },
  {
    key: 'building:energy_core:idle',
    atlas: 'energy-core-idle',
    prefix: 'building/energy_core/idle/',
    frames: 12,
    frameRate: 8,
    repeat: -1
  },
  {
    key: 'projectile:basic_bolt:fly',
    atlas: 'fx-premium',
    prefix: 'projectile/basic_bolt/fly/',
    frames: 4,
    frameRate: 12,
    repeat: -1
  },
  {
    key: 'fx:projectile_impact:burst',
    atlas: 'fx-premium',
    prefix: 'fx/projectile_impact/burst/',
    frames: 6,
    frameRate: 18,
    repeat: 0
  }
]

// Per-card 4-frame strips produced by `scripts/process_summon_frames.py`.
// Frame sizes mirror `apps/web/public/assets/game/summons/frames/manifest.json`.
const SUMMON_FRAMES_BASE = '/assets/game/summons/frames'

const summonSpritesheets: SpritesheetAsset[] = [
  {
    key: 'summon:energy_instant_power:strip',
    url: `${SUMMON_FRAMES_BASE}/energy_instant_power.png`,
    frameWidth: 529,
    frameHeight: 512,
    frameCount: 4
  },
  {
    key: 'summon:emergency_freeze:strip',
    url: `${SUMMON_FRAMES_BASE}/emergency_freeze.png`,
    frameWidth: 630,
    frameHeight: 512,
    frameCount: 4
  },
  {
    key: 'summon:emergency_repair_all:strip',
    url: `${SUMMON_FRAMES_BASE}/emergency_repair_all.png`,
    frameWidth: 510,
    frameHeight: 488,
    frameCount: 4
  },
  {
    key: 'summon:spell_lava_rain:strip',
    url: `${SUMMON_FRAMES_BASE}/spell_lava_rain.png`,
    frameWidth: 565,
    frameHeight: 416,
    frameCount: 4
  },
  {
    key: 'summon:summon_flame_hawks:strip',
    url: `${SUMMON_FRAMES_BASE}/summon_flame_hawks.png`,
    frameWidth: 723,
    frameHeight: 495,
    frameCount: 4
  },
  {
    key: 'summon:summon_furnace_golem:strip',
    url: `${SUMMON_FRAMES_BASE}/summon_furnace_golem.png`,
    frameWidth: 707,
    frameHeight: 481,
    frameCount: 4
  },
  {
    key: 'summon:defense_temp_wall:strip',
    url: `${SUMMON_FRAMES_BASE}/defense_temp_wall.png`,
    frameWidth: 609,
    frameHeight: 455,
    frameCount: 4
  },
  {
    key: 'summon:summon_energy_sprite:strip',
    url: `${SUMMON_FRAMES_BASE}/summon_energy_sprite.png`,
    frameWidth: 575,
    frameHeight: 459,
    frameCount: 4
  },
  {
    key: 'summon:pivot_wall_feedback:strip',
    url: `${SUMMON_FRAMES_BASE}/pivot_wall_feedback.png`,
    frameWidth: 613,
    frameHeight: 512,
    frameCount: 4
  },
  {
    key: 'summon:attack_molten_chain:strip',
    url: `${SUMMON_FRAMES_BASE}/attack_molten_chain.png`,
    frameWidth: 630,
    frameHeight: 368,
    frameCount: 4
  },
  {
    key: 'summon:reward_fire_dragon_breath:strip',
    url: `${SUMMON_FRAMES_BASE}/reward_fire_dragon_breath.png`,
    frameWidth: 768,
    frameHeight: 304,
    frameCount: 4
  },
  {
    key: 'summon:premium_starfall_contract:strip',
    url: `${SUMMON_FRAMES_BASE}/premium_starfall_contract.png`,
    frameWidth: 633,
    frameHeight: 491,
    frameCount: 4
  }
]

// Frame-rate / loop policy per card. Mirrors the "地图特效播放方式" notes in
// docs/czx_20260506.md. One-shot bursts target ~400-500ms total so they finish
// before the entry-bounce-fade tween completes; sustained allies (golem,
// fairy, hawks, dome) loop slowly while the sprite is on stage.
const summonAnimations: SpritesheetAnimationAsset[] = [
  { key: 'summon:energy_instant_power:play', spritesheet: 'summon:energy_instant_power:strip', frameRate: 10, repeat: 0 },
  { key: 'summon:emergency_freeze:play', spritesheet: 'summon:emergency_freeze:strip', frameRate: 10, repeat: 0 },
  { key: 'summon:emergency_repair_all:play', spritesheet: 'summon:emergency_repair_all:strip', frameRate: 8, repeat: 0 },
  { key: 'summon:spell_lava_rain:play', spritesheet: 'summon:spell_lava_rain:strip', frameRate: 10, repeat: 0 },
  { key: 'summon:summon_flame_hawks:play', spritesheet: 'summon:summon_flame_hawks:strip', frameRate: 6, repeat: -1 },
  { key: 'summon:summon_furnace_golem:play', spritesheet: 'summon:summon_furnace_golem:strip', frameRate: 5, repeat: -1 },
  { key: 'summon:defense_temp_wall:play', spritesheet: 'summon:defense_temp_wall:strip', frameRate: 7, repeat: -1 },
  { key: 'summon:summon_energy_sprite:play', spritesheet: 'summon:summon_energy_sprite:strip', frameRate: 7, repeat: -1 },
  { key: 'summon:pivot_wall_feedback:play', spritesheet: 'summon:pivot_wall_feedback:strip', frameRate: 8, repeat: 0 },
  { key: 'summon:attack_molten_chain:play', spritesheet: 'summon:attack_molten_chain:strip', frameRate: 12, repeat: 0 },
  { key: 'summon:reward_fire_dragon_breath:play', spritesheet: 'summon:reward_fire_dragon_breath:strip', frameRate: 10, repeat: 0 },
  { key: 'summon:premium_starfall_contract:play', spritesheet: 'summon:premium_starfall_contract:strip', frameRate: 10, repeat: 0 }
]

const enemySpritesheets: SpritesheetAsset[] = [
  { key: 'enemy:ember_grunt:walk', url: '/assets/game/units/enemies/ember_grunt/walk.png', frameWidth: 411, frameHeight: 534, frameCount: 3 },
  { key: 'enemy:ember_grunt:attack', url: '/assets/game/units/enemies/ember_grunt/attack.png', frameWidth: 622, frameHeight: 554, frameCount: 3 },
  { key: 'enemy:ember_grunt:hit', url: '/assets/game/units/enemies/ember_grunt/hit.png', frameWidth: 445, frameHeight: 565, frameCount: 3 },
  { key: 'enemy:spark_runner:walk', url: '/assets/game/units/enemies/spark_runner/walk.png', frameWidth: 587, frameHeight: 309, frameCount: 3 },
  { key: 'enemy:spark_runner:attack', url: '/assets/game/units/enemies/spark_runner/attack.png', frameWidth: 683, frameHeight: 361, frameCount: 3 },
  { key: 'enemy:spark_runner:hit', url: '/assets/game/units/enemies/spark_runner/hit.png', frameWidth: 557, frameHeight: 395, frameCount: 3 },
  { key: 'enemy:basalt_smasher:walk', url: '/assets/game/units/enemies/basalt_smasher/walk.png', frameWidth: 579, frameHeight: 524, frameCount: 3 },
  { key: 'enemy:basalt_smasher:attack', url: '/assets/game/units/enemies/basalt_smasher/attack.png', frameWidth: 613, frameHeight: 638, frameCount: 3 },
  { key: 'enemy:basalt_smasher:hit', url: '/assets/game/units/enemies/basalt_smasher/hit.png', frameWidth: 647, frameHeight: 607, frameCount: 3 },
  { key: 'enemy:ash_wing:walk', url: '/assets/game/units/enemies/ash_wing/walk.png', frameWidth: 683, frameHeight: 574, frameCount: 3 },
  { key: 'enemy:ash_wing:attack', url: '/assets/game/units/enemies/ash_wing/attack.png', frameWidth: 646, frameHeight: 524, frameCount: 3 },
  { key: 'enemy:ash_wing:hit', url: '/assets/game/units/enemies/ash_wing/hit.png', frameWidth: 585, frameHeight: 534, frameCount: 3 },
  {
    key: 'enemy:volcano_core_beast:walk',
    url: '/assets/game/units/enemies/volcano_core_beast/walk.png',
    frameWidth: 618,
    frameHeight: 625,
    frameCount: 3
  },
  {
    key: 'enemy:volcano_core_beast:attack',
    url: '/assets/game/units/enemies/volcano_core_beast/attack.png',
    frameWidth: 660,
    frameHeight: 605,
    frameCount: 3
  },
  {
    key: 'enemy:volcano_core_beast:hit',
    url: '/assets/game/units/enemies/volcano_core_beast/hit.png',
    frameWidth: 636,
    frameHeight: 615,
    frameCount: 3
  }
]

const enemyAnimations: SpritesheetAnimationAsset[] = [
  { key: 'enemy:ember_grunt:walk:play', spritesheet: 'enemy:ember_grunt:walk', frameRate: 7, repeat: -1 },
  { key: 'enemy:ember_grunt:attack:play', spritesheet: 'enemy:ember_grunt:attack', frameRate: 9, repeat: -1 },
  { key: 'enemy:ember_grunt:hit:play', spritesheet: 'enemy:ember_grunt:hit', frameRate: 12, repeat: 0 },
  { key: 'enemy:spark_runner:walk:play', spritesheet: 'enemy:spark_runner:walk', frameRate: 10, repeat: -1 },
  { key: 'enemy:spark_runner:attack:play', spritesheet: 'enemy:spark_runner:attack', frameRate: 10, repeat: -1 },
  { key: 'enemy:spark_runner:hit:play', spritesheet: 'enemy:spark_runner:hit', frameRate: 12, repeat: 0 },
  { key: 'enemy:basalt_smasher:walk:play', spritesheet: 'enemy:basalt_smasher:walk', frameRate: 5, repeat: -1 },
  { key: 'enemy:basalt_smasher:attack:play', spritesheet: 'enemy:basalt_smasher:attack', frameRate: 8, repeat: -1 },
  { key: 'enemy:basalt_smasher:hit:play', spritesheet: 'enemy:basalt_smasher:hit', frameRate: 10, repeat: 0 },
  { key: 'enemy:ash_wing:walk:play', spritesheet: 'enemy:ash_wing:walk', frameRate: 8, repeat: -1 },
  { key: 'enemy:ash_wing:attack:play', spritesheet: 'enemy:ash_wing:attack', frameRate: 9, repeat: -1 },
  { key: 'enemy:ash_wing:hit:play', spritesheet: 'enemy:ash_wing:hit', frameRate: 12, repeat: 0 },
  { key: 'enemy:volcano_core_beast:walk:play', spritesheet: 'enemy:volcano_core_beast:walk', frameRate: 4, repeat: -1 },
  { key: 'enemy:volcano_core_beast:attack:play', spritesheet: 'enemy:volcano_core_beast:attack', frameRate: 7, repeat: -1 },
  { key: 'enemy:volcano_core_beast:hit:play', spritesheet: 'enemy:volcano_core_beast:hit', frameRate: 9, repeat: 0 }
]

const spritesheets = [...summonSpritesheets, ...enemySpritesheets]
const spritesheetAnimations = [...summonAnimations, ...enemyAnimations]

const buildings: Record<PlantType, BuildingVisualSpec> = {
  energy_core: {
      body: {
        textureKey: 'energy-core-idle',
        frame: 'building/energy_core/idle/0001',
        animationKey: 'building:energy_core:idle'
      },
      displayWidth: 94,
      displayHeight: 96,
      bodyOffsetY: 30,
      hpOffsetY: 60,
      shadow: { width: 70, height: 16, offsetY: 36, alpha: 0.18 },
      idleBob: { distance: 3, duration: 1080 },
      upgradeRing: { radius: 34, offsetY: -16 }
  },
  melee_turret: {
      body: {
        textureKey: 'melee-turret-idle',
        frame: 'building/melee_turret/idle/0001',
        animationKey: 'building:melee_turret:idle'
      },
      displayWidth: 82,
      displayHeight: 96,
      bodyOffsetY: 28,
      hpOffsetY: 56,
      shadow: { width: 72, height: 16, offsetY: 36, alpha: 0.18 },
      idleBob: { distance: 2, duration: 860 },
      recoil: { distance: 5, duration: 48, scaleX: 1.05 },
      attackAnimation: {
        body: {
          textureKey: 'melee-turret-attack',
          frame: 'building/melee_turret/attack/0001',
          animationKey: 'building:melee_turret:attack'
        },
        displayWidth: 82,
        displayHeight: 96,
        bodyOffsetY: 28
      },
      upgradeRing: { radius: 34, offsetY: -12 }
  },
  ranged_turret: {
      body: { textureKey: 'building:ranged_turret:base' },
      displayWidth: 98,
      displayHeight: 90,
      bodyOffsetY: 28,
      hpOffsetY: 56,
      shadow: { width: 70, height: 16, offsetY: 36, alpha: 0.18 },
      idleBob: { distance: 2, duration: 1080 },
      recoil: { distance: 8, duration: 76, scaleX: 0.95 },
      upgradeRing: { radius: 35, offsetY: -12 }
  },
  laser_turret: {
      body: { textureKey: 'building:laser_turret:base' },
      displayWidth: 94,
      displayHeight: 96,
      bodyOffsetY: 28,
      hpOffsetY: 60,
      shadow: { width: 66, height: 16, offsetY: 38, alpha: 0.2 },
      idleBob: { distance: 4, duration: 720 },
      recoil: { distance: 10, duration: 52, scaleX: 0.9 },
      upgradeRing: { radius: 36, offsetY: -12 }
  },
  lava_wall: {
      body: {
        textureKey: 'lava-wall-shield',
        frame: 'building/lava_wall/shield/0001',
        animationKey: 'building:lava_wall:shield'
      },
      displayWidth: 112,
      displayHeight: 88,
      bodyOffsetY: 34,
      hpOffsetY: 56,
      shadow: { width: 82, height: 18, offsetY: 38, alpha: 0.2 },
      idleBob: { distance: 2, duration: 1350 },
      upgradeRing: { radius: 40, offsetY: -8 }
  }
}

const enemies: Record<ZombieType, EnemyVisualSpec> = {
    ember_grunt: {
      body: { textureKey: 'enemy:ember_grunt:walk', animationKey: 'enemy:ember_grunt:walk:play' },
      states: {
        walk: { textureKey: 'enemy:ember_grunt:walk', animationKey: 'enemy:ember_grunt:walk:play' },
        attack: { textureKey: 'enemy:ember_grunt:attack', animationKey: 'enemy:ember_grunt:attack:play' },
        hit: { textureKey: 'enemy:ember_grunt:hit', animationKey: 'enemy:ember_grunt:hit:play' }
      },
      displayWidth: 82,
      displayHeight: 98,
      bodyOffsetY: 32,
      hpOffsetY: 68,
      shadow: { width: 58, height: 16, offsetY: 48, alpha: 0.18 },
      hoverOffsetY: 8
    },
    spark_runner: {
      body: { textureKey: 'enemy:spark_runner:walk', animationKey: 'enemy:spark_runner:walk:play' },
      states: {
        walk: { textureKey: 'enemy:spark_runner:walk', animationKey: 'enemy:spark_runner:walk:play' },
        attack: { textureKey: 'enemy:spark_runner:attack', animationKey: 'enemy:spark_runner:attack:play' },
        hit: { textureKey: 'enemy:spark_runner:hit', animationKey: 'enemy:spark_runner:hit:play' }
      },
      displayWidth: 88,
      displayHeight: 92,
      bodyOffsetY: 30,
      hpOffsetY: 68,
      shadow: { width: 62, height: 16, offsetY: 46, alpha: 0.16 },
      hoverOffsetY: 8
    },
    basalt_smasher: {
      body: { textureKey: 'enemy:basalt_smasher:walk', animationKey: 'enemy:basalt_smasher:walk:play' },
      states: {
        walk: { textureKey: 'enemy:basalt_smasher:walk', animationKey: 'enemy:basalt_smasher:walk:play' },
        attack: { textureKey: 'enemy:basalt_smasher:attack', animationKey: 'enemy:basalt_smasher:attack:play' },
        hit: { textureKey: 'enemy:basalt_smasher:hit', animationKey: 'enemy:basalt_smasher:hit:play' }
      },
      displayWidth: 104,
      displayHeight: 116,
      bodyOffsetY: 34,
      hpOffsetY: 78,
      shadow: { width: 74, height: 18, offsetY: 56, alpha: 0.22 },
      hoverOffsetY: 10
    },
    ash_wing: {
      body: { textureKey: 'enemy:ash_wing:walk', animationKey: 'enemy:ash_wing:walk:play' },
      states: {
        walk: { textureKey: 'enemy:ash_wing:walk', animationKey: 'enemy:ash_wing:walk:play' },
        attack: { textureKey: 'enemy:ash_wing:attack', animationKey: 'enemy:ash_wing:attack:play' },
        hit: { textureKey: 'enemy:ash_wing:hit', animationKey: 'enemy:ash_wing:hit:play' }
      },
      displayWidth: 112,
      displayHeight: 108,
      bodyOffsetY: 28,
      hpOffsetY: 74,
      shadow: { width: 54, height: 14, offsetY: 50, alpha: 0.12 },
      hoverOffsetY: 8
    },
    volcano_core_beast: {
      body: { textureKey: 'enemy:volcano_core_beast:walk', animationKey: 'enemy:volcano_core_beast:walk:play' },
      states: {
        walk: { textureKey: 'enemy:volcano_core_beast:walk', animationKey: 'enemy:volcano_core_beast:walk:play' },
        attack: { textureKey: 'enemy:volcano_core_beast:attack', animationKey: 'enemy:volcano_core_beast:attack:play' },
        hit: { textureKey: 'enemy:volcano_core_beast:hit', animationKey: 'enemy:volcano_core_beast:hit:play' }
      },
      displayWidth: 138,
      displayHeight: 150,
      bodyOffsetY: 38,
      hpOffsetY: 92,
      shadow: { width: 104, height: 20, offsetY: 62, alpha: 0.24 },
      hoverOffsetY: 12
    }
  }

const projectiles: Record<'basicBolt' | 'laserBeam', ProjectileVisualSpec> = {
    basicBolt: {
      body: {
        textureKey: 'ranged-turret-bolt',
        frame: 'projectile/ranged_bolt/fly/0001',
        animationKey: 'projectile:ranged_bolt:fly'
      },
      displayWidth: 46,
      displayHeight: 30,
      auraRadius: 14,
      auraColor: 0xffef8a,
      auraAlpha: 0.18
    },
    laserBeam: {
      body: {
        textureKey: 'fx-premium',
        frame: 'projectile/basic_bolt/fly/0001',
        animationKey: 'projectile:basic_bolt:fly'
      },
      displayWidth: 112,
      displayHeight: 34,
      auraRadius: 24,
      auraColor: 0x8ff6ff,
      auraAlpha: 0.36
    }
  }

const effects: { projectileHit: EffectVisualSpec; zombieKill: EffectVisualSpec } = {
    projectileHit: {
      body: {
        textureKey: 'fx-premium',
        frame: 'fx/projectile_impact/burst/0001',
        animationKey: 'fx:projectile_impact:burst'
      },
      displayWidth: 72,
      displayHeight: 52,
      offsetY: 0,
      depth: 68
    },
    zombieKill: {
      body: {
        textureKey: 'fx-premium',
        frame: 'fx/projectile_impact/burst/0001',
        animationKey: 'fx:projectile_impact:burst'
      },
      displayWidth: 96,
      displayHeight: 70,
      offsetY: -4,
      depth: 70,
      scale: 1.15
    }
  }

// Summons map every implemented strategy card id to a one-shot visual.
// Keys are intentionally StrategyCardId strings so EffectsRenderer can look
// up the right art directly from the skillSummoned event payload.
//
// Each entry now points to a 4-frame sprite-sheet generated from the AI art
// pipeline. The legacy SVG textures stay registered in `textures[]` as a
// safety net in case a sprite-sheet fails to load, but the active visuals run
// off the spritesheet via `animationKey`.
//
// Display sizing rule of thumb (lawn cell is 64x80):
//   - point bursts (energy / freeze / pivot): ~1.5 cell wide, origin center
//   - field effects (repair / lava rain / molten chain): ~2-3 cell wide
//   - ground creatures (golem / wall): ~1.5 cell wide, origin (0.5, 0.85)
//     so the sprite lands on the cell instead of floating
//   - flying summons (hawks / energy sprite): origin center, offsetY pushes
//     the sprite up ~half a cell so it hovers above the spawn point
//   - drop-from-above (lava rain / starfall): origin (0.5, 0.7) so the
//     impact reads at the spawn point, with the trail extending upward
const summons: Record<string, SummonVisualSpec> = {
  energy_instant_power: {
    textureKey: 'summon:energy_instant_power:strip',
    animationKey: 'summon:energy_instant_power:play',
    displayWidth: 96,
    displayHeight: 96,
    offsetY: -8,
    depth: 84,
    label: '能量喷涌',
    tintColor: 0xffd76a
  },
  emergency_freeze: {
    textureKey: 'summon:emergency_freeze:strip',
    animationKey: 'summon:emergency_freeze:play',
    displayWidth: 120,
    displayHeight: 100,
    offsetY: 0,
    depth: 85,
    label: '时滞法环',
    tintColor: 0x9de7ff
  },
  emergency_repair_all: {
    textureKey: 'summon:emergency_repair_all:strip',
    animationKey: 'summon:emergency_repair_all:play',
    displayWidth: 140,
    displayHeight: 134,
    offsetY: 0,
    depth: 84,
    label: '愈光灌注',
    tintColor: 0xb6f8c8
  },
  spell_lava_rain: {
    textureKey: 'summon:spell_lava_rain:strip',
    animationKey: 'summon:spell_lava_rain:play',
    origin: { x: 0.5, y: 0.7 },
    displayWidth: 140,
    displayHeight: 104,
    offsetY: -10,
    depth: 86,
    label: '星辉骤雨',
    tintColor: 0xffd06a
  },
  summon_flame_hawks: {
    textureKey: 'summon:summon_flame_hawks:strip',
    animationKey: 'summon:summon_flame_hawks:play',
    repeatAnimation: true,
    displayWidth: 124,
    displayHeight: 86,
    offsetY: -36,
    depth: 84,
    label: '风羽使魔',
    tintColor: 0x9be3ff
  },
  summon_furnace_golem: {
    textureKey: 'summon:summon_furnace_golem:strip',
    animationKey: 'summon:summon_furnace_golem:play',
    repeatAnimation: true,
    origin: { x: 0.5, y: 0.85 },
    displayWidth: 104,
    displayHeight: 72,
    offsetY: 26,
    depth: 83,
    label: '学院魔偶',
    tintColor: 0xb87dff
  },
  defense_temp_wall: {
    textureKey: 'summon:defense_temp_wall:strip',
    animationKey: 'summon:defense_temp_wall:play',
    repeatAnimation: true,
    origin: { x: 0.5, y: 0.85 },
    displayWidth: 92,
    displayHeight: 70,
    offsetY: 24,
    depth: 84,
    label: '以太结界',
    tintColor: 0xa6f6e0
  },
  summon_energy_sprite: {
    textureKey: 'summon:summon_energy_sprite:strip',
    animationKey: 'summon:summon_energy_sprite:play',
    repeatAnimation: true,
    displayWidth: 88,
    displayHeight: 72,
    offsetY: -28,
    depth: 84,
    label: '能量精灵',
    tintColor: 0x85f6ff
  },
  pivot_wall_feedback: {
    textureKey: 'summon:pivot_wall_feedback:strip',
    animationKey: 'summon:pivot_wall_feedback:play',
    displayWidth: 110,
    displayHeight: 96,
    offsetY: -8,
    depth: 85,
    label: '奥术反震',
    tintColor: 0xffb7eb
  },
  attack_molten_chain: {
    textureKey: 'summon:attack_molten_chain:strip',
    animationKey: 'summon:attack_molten_chain:play',
    displayWidth: 140,
    displayHeight: 84,
    offsetY: -8,
    depth: 86,
    label: '秘火连锁',
    tintColor: 0xff9a4a
  },
  reward_fire_dragon_breath: {
    textureKey: 'summon:reward_fire_dragon_breath:strip',
    animationKey: 'summon:reward_fire_dragon_breath:play',
    displayWidth: 220,
    displayHeight: 88,
    offsetY: -4,
    depth: 88,
    label: '火龙吐息',
    tintColor: 0xff7f45
  },
  premium_starfall_contract: {
    textureKey: 'summon:premium_starfall_contract:strip',
    animationKey: 'summon:premium_starfall_contract:play',
    origin: { x: 0.5, y: 0.7 },
    displayWidth: 120,
    displayHeight: 96,
    offsetY: -14,
    depth: 88,
    label: '星陨契约',
    tintColor: 0xffd16a
  }
}

// Persistent overlays attached to game entities (frozen zombies, temporary
// walls, summoned golems, orbiting energy sprites). EffectsRenderer drives
// these from `update(context)` instead of one-shot events so the visuals
// follow the entity's lifecycle automatically.
const summonOverlays: Record<string, SummonOverlaySpec> = {
  defense_temp_wall: {
    textureKey: 'summon:defense_temp_wall:strip',
    frame: 3,
    displayWidth: 64,
    displayHeight: 78,
    origin: { x: 0.5, y: 0.55 },
    alpha: 0.95,
    depth: 56,
    tintColor: 0xa6f6e0
  },
  summon_furnace_golem: {
    textureKey: 'summon:summon_furnace_golem:strip',
    animationKey: 'summon:summon_furnace_golem:play',
    displayWidth: 78,
    displayHeight: 70,
    offsetY: 4,
    origin: { x: 0.5, y: 0.7 },
    depth: 58,
    tintColor: 0xb87dff
  },
  emergency_freeze: {
    textureKey: 'summon:emergency_freeze:strip',
    frame: 2,
    displayWidth: 56,
    displayHeight: 52,
    origin: { x: 0.5, y: 0.55 },
    alpha: 0.78,
    depth: 75,
    tintColor: 0x9de7ff
  },
  summon_energy_sprite: {
    textureKey: 'summon:summon_energy_sprite:strip',
    animationKey: 'summon:summon_energy_sprite:play',
    displayWidth: 38,
    displayHeight: 32,
    origin: { x: 0.5, y: 0.5 },
    depth: 86,
    tintColor: 0x85f6ff
  }
}

// Asset keys are the public contract used by Phaser renderers.
// Paths stay private here so art can be reorganized without touching scene code.
export const assetManifest = {
  atlases,
  images,
  textures,
  spritesheets,
  animations,
  summonAnimations,
  enemyAnimations,
  spritesheetAnimations,
  buildings,
  enemies,
  projectiles,
  effects,
  summons,
  summonOverlays
} as const

export const battleBackgroundKey = defaultBattleBackground.key

export function getBattleBackgroundKey(mapId: string) {
  return battleBackgrounds.find((background) => background.mapId === mapId)?.key ?? defaultBattleBackground.key
}

export function getBattleBackgroundUrl(mapId: string) {
  return battleBackgrounds.find((background) => background.mapId === mapId)?.url ?? defaultBattleBackground.url
}

export type BuildingVisual = (typeof buildings)[PlantType]
export type EnemyVisual = (typeof enemies)[ZombieType]
export type ProjectileVisual = (typeof projectiles)[keyof typeof projectiles]
export type EffectVisual = (typeof effects)[keyof typeof effects]
export type SummonVisual = (typeof summons)[keyof typeof summons]
export type SummonOverlay = SummonOverlaySpec
