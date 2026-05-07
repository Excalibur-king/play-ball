import type { Zombie } from '@tower-rogue/game-core'
import Phaser from 'phaser'
import { assetManifest } from '../../assets/assetManifest'
import { gardenPalette } from '../theme'

type ZombieView = {
  container: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Sprite
  hpBack: Phaser.GameObjects.Rectangle
  hp: Phaser.GameObjects.Rectangle
  aiAura?: Phaser.GameObjects.Ellipse
  aiAuraEdge?: Phaser.GameObjects.Ellipse
  badge?: Phaser.GameObjects.Arc
  type: Zombie['type']
  currentAnimationKey?: string
  hitAnimationUntil: number
}

// Renders enemies through manifest-driven sprites so future art swaps can stay
// inside the asset layer instead of branching renderer code by enemy id.
export class ZombieRenderer {
  private readonly views = new Map<string, ZombieView>()

  constructor(private readonly scene: Phaser.Scene) {}

  sync(zombies: Zombie[], simTime: number) {
    const currentIds = new Set(zombies.map((zombie) => zombie.id))

    for (const [id, view] of this.views) {
      if (!currentIds.has(id)) {
        destroyZombieView(view)
        this.views.delete(id)
      }
    }

    for (const zombie of zombies) {
      this.syncZombie(zombie, simTime)
    }
  }

  clear() {
    for (const view of this.views.values()) {
      destroyZombieView(view)
    }
    this.views.clear()
  }

  playHit(zombieId: string) {
    const view = this.views.get(zombieId)

    if (!view) {
      return
    }

    this.scene.tweens.add({
      targets: [view.body, view.badge].filter(Boolean),
      alpha: 0.55,
      duration: 55,
      yoyo: true,
      ease: 'Quad.easeOut'
    })

    const visual = assetManifest.enemies[view.type]
    const hitState = visual.states?.hit
    if (hitState?.animationKey) {
      view.hitAnimationUntil = this.scene.time.now + 260
      this.playBodyState(view, hitState, visual.displayWidth, visual.displayHeight)
    }
  }

  private syncZombie(zombie: Zombie, simTime: number) {
    let view = this.views.get(zombie.id)

    if (view && view.type !== zombie.type) {
      destroyZombieView(view)
      this.views.delete(zombie.id)
      view = undefined
    }

    if (!view) {
      view = this.createView(zombie)
      this.views.set(zombie.id, view)
    }

    const visual = assetManifest.enemies[zombie.type]
    const hpRatio = Phaser.Math.Clamp(zombie.hp / zombie.maxHp, 0, 1)
    const bob = zombie.flying
      ? Math.sin(simTime * 7 + zombie.x * 0.04) * 8
      : zombie.state === 'walking'
        ? Math.sin(simTime * 8) * 3
        : 0
    const y = zombie.y + visual.hoverOffsetY + bob

    view.container.setPosition(zombie.x, y)
    view.container.setDepth((zombie.flying ? 34 : 16) + zombie.row)
    view.aiAura?.setVisible(zombie.spawnSource === 'ai-wave-director')
    view.aiAuraEdge?.setVisible(zombie.spawnSource === 'ai-wave-director')
    view.body.setAngle(
      zombie.flying ? Math.sin(simTime * 6 + zombie.x * 0.03) * 5 : zombie.state === 'walking' ? Math.sin(simTime * 8) * 2.5 : 0
    )

    view.hpBack.setPosition(zombie.x, y - visual.hpOffsetY)
    view.hp.setSize(44 * hpRatio, 5)
    view.hp.setPosition(zombie.x - 22 + 22 * hpRatio, y - visual.hpOffsetY)
    view.hpBack.setDepth(46 + zombie.row)
    view.hp.setDepth(47 + zombie.row)

    if (this.scene.time.now >= view.hitAnimationUntil) {
      const bodyState = zombie.state === 'attacking'
        ? (visual.states?.attack ?? visual.body)
        : (visual.states?.walk ?? visual.body)
      this.playBodyState(view, bodyState, visual.displayWidth, visual.displayHeight)
    }
  }

  private createView(zombie: Zombie) {
    const visual = assetManifest.enemies[zombie.type]
    const container = this.scene.add.container(zombie.x, zombie.y)
    const shadow = this.scene.add.ellipse(0, visual.shadow.offsetY, visual.shadow.width, visual.shadow.height, gardenPalette.shadow, visual.shadow.alpha)
    const body = this.scene.add.sprite(0, visual.bodyOffsetY, visual.body.textureKey, visual.body.frame)
    const aiAura = this.scene.add.ellipse(0, visual.shadow.offsetY + 2, visual.shadow.width + 22, visual.shadow.height + 12, 0xffd64a, 0.32)
    const aiAuraEdge = this.scene.add.ellipse(0, visual.shadow.offsetY + 2, visual.shadow.width + 26, visual.shadow.height + 16, 0xfff1a8, 0)

    body.setOrigin(0.5, 1)
    body.setDisplaySize(visual.displayWidth, visual.displayHeight)
    aiAura.setVisible(zombie.spawnSource === 'ai-wave-director')
    aiAuraEdge.setVisible(zombie.spawnSource === 'ai-wave-director')
    aiAuraEdge.setStrokeStyle(3, 0xfff1a8, 0.78)

    const parts: Phaser.GameObjects.GameObject[] = [aiAura, aiAuraEdge, shadow, body]
    let badge: Phaser.GameObjects.Arc | undefined

    const isDangerousEnemy = zombie.category === 'heavy_attack' || zombie.category === 'boss'
    if (isDangerousEnemy) {
      badge = this.scene.add.circle(
        0,
        visual.bodyOffsetY - visual.displayHeight + 24,
        zombie.category === 'boss' ? 11 : 8,
        gardenPalette.dangerLine,
        0.95
      )
      badge.setStrokeStyle(2, 0xfff1ba, 0.9)
      parts.push(badge)
    }

    container.add(parts)

    const hpBack = this.scene.add.rectangle(zombie.x, zombie.y - visual.hpOffsetY, 46, 5, gardenPalette.zombieHealthBack, 0.76)
    const hp = this.scene.add.rectangle(zombie.x, zombie.y - visual.hpOffsetY, 44, 5, gardenPalette.zombieHealth, 1)

    const view: ZombieView = {
      container,
      body,
      hpBack,
      hp,
      aiAura,
      aiAuraEdge,
      badge,
      type: zombie.type,
      hitAnimationUntil: 0
    }
    this.playBodyState(view, visual.body, visual.displayWidth, visual.displayHeight)

    return view
  }

  private playBodyState(
    view: ZombieView,
    state: { textureKey: string; frame?: string; animationKey?: string },
    displayWidth: number,
    displayHeight: number
  ) {
    if (view.body.texture.key !== state.textureKey) {
      view.body.setTexture(state.textureKey, state.frame)
      view.body.setDisplaySize(displayWidth, displayHeight)
      view.currentAnimationKey = undefined
    }

    if (!state.animationKey) {
      view.body.stop()
      view.currentAnimationKey = undefined
      return
    }

    if (view.currentAnimationKey === state.animationKey && view.body.anims.currentAnim?.key === state.animationKey) {
      return
    }

    view.body.play(state.animationKey)
    view.currentAnimationKey = state.animationKey
  }
}

function destroyZombieView(view: ZombieView) {
  view.container.destroy(true)
  view.hpBack.destroy()
  view.hp.destroy()
}
