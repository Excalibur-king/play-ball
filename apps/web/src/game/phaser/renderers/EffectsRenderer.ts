import type { ActiveCardEffects, GameEvent, Plant, Zombie } from '@tower-rogue/game-core'
import { lawn } from '@tower-rogue/game-content'
import Phaser from 'phaser'
import { assetManifest, type SummonOverlay } from '../../assets/assetManifest'
import type { PlantRenderer } from './PlantRenderer'
import type { ZombieRenderer } from './ZombieRenderer'

const overlaySpec = (key: keyof typeof assetManifest.summonOverlays | string): SummonOverlay =>
  // Overlay specs are owned by us and indexed by known card ids; assert
  // non-null so callers can use the spec without optional chaining.
  assetManifest.summonOverlays[key]!

type EffectContext = {
  plants: Plant[]
  zombies: Zombie[]
  activeCardEffects: ActiveCardEffects
  time: number
  plantRenderer: PlantRenderer
  zombieRenderer: ZombieRenderer
}

const ENERGY_HUD_ANCHOR = { x: 78, y: 86 }
const ENERGY_SPRITE_COUNT = 2
const ENERGY_SPRITE_RADIUS = 38
const ENERGY_SPRITE_RADIANS_PER_SEC = Math.PI * 1.1

// Lawn center pre-computed so every skill cast plays its big intro animation
// at exactly the same map position. Cast intent (left HUD vs. front-line vs.
// drop-from-above) is conveyed by the per-target / persistent FX that fire
// AFTER the intro completes, not by the intro position itself.
const LAWN_CENTER = {
  x: lawn.originX + (lawn.cols * lawn.cellWidth) / 2,
  y: lawn.originY + (lawn.rows * lawn.cellHeight) / 2
}

// Total wall-clock window the centred intro animation occupies, including
// fade-in, hold (animation play), and fade-out. cardEffectImpact events and
// new persistent overlays for the same card are deferred for this long so
// the intro reads as the cause and the post-effects as the consequence.
const CENTER_CAST_DURATION_MS = 720

// EffectsRenderer owns four concerns:
//   1. Reactive event hooks (one-shot bursts triggered by gameplay events).
//   2. The centred intro animation that plays on every skill cast, locking
//      out the matching card's downstream FX until it finishes so the player
//      always reads "intro -> consequence" instead of all firing at once.
//   3. State-driven persistent overlays (frozen zombies, temporary walls,
//      summoned golems, orbiting energy sprites). These live as long as their
//      backing state entity exists and are sync'd every frame from `update()`.
//   4. Card-flavoured impact FX (red chain hits, blue hawk strikes, purple
//      reflect arcs, green heal pulses, yellow energy bursts) drawn with
//      Phaser primitives so they don't depend on extra art assets.
export class EffectsRenderer {
  private readonly wardOverlays = new Map<string, Phaser.GameObjects.Sprite>()
  private readonly golemOverlays = new Map<string, Phaser.GameObjects.Sprite>()
  private readonly freezeOverlays = new Map<string, Phaser.GameObjects.Sprite>()
  private energySpriteOverlays: Phaser.GameObjects.Sprite[] = []
  private energySpriteAngle = 0
  private lastUpdateTime: number | undefined
  // Wall-clock timestamps (ms, scene.time.now) until which a card's
  // downstream visuals must wait for the centred intro to finish playing.
  private skillLockUntil: Partial<Record<string, number>> = {}

  constructor(private readonly scene: Phaser.Scene) {}

  // Returns true while a card's centred intro animation is still playing.
  // Used to defer cardEffectImpact strikes and persistent overlay creation
  // for the SAME cardId; unrelated visuals are unaffected.
  private isCardLocked(cardId: string): boolean {
    const lockUntil = this.skillLockUntil[cardId]
    if (lockUntil === undefined) {
      return false
    }
    if (this.scene.time.now >= lockUntil) {
      delete this.skillLockUntil[cardId]
      return false
    }
    return true
  }

  // Real-time milliseconds left in the lock for a given card, or 0 if none.
  // Caller uses this to schedule a delayedCall that fires the post-intro FX.
  private cardLockRemainingMs(cardId: string): number {
    const lockUntil = this.skillLockUntil[cardId]
    if (lockUntil === undefined) {
      return 0
    }
    return Math.max(0, lockUntil - this.scene.time.now)
  }

  handleEvents(events: GameEvent[], context: EffectContext) {
    for (const event of events) {
      if (event.type === 'projectileFired') {
        const shooter = this.findPlantByShotOrigin(context.plants, event.from)
        context.plantRenderer.playShooterRecoil(context.plants, event.from)
        context.plantRenderer.playAttackAnimation(context.plants, event.from)
        if (shooter?.type === 'ranged_turret') {
          this.spawnMuzzleFlash(event.from)
        }
      }

      if (event.type === 'laserFired') {
        context.plantRenderer.playShooterRecoil(context.plants, event.from)
        this.spawnLaserMuzzleFlash(event.from)
        this.spawnLaserBeam(event.from, event.to)
      }

      if (event.type === 'sunChanged' && event.amount > 0) {
        this.spawnFloatingText(event.at ?? ENERGY_HUD_ANCHOR, `+${event.amount}`, '#f6b72d')
      }

      if (event.type === 'zombieHit') {
        context.zombieRenderer.playHit(event.zombieId)
        this.spawnHitSpark(event.at)
      }

      if (event.type === 'zombieKilled') {
        this.spawnDeathBurst(event.at)
        this.spawnFloatingText(event.at, 'down', '#fff4a8')
      }

      if (event.type === 'plantDamaged' && event.dangerous) {
        this.spawnFloatingText(event.at, event.blockedDangerous ? 'blocked' : 'crack', event.blockedDangerous ? '#b8ff83' : '#ffb1a2')
        this.scene.cameras.main.shake(event.blockedDangerous ? 70 : 110, event.blockedDangerous ? 0.0025 : 0.004)
      }

      if (event.type === 'baseHit') {
        this.scene.cameras.main.shake(140, 0.006)
      }

      if (event.type === 'wavePhaseChanged') {
        this.spawnFloatingText({ x: 638, y: 150 }, event.label, '#ffe99b')
      }

      if (event.type === 'waveCleared') {
        this.spawnFloatingText({ x: 638, y: 86 }, 'wave clear', '#fff4a8')
      }

      if (event.type === 'cardRecommendationsReady') {
        this.spawnFloatingText({ x: 638, y: 118 }, 'choose a card', '#fff08a')
      }

      if (event.type === 'strategyCardSelected') {
        this.spawnFloatingText({ x: 638, y: 118 }, 'card armed', '#b8ff83')
      }

      if (event.type === 'skillSummoned') {
        this.spawnSkillSummon(event.cardId, event.at)
        // Dragon breath's horizontal screen sweep is part of its post-intro
        // signature (the dragon "flies past"), so it must wait for the
        // centred intro animation to finish first.
        if (event.cardId === 'reward_fire_dragon_breath') {
          const dragonAt = event.at
          this.scene.time.delayedCall(this.cardLockRemainingMs('reward_fire_dragon_breath'), () => {
            this.drawDragonBreathSweep(dragonAt)
          })
        }
      }

      if (event.type === 'cardEffectImpact') {
        // Per-target impacts are the "consequence" beat. While the centred
        // intro for the same card is playing, defer the impact so it fires
        // immediately after the intro fade-out completes.
        const remaining = this.cardLockRemainingMs(event.cardId)
        if (remaining > 0) {
          this.scene.time.delayedCall(remaining, () => this.spawnCardImpact(event, context))
        } else {
          this.spawnCardImpact(event, context)
        }
      }
    }
  }

  // Called every frame from BattleScene so persistent overlays follow the
  // game state without each gameplay system having to emit lifecycle events.
  update(context: EffectContext) {
    const now = context.time
    const dt = this.lastUpdateTime === undefined ? 0 : Math.max(0, now - this.lastUpdateTime)
    this.lastUpdateTime = now

    this.syncWardOverlays(context.plants)
    this.syncGolemOverlays(context.plants)
    this.syncFreezeOverlays(context.zombies, now)
    this.syncEnergySpriteOverlays(context.plants, context.activeCardEffects, now, dt)
  }

  // -------------------------- Persistent overlays --------------------------

  private syncWardOverlays(plants: Plant[]) {
    const spec = overlaySpec('defense_temp_wall')
    const live = new Set<string>()
    // While the cast intro is still playing, allow existing overlays (from
    // earlier casts) to persist but defer creating new sprites for newly
    // spawned walls until the intro finishes.
    const locked = this.isCardLocked('defense_temp_wall')

    for (const plant of plants) {
      if (plant.type !== 'lava_wall' || plant.temporaryUntilWave === undefined) {
        continue
      }
      live.add(plant.id)
      if (locked && !this.wardOverlays.has(plant.id)) {
        continue
      }
      this.ensureOverlaySprite(this.wardOverlays, plant.id, spec, plant.x, plant.y)
    }

    this.cullOverlays(this.wardOverlays, live)
  }

  private syncGolemOverlays(plants: Plant[]) {
    const spec = overlaySpec('summon_furnace_golem')
    const live = new Set<string>()
    const locked = this.isCardLocked('summon_furnace_golem')

    for (const plant of plants) {
      if (plant.type !== 'melee_turret' || plant.temporaryUntilTime === undefined) {
        continue
      }
      live.add(plant.id)
      if (locked && !this.golemOverlays.has(plant.id)) {
        continue
      }
      this.ensureOverlaySprite(this.golemOverlays, plant.id, spec, plant.x, plant.y)
    }

    this.cullOverlays(this.golemOverlays, live)
  }

  private syncFreezeOverlays(zombies: Zombie[], time: number) {
    const spec = overlaySpec('emergency_freeze')
    const live = new Set<string>()
    const locked = this.isCardLocked('emergency_freeze')

    for (const zombie of zombies) {
      if (zombie.frozenUntil === undefined || zombie.frozenUntil <= time) {
        continue
      }
      live.add(zombie.id)
      if (locked && !this.freezeOverlays.has(zombie.id)) {
        continue
      }
      // Anchor at the zombie body center so the freeze ring travels with it
      // (zombies don't move while frozen, but the position keeps the overlay
      // crisply aligned to the cell instead of last spawn point).
      this.ensureOverlaySprite(this.freezeOverlays, zombie.id, spec, zombie.x, zombie.y - 4)
    }

    this.cullOverlays(this.freezeOverlays, live)
  }

  private syncEnergySpriteOverlays(
    plants: Plant[],
    activeCardEffects: ActiveCardEffects,
    time: number,
    dt: number
  ) {
    const endsAt = activeCardEffects.energySpriteEndsAt
    const core = plants.find((plant) => plant.type === 'energy_core')

    if (endsAt === undefined || endsAt <= time || !core) {
      this.disposeEnergySpriteOverlays()
      return
    }

    // Hold the orbiting fairies off-stage while the centred intro is still
    // playing; they fly in once the intro hands the floor over.
    if (this.isCardLocked('summon_energy_sprite') && this.energySpriteOverlays.length === 0) {
      return
    }

    const spec = overlaySpec('summon_energy_sprite')

    if (this.energySpriteOverlays.length === 0) {
      for (let index = 0; index < ENERGY_SPRITE_COUNT; index += 1) {
        const sprite = this.scene.add
          .sprite(core.x, core.y, spec.textureKey)
          .setOrigin(spec.origin?.x ?? 0.5, spec.origin?.y ?? 0.5)
          .setDisplaySize(spec.displayWidth, spec.displayHeight)
          .setDepth(spec.depth)
          .setAlpha(0)
        if (spec.animationKey && this.scene.anims.exists(spec.animationKey)) {
          sprite.play(spec.animationKey)
          sprite.setDisplaySize(spec.displayWidth, spec.displayHeight)
        }
        this.scene.tweens.add({ targets: sprite, alpha: 0.95, duration: 220 })
        this.energySpriteOverlays.push(sprite)
      }
    }

    this.energySpriteAngle += ENERGY_SPRITE_RADIANS_PER_SEC * dt
    for (let index = 0; index < this.energySpriteOverlays.length; index += 1) {
      const sprite = this.energySpriteOverlays[index]!
      const phase = this.energySpriteAngle + (index * Math.PI * 2) / ENERGY_SPRITE_COUNT
      sprite.x = core.x + Math.cos(phase) * ENERGY_SPRITE_RADIUS
      sprite.y = core.y - 18 + Math.sin(phase) * (ENERGY_SPRITE_RADIUS * 0.45)
      sprite.setDepth(spec.depth + (Math.sin(phase) > 0 ? 0 : -2))
    }
  }

  private disposeEnergySpriteOverlays() {
    if (this.energySpriteOverlays.length === 0) {
      return
    }
    for (const sprite of this.energySpriteOverlays) {
      sprite.destroy()
    }
    this.energySpriteOverlays = []
    this.energySpriteAngle = 0
  }

  private ensureOverlaySprite(
    bucket: Map<string, Phaser.GameObjects.Sprite>,
    key: string,
    spec: SummonOverlay,
    x: number,
    y: number
  ) {
    let sprite = bucket.get(key)
    const targetX = x
    const targetY = y + (spec.offsetY ?? 0)

    if (!sprite) {
      sprite = this.scene.add
        .sprite(targetX, targetY, spec.textureKey, spec.frame ?? 0)
        .setOrigin(spec.origin?.x ?? 0.5, spec.origin?.y ?? 0.5)
        .setDisplaySize(spec.displayWidth, spec.displayHeight)
        .setDepth(spec.depth)
        .setAlpha(0)

      if (spec.animationKey && this.scene.anims.exists(spec.animationKey)) {
        sprite.play(spec.animationKey)
        sprite.setDisplaySize(spec.displayWidth, spec.displayHeight)
      }

      this.scene.tweens.add({
        targets: sprite,
        alpha: spec.alpha ?? 1,
        duration: 220,
        ease: 'Quad.easeOut'
      })

      bucket.set(key, sprite)
    } else {
      sprite.setPosition(targetX, targetY)
    }
  }

  private cullOverlays(bucket: Map<string, Phaser.GameObjects.Sprite>, live: Set<string>) {
    for (const [key, sprite] of bucket) {
      if (live.has(key)) {
        continue
      }
      this.scene.tweens.add({
        targets: sprite,
        alpha: 0,
        scale: sprite.scale * 0.75,
        duration: 220,
        ease: 'Quad.easeIn',
        onComplete: () => sprite.destroy()
      })
      bucket.delete(key)
    }
  }

  // ------------------------- Card impact (per target) ----------------------

  private spawnCardImpact(
    event: Extract<GameEvent, { type: 'cardEffectImpact' }>,
    context: EffectContext
  ) {
    switch (event.cardId) {
      case 'attack_molten_chain':
        this.drawCardStrike(event.at, 0xff5536, { spokes: 5, length: 30 })
        return
      case 'spell_lava_rain':
        this.drawCardStrike(event.at, 0xffd76a, { spokes: 6, length: 36, ringColor: 0xfff1a8 })
        return
      case 'premium_starfall_contract':
        // Sky meteor streak first (~220ms), then strike + crystal shards
        // when it lands. The visual delay is purely cosmetic — gameplay
        // damage already resolved on emit.
        this.drawMeteorStreak(event.at, 0xffe06a, () => {
          this.drawCardStrike(event.at, 0xffe06a, { spokes: 7, length: 42, ringColor: 0xffffff })
          this.drawCrystalShards(event.at, 0xfff7c2)
        })
        return
      case 'summon_flame_hawks':
        this.drawHawkBladeStrike(event.at, 0x55c8ff)
        return
      case 'pivot_wall_feedback':
        this.drawReflectionArc(event.at, 0xc87aff, context.plants)
        return
      case 'emergency_repair_all':
        this.drawHealPulseOnTarget(event.targetId, context.plants, 0xa6f6c8)
        return
      case 'energy_instant_power':
        this.drawHudEnergyBurst(event.at, 0xffd66a)
        return
      case 'reward_fire_dragon_breath':
        // The big horizontal sweep is fired once on skillSummoned. Per
        // enemy we add an orange strike + a vertical fire pillar so each
        // hit reads as the dragon's breath licking that target.
        this.drawCardStrike(event.at, 0xff7a3b, { spokes: 5, length: 28 })
        this.drawFirePillar(event.at, 0xff7a3b)
        return
      default:
        return
    }
  }

  // -------------------------- Premium card flourishes ---------------------

  // Horizontal flame sweep across the lawn for the dragon breath card. The
  // visual reads as a dragon flying left → right just above the lane band,
  // leaving a fading orange trail. Each per-enemy strike (drawCardStrike +
  // drawFirePillar) lands separately as cardEffectImpact events arrive.
  private drawDragonBreathSweep(at: { x: number; y: number }) {
    // Lawn extends roughly x=176..1136, y=132..612 in local scene coords.
    // Sweep covers the full band so the dragon visibly crosses the field.
    const startX = 100
    const endX = 1180
    const sweepY = at.y + 110
    const sweepDuration = 720
    const trailSpacing = 70

    const distance = endX - startX
    const trailCount = Math.ceil(distance / trailSpacing)
    const headColor = 0xfff2a8
    const bodyColor = 0xff8a3b

    // Trail puffs spawn sequentially so the eye reads it as motion.
    for (let index = 0; index < trailCount; index += 1) {
      const progress = index / trailCount
      const x = startX + progress * distance
      const delay = progress * sweepDuration * 0.85
      this.scene.time.delayedCall(delay, () => {
        const puff = this.scene.add
          .ellipse(x, sweepY, 56, 22, bodyColor, 0.78)
          .setDepth(82)
          .setScale(0.5)
        const ember = this.scene.add.circle(x, sweepY - 4, 6, headColor, 0.95).setDepth(83)
        this.scene.tweens.add({
          targets: puff,
          scaleX: 1.4,
          scaleY: 1.1,
          alpha: 0,
          y: sweepY - 14,
          duration: 360,
          ease: 'Quad.easeOut',
          onComplete: () => puff.destroy()
        })
        this.scene.tweens.add({
          targets: ember,
          alpha: 0,
          scale: 1.6,
          y: sweepY - 22,
          duration: 320,
          onComplete: () => ember.destroy()
        })
      })
    }

    // Bright dragon head leading the sweep.
    const head = this.scene.add.circle(startX, sweepY, 22, headColor, 0.9).setDepth(85)
    this.scene.tweens.add({
      targets: head,
      x: endX,
      duration: sweepDuration,
      ease: 'Sine.easeIn',
      onComplete: () => {
        this.scene.tweens.add({
          targets: head,
          alpha: 0,
          scale: 1.6,
          duration: 200,
          onComplete: () => head.destroy()
        })
      }
    })

    this.scene.cameras.main.shake(220, 0.0035)
  }

  // Vertical flame pillar at a single enemy. Three stacked ellipses tween
  // upward / fade so each dragon-breath impact gets a small "burning" beat
  // on top of the radial drawCardStrike.
  private drawFirePillar(at: { x: number; y: number }, color: number) {
    for (let layer = 0; layer < 3; layer += 1) {
      const offsetY = -8 - layer * 14
      const flame = this.scene.add
        .ellipse(at.x, at.y + offsetY, 22 - layer * 4, 28 - layer * 6, color, 0.82 - layer * 0.18)
        .setDepth(80 + layer)
      this.scene.tweens.add({
        targets: flame,
        y: at.y + offsetY - 18,
        scaleX: 0.4,
        scaleY: 1.6,
        alpha: 0,
        duration: 360 + layer * 60,
        ease: 'Quad.easeOut',
        onComplete: () => flame.destroy()
      })
    }
  }

  // Sky-to-ground meteor trail for the starfall contract. A bright streak
  // falls from above the screen down to the impact point in ~220ms, then
  // the caller's callback runs the strike + crystal shard burst so the
  // sequence reads as "meteor lands → splash".
  private drawMeteorStreak(
    at: { x: number; y: number },
    color: number,
    onComplete: () => void
  ) {
    const fallHeight = 220
    const startX = at.x + 26
    const startY = at.y - fallHeight
    const length = Math.hypot(startX - at.x, startY - at.y)
    const angle = Math.atan2(at.y - startY, at.x - startX)

    const streak = this.scene.add
      .rectangle(
        startX + (at.x - startX) / 2,
        startY + (at.y - startY) / 2,
        length,
        4,
        color,
        0.92
      )
      .setDepth(86)
      .setRotation(angle)
      .setAlpha(0)
    const head = this.scene.add.circle(startX, startY, 7, 0xffffff, 1).setDepth(87)

    this.scene.tweens.add({
      targets: streak,
      alpha: { from: 0, to: 0.95 },
      duration: 90,
      yoyo: true,
      hold: 80,
      onComplete: () => streak.destroy()
    })
    this.scene.tweens.add({
      targets: head,
      x: at.x,
      y: at.y,
      duration: 220,
      ease: 'Sine.easeIn',
      onComplete: () => {
        head.destroy()
        onComplete()
      }
    })
  }

  // Crystal shards radiating outward after a starfall impact. Triangular
  // polygons rotated outward give the "shattered geode" feel called for in
  // the card's source art.
  private drawCrystalShards(at: { x: number; y: number }, color: number) {
    const shardCount = 6
    for (let index = 0; index < shardCount; index += 1) {
      const angle = (index / shardCount) * Math.PI * 2 + Math.random() * 0.3
      const dx = Math.cos(angle)
      const dy = Math.sin(angle)
      const shard = this.scene.add
        .triangle(at.x, at.y, 0, -8, 4, 6, -4, 6, color, 0.95)
        .setDepth(84)
        .setRotation(angle + Math.PI / 2)
      this.scene.tweens.add({
        targets: shard,
        x: at.x + dx * 34,
        y: at.y + dy * 28,
        alpha: 0,
        scale: 0.4,
        duration: 420,
        ease: 'Quad.easeOut',
        onComplete: () => shard.destroy()
      })
    }
  }

  // Generic radial spell impact: a center flash + N short colored spokes.
  // Used for the chain (red), lava rain (gold), starfall (warm gold) and
  // dragon breath (orange) card effects. `ringColor` is the bright ring
  // overlay; defaults to a brightened version of the spoke color.
  private drawCardStrike(
    at: { x: number; y: number },
    color: number,
    options: { spokes: number; length: number; ringColor?: number }
  ) {
    const ringColor = options.ringColor ?? color
    const ring = this.scene.add.circle(at.x, at.y, 8, ringColor, 0.85).setDepth(72)
    const flash = this.scene.add.circle(at.x, at.y, 14, color, 0.45).setDepth(71)

    this.scene.tweens.add({
      targets: ring,
      radius: 26,
      alpha: 0,
      duration: 220,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy()
    })
    this.scene.tweens.add({
      targets: flash,
      radius: 32,
      alpha: 0,
      duration: 280,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy()
    })

    for (let index = 0; index < options.spokes; index += 1) {
      const angle = (index / options.spokes) * Math.PI * 2 + Math.random() * 0.4
      const length = options.length * (0.7 + Math.random() * 0.5)
      const dx = Math.cos(angle) * length
      const dy = Math.sin(angle) * length
      const line = this.scene.add
        .rectangle(at.x, at.y, length, 3, color, 0.95)
        .setOrigin(0, 0.5)
        .setDepth(73)
        .setRotation(angle)
        .setAlpha(0.95)
      this.scene.tweens.add({
        targets: line,
        scaleX: 0.2,
        alpha: 0,
        x: at.x + dx * 0.6,
        y: at.y + dy * 0.6,
        duration: 240,
        ease: 'Quad.easeOut',
        onComplete: () => line.destroy()
      })
    }
  }

  // Twin diagonal blue blade slashes for the wind hawks. Reads as a fast
  // air-cut rather than a generic burst.
  private drawHawkBladeStrike(at: { x: number; y: number }, color: number) {
    const halo = this.scene.add.circle(at.x, at.y, 10, 0xffffff, 0.6).setDepth(71)
    this.scene.tweens.add({
      targets: halo,
      radius: 26,
      alpha: 0,
      duration: 220,
      onComplete: () => halo.destroy()
    })

    for (const sign of [1, -1]) {
      const angle = (Math.PI / 4) * sign
      const blade = this.scene.add
        .rectangle(at.x - Math.cos(angle) * 18, at.y - Math.sin(angle) * 18, 60, 4, color, 0.95)
        .setOrigin(0, 0.5)
        .setDepth(74)
        .setRotation(angle)
      this.scene.tweens.add({
        targets: blade,
        scaleX: 1.4,
        alpha: 0,
        x: at.x + Math.cos(angle) * 36,
        y: at.y + Math.sin(angle) * 36,
        duration: 220,
        ease: 'Quad.easeOut',
        onComplete: () => blade.destroy()
      })
    }
  }

  // Purple reflection: pulsing ring on the attacker plus a quick lightning
  // line back toward the closest lava_wall so the player reads the cause.
  private drawReflectionArc(at: { x: number; y: number }, color: number, plants: Plant[]) {
    const wall = plants
      .filter((plant) => plant.type === 'lava_wall')
      .map((plant) => ({ plant, distSq: (plant.x - at.x) ** 2 + (plant.y - at.y) ** 2 }))
      .sort((a, b) => a.distSq - b.distSq)[0]?.plant

    const ring = this.scene.add.circle(at.x, at.y, 6, color, 0.85).setDepth(74)
    this.scene.tweens.add({
      targets: ring,
      radius: 30,
      alpha: 0,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy()
    })

    const flash = this.scene.add.circle(at.x, at.y, 18, 0xffffff, 0.55).setDepth(73)
    this.scene.tweens.add({
      targets: flash,
      radius: 4,
      alpha: 0,
      duration: 220,
      onComplete: () => flash.destroy()
    })

    if (wall) {
      const dx = at.x - wall.x
      const dy = at.y - wall.y
      const length = Math.hypot(dx, dy)
      const midX = (wall.x + at.x) / 2
      const midY = (wall.y + at.y) / 2
      const arc = this.scene.add
        .rectangle(midX, midY, length, 4, color, 0.85)
        .setDepth(75)
        .setRotation(Math.atan2(dy, dx))
      this.scene.tweens.add({
        targets: arc,
        alpha: 0,
        scaleY: 0.2,
        duration: 240,
        ease: 'Quad.easeOut',
        onComplete: () => arc.destroy()
      })
    }
  }

  // Soft green pulse + brief heart sparkle on the healed building. Keeps the
  // animation small enough to fan out across all plants without flooding.
  private drawHealPulseOnTarget(targetId: string | undefined, plants: Plant[], color: number) {
    const target = plants.find((plant) => plant.id === targetId)
    if (!target) {
      return
    }

    const ring = this.scene.add.circle(target.x, target.y, 12, color, 0.55).setDepth(60)
    this.scene.tweens.add({
      targets: ring,
      radius: 38,
      alpha: 0,
      duration: 380,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy()
    })

    const sparkle = this.scene.add.circle(target.x, target.y - 14, 5, 0xffffff, 0.95).setDepth(62)
    this.scene.tweens.add({
      targets: sparkle,
      y: target.y - 36,
      alpha: 0,
      duration: 420,
      ease: 'Quad.easeOut',
      onComplete: () => sparkle.destroy()
    })
  }

  // Yellow burst on the HUD energy widget: an expanding ring + bouncing label
  // so the player knows the energy_instant_power skill landed and which
  // counter just changed.
  private drawHudEnergyBurst(at: { x: number; y: number }, color: number) {
    const ring = this.scene.add.circle(at.x, at.y, 10, color, 0.7).setDepth(95)
    this.scene.tweens.add({
      targets: ring,
      radius: 38,
      alpha: 0,
      duration: 420,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy()
    })

    const flash = this.scene.add.circle(at.x, at.y, 18, 0xffffff, 0.7).setDepth(94)
    this.scene.tweens.add({
      targets: flash,
      radius: 4,
      alpha: 0,
      duration: 240,
      onComplete: () => flash.destroy()
    })

    for (let index = 0; index < 6; index += 1) {
      const angle = (index / 6) * Math.PI * 2 + Math.random() * 0.4
      const dx = Math.cos(angle) * 28
      const dy = Math.sin(angle) * 22
      const spark = this.scene.add.circle(at.x, at.y, 3, color, 1).setDepth(96)
      this.scene.tweens.add({
        targets: spark,
        x: at.x + dx,
        y: at.y + dy,
        alpha: 0,
        scale: 0.4,
        duration: 360,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy()
      })
    }
  }

  // ----------------------- Reactive one-shot bursts ------------------------

  // Centred intro animation: every skill cast plays its full 4-frame sprite
  // sheet at the lawn centre, occupying the foreground for
  // CENTER_CAST_DURATION_MS. While this plays, the matching card's
  // downstream visuals (per-target impacts and new persistent overlays)
  // are deferred via skillLockUntil so the player reads the intro as the
  // cause and the post-effects as the consequence.
  //
  // `at` is intentionally ignored for positioning the centred sprite; it
  // remains in the signature because some downstream FX (dragon sweep,
  // HUD energy burst) still want the engine-supplied anchor.
  private spawnSkillSummon(cardId: string, _at: { x: number; y: number }) {
    void _at
    const summon = assetManifest.summons[cardId as keyof typeof assetManifest.summons]
    const tint = summon?.tintColor ?? 0xfff08a
    const label = summon?.label ?? '技能'

    // Engage the post-intro lock immediately so any cardEffectImpact /
    // overlay creation that arrives in the same frame gets queued.
    this.skillLockUntil[cardId] = this.scene.time.now + CENTER_CAST_DURATION_MS

    const cx = LAWN_CENTER.x
    const cy = LAWN_CENTER.y

    const enterMs = 200
    const exitMs = 220
    const holdMs = Math.max(120, CENTER_CAST_DURATION_MS - enterMs - exitMs)

    if (summon) {
      const sprite = this.scene.add
        .sprite(cx, cy + 18, summon.textureKey)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(summon.displayWidth, summon.displayHeight)
        .setDepth(95)
        .setAlpha(0)
        .setScale(0.85)

      if (summon.animationKey && this.scene.anims.exists(summon.animationKey)) {
        sprite.play(summon.animationKey)
        // setDisplaySize after play() because animations reset internal scale.
        sprite.setDisplaySize(summon.displayWidth, summon.displayHeight)
      }

      const halo = this.scene.add
        .ellipse(cx, cy + summon.displayHeight * 0.45, summon.displayWidth * 1.25, 22, tint, 0.42)
        .setDepth(94)
        .setAlpha(0)

      this.scene.tweens.add({
        targets: sprite,
        alpha: 1,
        y: cy,
        scale: 1,
        duration: enterMs,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.scene.time.delayedCall(holdMs, () => {
            this.scene.tweens.add({
              targets: sprite,
              alpha: 0,
              scale: 1.12,
              duration: exitMs,
              ease: 'Quad.easeIn',
              onComplete: () => sprite.destroy()
            })
          })
        }
      })

      this.scene.tweens.add({
        targets: halo,
        alpha: 0.55,
        scaleX: 1.3,
        scaleY: 1.1,
        duration: enterMs,
        ease: 'Quad.easeOut',
        onComplete: () => {
          this.scene.time.delayedCall(holdMs, () => {
            this.scene.tweens.add({
              targets: halo,
              alpha: 0,
              scaleX: 1.6,
              duration: exitMs,
              onComplete: () => halo.destroy()
            })
          })
        }
      })
    } else {
      // Defensive fallback: cards without a summons entry still get a beat.
      const burst = this.scene.add.circle(cx, cy, 26, tint, 0.7).setDepth(95)
      this.scene.tweens.add({
        targets: burst,
        radius: 64,
        alpha: 0,
        duration: CENTER_CAST_DURATION_MS,
        onComplete: () => burst.destroy()
      })
    }

    // Card name label rises above the centred animation.
    const labelY = cy - (summon?.displayHeight ?? 80) * 0.5 - 18
    this.spawnFloatingText({ x: cx, y: labelY }, label, '#fff1a8')
  }

  private findPlantByShotOrigin(plants: Plant[], from: { x: number; y: number }) {
    return plants.find(
      (plant) => Math.abs(plant.x + 30 - from.x) < 10 && Math.abs(plant.y - 7 - from.y) < 34
    )
  }

  private spawnMuzzleFlash(at: { x: number; y: number }) {
    const flash = this.scene.add
      .sprite(at.x - 72, at.y, 'fx:ranged_turret:muzzle_flash')
      .setOrigin(0, 0.5)
      .setDepth(69)
      .setScale(0.42)
      .setAlpha(0)
      .setBlendMode(Phaser.BlendModes.ADD)

    const halo = this.scene.add
      .circle(at.x, at.y, 14, 0xdffcff, 0.34)
      .setDepth(68)
      .setAlpha(0)
      .setScale(0.55)

    this.scene.tweens.add({
      targets: [flash, halo],
      alpha: { from: 0, to: 1 },
      scaleX: { from: 0.42, to: 0.82 },
      scaleY: { from: 0.42, to: 0.82 },
      duration: 120,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flash.destroy()
        halo.destroy()
      }
    })
  }

  private spawnLaserMuzzleFlash(at: { x: number; y: number }) {
    const flash = this.scene.add
      .sprite(at.x - 74, at.y, 'fx:ranged_turret:muzzle_flash')
      .setOrigin(0, 0.5)
      .setDepth(70)
      .setScale(0.48)
      .setAlpha(0)
      .setTint(0x8ff6ff)
      .setBlendMode(Phaser.BlendModes.ADD)

    const halo = this.scene.add
      .circle(at.x, at.y, 18, 0x8ff6ff, 0.3)
      .setDepth(69)
      .setAlpha(0)
      .setScale(0.45)

    this.scene.tweens.add({
      targets: [flash, halo],
      alpha: { from: 0, to: 1 },
      scaleX: { from: 0.48, to: 0.95 },
      scaleY: { from: 0.48, to: 0.95 },
      duration: 110,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flash.destroy()
        halo.destroy()
      }
    })
  }

  private spawnHitSpark(at: { x: number; y: number }) {
    this.spawnManifestEffect(at, assetManifest.effects.projectileHit)
  }

  private spawnDeathBurst(at: { x: number; y: number }) {
    this.spawnManifestEffect(at, assetManifest.effects.zombieKill)
  }

  private spawnLaserBeam(from: { x: number; y: number }, to: { x: number; y: number }) {
    const dx = to.x - from.x
    const dy = to.y - from.y
    const length = Math.hypot(dx, dy)
    const angle = Math.atan2(dy, dx)
    const midX = from.x + dx / 2
    const midY = from.y + dy / 2

    const beam = this.scene.add.rectangle(midX, midY, length, 18, 0xb7fbff, 0.92).setDepth(67).setRotation(angle)
    const core = this.scene.add.rectangle(midX, midY, length, 7, 0xffffff, 1).setDepth(68).setRotation(angle)
    const flare = this.scene.add.circle(from.x, from.y, 28, 0xff8df3, 0.45).setDepth(69)

    this.scene.cameras.main.shake(80, 0.003)
    this.scene.tweens.add({
      targets: [beam, core, flare],
      alpha: 0,
      scaleY: 2.4,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => {
        beam.destroy()
        core.destroy()
        flare.destroy()
      }
    })
  }

  private spawnManifestEffect(at: { x: number; y: number }, effect: (typeof assetManifest.effects)[keyof typeof assetManifest.effects]) {
    const sprite = this.scene.add
      .sprite(at.x, at.y + effect.offsetY, effect.body.textureKey, effect.body.frame)
      .setDisplaySize(effect.displayWidth, effect.displayHeight)
      .setDepth(effect.depth)

    if (effect.scale) {
      sprite.setScale(effect.scale)
    }

    if (effect.body.animationKey) {
      sprite.play(effect.body.animationKey)
      sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy())
      return
    }

    this.scene.tweens.add({
      targets: sprite,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => sprite.destroy()
    })
  }

  private spawnFloatingText(at: { x: number; y: number }, label: string, color: string) {
    const text = this.scene.add.text(at.x, at.y - 8, label, {
      fontFamily: 'Arial',
      fontSize: '16px',
      color,
      fontStyle: '700'
    })
    text.setOrigin(0.5)
    text.setShadow(2, 2, '#5f3b1f', 0)

    this.scene.tweens.add({
      targets: text,
      y: at.y - 44,
      alpha: 0,
      duration: 680,
      ease: 'Quad.easeOut',
      onComplete: () => text.destroy()
    })
  }
}
