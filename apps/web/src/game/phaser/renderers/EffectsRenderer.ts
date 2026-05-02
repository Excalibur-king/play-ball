import type { GameEvent, Plant, ZombieType } from '@tower-rogue/game-core'
import Phaser from 'phaser'
import type { PlantRenderer } from './PlantRenderer'
import type { ZombieRenderer } from './ZombieRenderer'

type EffectContext = {
  plants: Plant[]
  plantRenderer: PlantRenderer
  zombieRenderer: ZombieRenderer
}

// Centralizes transient effects that are triggered by game-core events.
// This keeps event handling out of the scene and avoids burying tweens in rules code.
export class EffectsRenderer {
  constructor(private readonly scene: Phaser.Scene) {}

  handleEvents(events: GameEvent[], context: EffectContext) {
    for (const event of events) {
      if (event.type === 'projectileFired') {
        context.plantRenderer.playShooterRecoil(context.plants, event.from)
      }

      if (event.type === 'sunChanged' && event.amount > 0) {
        this.spawnFloatingText(event.at ?? { x: 72, y: 82 }, `+${event.amount}`, '#f6b72d')
      }

      if (event.type === 'plantFused') {
        this.spawnFusionBurst(event.at)
        this.spawnFloatingText(event.at, 'fusion!', '#fff08a')
      }

      if (event.type === 'zombieHit') {
        context.zombieRenderer.playHit(event.zombieId)
        this.spawnHitSpark(event.at)
      }

      if (event.type === 'zombieKilled') {
        this.spawnZombieDeath(event.at, event.zombieType)
        this.spawnFloatingText(event.at, 'bonk!', '#fff4a8')
      }

      if (event.type === 'plantDamaged' && event.dangerous) {
        this.spawnFloatingText(event.at, event.blockedDangerous ? 'blocked!' : 'shred!', event.blockedDangerous ? '#b8ff83' : '#ffb1a2')
        this.scene.cameras.main.shake(event.blockedDangerous ? 70 : 110, event.blockedDangerous ? 0.0025 : 0.004)
      }

      if (event.type === 'baseHit') {
        this.scene.cameras.main.shake(140, 0.006)
      }

      if (event.type === 'waveCleared') {
        this.spawnFloatingText({ x: 638, y: 86 }, 'wave clear!', '#fff4a8')
      }
    }
  }

  private spawnHitSpark(at: { x: number; y: number }) {
    const spark = this.scene.add.sprite(at.x, at.y, 'fx-premium', 'pea-hit/burst/0001').setDisplaySize(72, 48).setDepth(70)
    spark.play('pea-hit-burst')
    spark.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => spark.destroy())
  }

  private spawnFusionBurst(at: { x: number; y: number }) {
    const ring = this.scene.add.circle(at.x, at.y, 18, 0xfff08a, 0.16).setStrokeStyle(4, 0xfff08a, 0.92).setDepth(72)
    const core = this.scene.add.circle(at.x, at.y, 10, 0x9fdb74, 0.72).setDepth(73)

    this.scene.tweens.add({
      targets: ring,
      scaleX: 3,
      scaleY: 3,
      alpha: 0,
      duration: 360,
      ease: 'Quad.easeOut',
      onComplete: () => ring.destroy()
    })

    this.scene.tweens.add({
      targets: core,
      scaleX: 2.4,
      scaleY: 2.4,
      alpha: 0,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => core.destroy()
    })
  }

  private spawnZombieDeath(at: { x: number; y: number }, type: ZombieType) {
    const width = type === 'conehead' ? 116 : 110
    const height = type === 'conehead' ? 142 : 136
    const sprite = this.scene.add
      .sprite(at.x, at.y + 10, 'zombies-premium', `${type}/die/0001`)
      .setOrigin(0.5, 0.72)
      .setDisplaySize(width, height)
      .setDepth(50)

    sprite.play(`${type}-die`)
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy())
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
