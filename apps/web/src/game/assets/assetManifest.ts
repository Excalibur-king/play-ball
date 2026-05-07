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
  startFrame?: number
  endFrame?: number
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
  deathAnimation?: {
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
    death: SpriteState
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

// Per-card 8-frame strips produced by `scripts/process_skill_card_frames.py`.
// Frame sizes mirror `apps/web/public/assets/game/summons/frames/manifest.json`.
const SUMMON_FRAMES_BASE = '/assets/game/summons/frames'
const SUMMON_OVERLAYS_BASE = '/assets/game/summons/overlays'

const summonSpritesheets: SpritesheetAsset[] = [
  {
    key: 'summon:energy_instant_power:strip',
    url: `${SUMMON_FRAMES_BASE}/energy_instant_power.png`,
    frameWidth: 472,
    frameHeight: 627,
    frameCount: 8
  },
  {
    key: 'summon:emergency_freeze:strip',
    url: `${SUMMON_FRAMES_BASE}/emergency_freeze.png`,
    frameWidth: 597,
    frameHeight: 594,
    frameCount: 8
  },
  {
    key: 'summon:emergency_repair_all:strip',
    url: `${SUMMON_FRAMES_BASE}/emergency_repair_all.png`,
    frameWidth: 613,
    frameHeight: 682,
    frameCount: 8
  },
  {
    key: 'summon:spell_lava_rain:strip',
    url: `${SUMMON_FRAMES_BASE}/spell_lava_rain.png`,
    frameWidth: 633,
    frameHeight: 648,
    frameCount: 8
  },
  {
    key: 'summon:summon_flame_hawks:strip',
    url: `${SUMMON_FRAMES_BASE}/summon_flame_hawks.png`,
    frameWidth: 610,
    frameHeight: 603,
    frameCount: 8
  },
  {
    key: 'summon:summon_furnace_golem:strip',
    url: `${SUMMON_FRAMES_BASE}/summon_furnace_golem.png`,
    frameWidth: 603,
    frameHeight: 543,
    frameCount: 8
  },
  {
    key: 'summon:defense_temp_wall:strip',
    url: `${SUMMON_FRAMES_BASE}/defense_temp_wall.png`,
    frameWidth: 576,
    frameHeight: 576,
    frameCount: 8
  },
  {
    key: 'summon:summon_energy_sprite:strip',
    url: `${SUMMON_FRAMES_BASE}/summon_energy_sprite.png`,
    frameWidth: 573,
    frameHeight: 585,
    frameCount: 8
  },
  {
    key: 'summon:pivot_wall_feedback:strip',
    url: `${SUMMON_FRAMES_BASE}/pivot_wall_feedback.png`,
    frameWidth: 657,
    frameHeight: 663,
    frameCount: 8
  },
  {
    key: 'summon:attack_molten_chain:strip',
    url: `${SUMMON_FRAMES_BASE}/attack_molten_chain.png`,
    frameWidth: 682,
    frameHeight: 473,
    frameCount: 8
  },
  {
    key: 'summon:reward_fire_dragon_breath:strip',
    url: `${SUMMON_FRAMES_BASE}/reward_fire_dragon_breath.png`,
    frameWidth: 682,
    frameHeight: 682,
    frameCount: 8
  },
  {
    key: 'summon:premium_starfall_contract:strip',
    url: `${SUMMON_FRAMES_BASE}/premium_starfall_contract.png`,
    frameWidth: 598,
    frameHeight: 682,
    frameCount: 8
  },
  {
    key: 'summon:summon_furnace_golem:idle',
    url: `${SUMMON_OVERLAYS_BASE}/summon_furnace_golem/idle.png`,
    frameWidth: 542,
    frameHeight: 530,
    frameCount: 1
  },
  {
    key: 'summon:summon_furnace_golem:attack',
    url: `${SUMMON_OVERLAYS_BASE}/summon_furnace_golem/attack.png`,
    frameWidth: 601,
    frameHeight: 502,
    frameCount: 2
  },
  {
    key: 'summon:defense_temp_wall:idle',
    url: `${SUMMON_OVERLAYS_BASE}/defense_temp_wall/idle.png`,
    frameWidth: 508,
    frameHeight: 512,
    frameCount: 1
  },
  {
    key: 'summon:summon_energy_sprite:active',
    url: `${SUMMON_OVERLAYS_BASE}/summon_energy_sprite/active.png`,
    frameWidth: 573,
    frameHeight: 565,
    frameCount: 3
  }
]

// Frame-rate / loop policy per card. Mirrors the "地图特效播放方式" notes in
// docs/czx_20260506.md. One-shot bursts target ~400-500ms total so they finish
// before the entry-bounce-fade tween completes; sustained allies (golem,
// fairy, hawks, dome) loop slowly while the sprite is on stage.
const summonAnimations: SpritesheetAnimationAsset[] = [
  { key: 'summon:energy_instant_power:play', spritesheet: 'summon:energy_instant_power:strip', frameRate: 14, repeat: 0 },
  { key: 'summon:emergency_freeze:play', spritesheet: 'summon:emergency_freeze:strip', frameRate: 14, repeat: 0 },
  { key: 'summon:emergency_repair_all:play', spritesheet: 'summon:emergency_repair_all:strip', frameRate: 14, repeat: 0 },
  { key: 'summon:spell_lava_rain:play', spritesheet: 'summon:spell_lava_rain:strip', frameRate: 14, repeat: 0 },
  { key: 'summon:summon_flame_hawks:play', spritesheet: 'summon:summon_flame_hawks:strip', frameRate: 12, repeat: 0 },
  { key: 'summon:summon_furnace_golem:play', spritesheet: 'summon:summon_furnace_golem:strip', frameRate: 12, repeat: 0 },
  { key: 'summon:defense_temp_wall:play', spritesheet: 'summon:defense_temp_wall:strip', frameRate: 12, repeat: 0 },
  { key: 'summon:summon_energy_sprite:play', spritesheet: 'summon:summon_energy_sprite:strip', frameRate: 12, repeat: 0 },
  { key: 'summon:pivot_wall_feedback:play', spritesheet: 'summon:pivot_wall_feedback:strip', frameRate: 14, repeat: 0 },
  { key: 'summon:attack_molten_chain:play', spritesheet: 'summon:attack_molten_chain:strip', frameRate: 14, repeat: 0 },
  { key: 'summon:reward_fire_dragon_breath:play', spritesheet: 'summon:reward_fire_dragon_breath:strip', frameRate: 12, repeat: 0 },
  { key: 'summon:premium_starfall_contract:play', spritesheet: 'summon:premium_starfall_contract:strip', frameRate: 12, repeat: 0 },
  { key: 'summon:summon_furnace_golem:idle:play', spritesheet: 'summon:summon_furnace_golem:idle', frameRate: 1, repeat: -1 },
  { key: 'summon:summon_furnace_golem:attack:play', spritesheet: 'summon:summon_furnace_golem:attack', frameRate: 8, repeat: -1 },
  { key: 'summon:defense_temp_wall:idle:play', spritesheet: 'summon:defense_temp_wall:idle', frameRate: 1, repeat: -1 },
  { key: 'summon:summon_energy_sprite:active:play', spritesheet: 'summon:summon_energy_sprite:active', frameRate: 8, repeat: -1 }
]

const enemySpritesheets: SpritesheetAsset[] = [
  { key: 'enemy:ember_grunt:walk', url: '/assets/game/units/enemies/ember_grunt/walk.png', frameWidth: 323, frameHeight: 418, frameCount: 4 },
  { key: 'enemy:ember_grunt:attack', url: '/assets/game/units/enemies/ember_grunt/attack.png', frameWidth: 512, frameHeight: 427, frameCount: 4 },
  { key: 'enemy:ember_grunt:hit', url: '/assets/game/units/enemies/ember_grunt/hit.png', frameWidth: 430, frameHeight: 427, frameCount: 4 },
  { key: 'enemy:ember_grunt:death', url: '/assets/game/units/enemies/ember_grunt/death.png', frameWidth: 382, frameHeight: 412, frameCount: 4 },
  { key: 'enemy:spark_runner:walk', url: '/assets/game/units/enemies/spark_runner/walk.png', frameWidth: 468, frameHeight: 294, frameCount: 4 },
  { key: 'enemy:spark_runner:attack', url: '/assets/game/units/enemies/spark_runner/attack.png', frameWidth: 512, frameHeight: 320, frameCount: 4 },
  { key: 'enemy:spark_runner:hit', url: '/assets/game/units/enemies/spark_runner/hit.png', frameWidth: 512, frameHeight: 329, frameCount: 4 },
  { key: 'enemy:spark_runner:death', url: '/assets/game/units/enemies/spark_runner/death.png', frameWidth: 479, frameHeight: 242, frameCount: 4 },
  { key: 'enemy:basalt_smasher:walk', url: '/assets/game/units/enemies/basalt_smasher/walk.png', frameWidth: 444, frameHeight: 402, frameCount: 4 },
  { key: 'enemy:basalt_smasher:attack', url: '/assets/game/units/enemies/basalt_smasher/attack.png', frameWidth: 512, frameHeight: 499, frameCount: 4 },
  { key: 'enemy:basalt_smasher:hit', url: '/assets/game/units/enemies/basalt_smasher/hit.png', frameWidth: 460, frameHeight: 460, frameCount: 4 },
  { key: 'enemy:basalt_smasher:death', url: '/assets/game/units/enemies/basalt_smasher/death.png', frameWidth: 478, frameHeight: 465, frameCount: 4 },
  { key: 'enemy:ash_wing:walk', url: '/assets/game/units/enemies/ash_wing/walk.png', frameWidth: 490, frameHeight: 346, frameCount: 4 },
  { key: 'enemy:ash_wing:attack', url: '/assets/game/units/enemies/ash_wing/attack.png', frameWidth: 512, frameHeight: 355, frameCount: 4 },
  { key: 'enemy:ash_wing:hit', url: '/assets/game/units/enemies/ash_wing/hit.png', frameWidth: 454, frameHeight: 328, frameCount: 4 },
  { key: 'enemy:ash_wing:death', url: '/assets/game/units/enemies/ash_wing/death.png', frameWidth: 467, frameHeight: 346, frameCount: 4 },
  { key: 'enemy:volcano_core_beast:walk', url: '/assets/game/units/enemies/volcano_core_beast/walk.png', frameWidth: 462, frameHeight: 498, frameCount: 4 },
  { key: 'enemy:volcano_core_beast:attack', url: '/assets/game/units/enemies/volcano_core_beast/attack.png', frameWidth: 512, frameHeight: 498, frameCount: 4 },
  { key: 'enemy:volcano_core_beast:hit', url: '/assets/game/units/enemies/volcano_core_beast/hit.png', frameWidth: 503, frameHeight: 498, frameCount: 4 },
  { key: 'enemy:volcano_core_beast:death', url: '/assets/game/units/enemies/volcano_core_beast/death.png', frameWidth: 512, frameHeight: 439, frameCount: 4 }
]

const enemyAnimations: SpritesheetAnimationAsset[] = [
  { key: 'enemy:ember_grunt:walk:play', spritesheet: 'enemy:ember_grunt:walk', frameRate: 7, repeat: -1 },
  { key: 'enemy:ember_grunt:attack:play', spritesheet: 'enemy:ember_grunt:attack', frameRate: 9, repeat: -1 },
  { key: 'enemy:ember_grunt:hit:play', spritesheet: 'enemy:ember_grunt:hit', frameRate: 12, repeat: 0 },
  { key: 'enemy:ember_grunt:death:play', spritesheet: 'enemy:ember_grunt:death', frameRate: 10, repeat: 0 },
  { key: 'enemy:spark_runner:walk:play', spritesheet: 'enemy:spark_runner:walk', frameRate: 10, repeat: -1 },
  { key: 'enemy:spark_runner:attack:play', spritesheet: 'enemy:spark_runner:attack', frameRate: 10, repeat: -1 },
  { key: 'enemy:spark_runner:hit:play', spritesheet: 'enemy:spark_runner:hit', frameRate: 12, repeat: 0 },
  { key: 'enemy:spark_runner:death:play', spritesheet: 'enemy:spark_runner:death', frameRate: 12, repeat: 0 },
  { key: 'enemy:basalt_smasher:walk:play', spritesheet: 'enemy:basalt_smasher:walk', frameRate: 5, repeat: -1 },
  { key: 'enemy:basalt_smasher:attack:play', spritesheet: 'enemy:basalt_smasher:attack', frameRate: 8, repeat: -1 },
  { key: 'enemy:basalt_smasher:hit:play', spritesheet: 'enemy:basalt_smasher:hit', frameRate: 10, repeat: 0 },
  { key: 'enemy:basalt_smasher:death:play', spritesheet: 'enemy:basalt_smasher:death', frameRate: 9, repeat: 0 },
  { key: 'enemy:ash_wing:walk:play', spritesheet: 'enemy:ash_wing:walk', frameRate: 8, repeat: -1 },
  { key: 'enemy:ash_wing:attack:play', spritesheet: 'enemy:ash_wing:attack', frameRate: 9, repeat: -1 },
  { key: 'enemy:ash_wing:hit:play', spritesheet: 'enemy:ash_wing:hit', frameRate: 12, repeat: 0 },
  { key: 'enemy:ash_wing:death:play', spritesheet: 'enemy:ash_wing:death', frameRate: 10, repeat: 0 },
  { key: 'enemy:volcano_core_beast:walk:play', spritesheet: 'enemy:volcano_core_beast:walk', frameRate: 4, repeat: -1 },
  { key: 'enemy:volcano_core_beast:attack:play', spritesheet: 'enemy:volcano_core_beast:attack', frameRate: 7, repeat: -1 },
  { key: 'enemy:volcano_core_beast:hit:play', spritesheet: 'enemy:volcano_core_beast:hit', frameRate: 9, repeat: 0 },
  { key: 'enemy:volcano_core_beast:death:play', spritesheet: 'enemy:volcano_core_beast:death', frameRate: 8, repeat: 0 }
]

const buildingSpritesheets: SpritesheetAsset[] = [
  { key: 'building:melee_turret:idle', url: '/assets/game/units/buildings/melee_turret/idle.png', frameWidth: 269, frameHeight: 339, frameCount: 1 },
  { key: 'building:melee_turret:attack', url: '/assets/game/units/buildings/melee_turret/attack.png', frameWidth: 351, frameHeight: 339, frameCount: 4 },
  { key: 'building:energy_core:idle', url: '/assets/game/units/buildings/energy_core/idle.png', frameWidth: 296, frameHeight: 355, frameCount: 1 },
  { key: 'building:energy_core:attack', url: '/assets/game/units/buildings/energy_core/attack.png', frameWidth: 409, frameHeight: 350, frameCount: 4 },
  { key: 'building:laser_turret:idle', url: '/assets/game/units/buildings/laser_turret/idle.png', frameWidth: 369, frameHeight: 369, frameCount: 1 },
  { key: 'building:laser_turret:attack', url: '/assets/game/units/buildings/laser_turret/attack.png', frameWidth: 409, frameHeight: 409, frameCount: 4 },
  { key: 'building:ranged_turret:idle', url: '/assets/game/units/buildings/ranged_turret/idle.png', frameWidth: 284, frameHeight: 383, frameCount: 1 },
  { key: 'building:ranged_turret:attack', url: '/assets/game/units/buildings/ranged_turret/attack.png', frameWidth: 361, frameHeight: 384, frameCount: 4 },
  { key: 'building:lava_wall:idle', url: '/assets/game/units/buildings/lava_wall/idle.png', frameWidth: 289, frameHeight: 385, frameCount: 1 },
  { key: 'building:lava_wall:attack', url: '/assets/game/units/buildings/lava_wall/attack.png', frameWidth: 409, frameHeight: 387, frameCount: 4 }
]

const buildingAnimations: SpritesheetAnimationAsset[] = [
  { key: 'building:melee_turret:idle:play', spritesheet: 'building:melee_turret:idle', frameRate: 6, repeat: -1 },
  { key: 'building:melee_turret:attack:play', spritesheet: 'building:melee_turret:attack', frameRate: 12, repeat: 0 },
  { key: 'building:energy_core:idle:play', spritesheet: 'building:energy_core:idle', frameRate: 6, repeat: -1 },
  { key: 'building:energy_core:attack:play', spritesheet: 'building:energy_core:attack', frameRate: 12, repeat: 0 },
  { key: 'building:laser_turret:idle:play', spritesheet: 'building:laser_turret:idle', frameRate: 6, repeat: -1 },
  { key: 'building:laser_turret:attack:play', spritesheet: 'building:laser_turret:attack', frameRate: 12, repeat: 0 },
  { key: 'building:ranged_turret:idle:play', spritesheet: 'building:ranged_turret:idle', frameRate: 6, repeat: -1 },
  { key: 'building:ranged_turret:attack:play', spritesheet: 'building:ranged_turret:attack', frameRate: 12, repeat: 0 },
  { key: 'building:lava_wall:idle:play', spritesheet: 'building:lava_wall:idle', frameRate: 6, repeat: -1 },
  { key: 'building:lava_wall:attack:play', spritesheet: 'building:lava_wall:attack', frameRate: 12, repeat: 0 }
]

const spritesheets = [...summonSpritesheets, ...enemySpritesheets, ...buildingSpritesheets]
const spritesheetAnimations = [...summonAnimations, ...enemyAnimations, ...buildingAnimations]

const buildings: Record<PlantType, BuildingVisualSpec> = {
  energy_core: {
      body: {
        textureKey: 'building:energy_core:idle',
        animationKey: 'building:energy_core:idle:play'
      },
      displayWidth: 82,
      displayHeight: 98,
      bodyOffsetY: 30,
      hpOffsetY: 60,
      shadow: { width: 70, height: 16, offsetY: 36, alpha: 0.18 },
      idleBob: { distance: 3, duration: 1080 },
      attackAnimation: {
        body: {
          textureKey: 'building:energy_core:attack',
          animationKey: 'building:energy_core:attack:play'
        },
        displayWidth: 114,
        displayHeight: 98,
        bodyOffsetY: 30
      },
      upgradeRing: { radius: 34, offsetY: -16 }
  },
  melee_turret: {
      body: {
        textureKey: 'building:melee_turret:idle',
        animationKey: 'building:melee_turret:idle:play'
      },
      displayWidth: 78,
      displayHeight: 98,
      bodyOffsetY: 28,
      hpOffsetY: 56,
      shadow: { width: 72, height: 16, offsetY: 36, alpha: 0.18 },
      idleBob: { distance: 2, duration: 860 },
      recoil: { distance: 5, duration: 48, scaleX: 1.05 },
      attackAnimation: {
        body: {
          textureKey: 'building:melee_turret:attack',
          animationKey: 'building:melee_turret:attack:play'
        },
        displayWidth: 102,
        displayHeight: 98,
        bodyOffsetY: 28
      },
      upgradeRing: { radius: 34, offsetY: -12 }
  },
  ranged_turret: {
      body: { textureKey: 'building:ranged_turret:idle', animationKey: 'building:ranged_turret:idle:play' },
      displayWidth: 74,
      displayHeight: 100,
      bodyOffsetY: 28,
      hpOffsetY: 56,
      shadow: { width: 70, height: 16, offsetY: 36, alpha: 0.18 },
      idleBob: { distance: 2, duration: 1080 },
      recoil: { distance: 8, duration: 76, scaleX: 0.95 },
      attackAnimation: {
        body: {
          textureKey: 'building:ranged_turret:attack',
          animationKey: 'building:ranged_turret:attack:play'
        },
        displayWidth: 94,
        displayHeight: 100,
        bodyOffsetY: 28
      },
      upgradeRing: { radius: 35, offsetY: -12 }
  },
  laser_turret: {
      body: { textureKey: 'building:laser_turret:idle', animationKey: 'building:laser_turret:idle:play' },
      displayWidth: 94,
      displayHeight: 94,
      bodyOffsetY: 28,
      hpOffsetY: 60,
      shadow: { width: 66, height: 16, offsetY: 38, alpha: 0.2 },
      idleBob: { distance: 4, duration: 720 },
      recoil: { distance: 10, duration: 52, scaleX: 0.9 },
      attackAnimation: {
        body: {
          textureKey: 'building:laser_turret:attack',
          animationKey: 'building:laser_turret:attack:play'
        },
        displayWidth: 100,
        displayHeight: 100,
        bodyOffsetY: 28
      },
      upgradeRing: { radius: 36, offsetY: -12 }
  },
  lava_wall: {
      body: {
        textureKey: 'building:lava_wall:idle',
        animationKey: 'building:lava_wall:idle:play'
      },
      displayWidth: 76,
      displayHeight: 102,
      bodyOffsetY: 34,
      hpOffsetY: 56,
      shadow: { width: 82, height: 18, offsetY: 38, alpha: 0.2 },
      idleBob: { distance: 2, duration: 1350 },
      attackAnimation: {
        body: {
          textureKey: 'building:lava_wall:attack',
          animationKey: 'building:lava_wall:attack:play'
        },
        displayWidth: 108,
        displayHeight: 102,
        bodyOffsetY: 34
      },
      upgradeRing: { radius: 40, offsetY: -8 }
  }
}

const enemies: Record<ZombieType, EnemyVisualSpec> = {
    ember_grunt: {
      body: { textureKey: 'enemy:ember_grunt:walk', animationKey: 'enemy:ember_grunt:walk:play' },
      states: {
        walk: { textureKey: 'enemy:ember_grunt:walk', animationKey: 'enemy:ember_grunt:walk:play' },
        attack: { textureKey: 'enemy:ember_grunt:attack', animationKey: 'enemy:ember_grunt:attack:play' },
        hit: { textureKey: 'enemy:ember_grunt:hit', animationKey: 'enemy:ember_grunt:hit:play' },
        death: { textureKey: 'enemy:ember_grunt:death', animationKey: 'enemy:ember_grunt:death:play' }
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
        hit: { textureKey: 'enemy:spark_runner:hit', animationKey: 'enemy:spark_runner:hit:play' },
        death: { textureKey: 'enemy:spark_runner:death', animationKey: 'enemy:spark_runner:death:play' }
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
        hit: { textureKey: 'enemy:basalt_smasher:hit', animationKey: 'enemy:basalt_smasher:hit:play' },
        death: { textureKey: 'enemy:basalt_smasher:death', animationKey: 'enemy:basalt_smasher:death:play' }
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
        hit: { textureKey: 'enemy:ash_wing:hit', animationKey: 'enemy:ash_wing:hit:play' },
        death: { textureKey: 'enemy:ash_wing:death', animationKey: 'enemy:ash_wing:death:play' }
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
        hit: { textureKey: 'enemy:volcano_core_beast:hit', animationKey: 'enemy:volcano_core_beast:hit:play' },
        death: { textureKey: 'enemy:volcano_core_beast:death', animationKey: 'enemy:volcano_core_beast:death:play' }
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
      auraRadius: 18,
      auraColor: 0x6ee7ff,
      auraAlpha: 0.32
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
    textureKey: 'summon:defense_temp_wall:idle',
    animationKey: 'summon:defense_temp_wall:idle:play',
    displayWidth: 72,
    displayHeight: 76,
    origin: { x: 0.5, y: 0.6 },
    alpha: 0.95,
    depth: 56,
    tintColor: 0xa6f6e0
  },
  summon_furnace_golem: {
    textureKey: 'summon:summon_furnace_golem:idle',
    animationKey: 'summon:summon_furnace_golem:idle:play',
    displayWidth: 84,
    displayHeight: 82,
    offsetY: 8,
    origin: { x: 0.5, y: 0.74 },
    depth: 58,
    tintColor: 0xb87dff
  },
  summon_furnace_golem_attack: {
    textureKey: 'summon:summon_furnace_golem:attack',
    animationKey: 'summon:summon_furnace_golem:attack:play',
    displayWidth: 92,
    displayHeight: 78,
    offsetY: 8,
    origin: { x: 0.5, y: 0.74 },
    depth: 59,
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
    textureKey: 'summon:summon_energy_sprite:active',
    animationKey: 'summon:summon_energy_sprite:active:play',
    displayWidth: 76,
    displayHeight: 74,
    offsetY: -8,
    origin: { x: 0.5, y: 0.68 },
    alpha: 0.95,
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
