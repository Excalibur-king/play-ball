import type { Zombie } from '@tower-rogue/game-core'
import Phaser from 'phaser'
import { gardenPalette } from '../theme'

type ZombieView = {
  aura: Phaser.GameObjects.Ellipse
  sprite: Phaser.GameObjects.Sprite
  dangerBadge?: Phaser.GameObjects.Arc
  hpBack: Phaser.GameObjects.Rectangle
  hp: Phaser.GameObjects.Rectangle
  type: Zombie['type']
  category: Zombie['category']
  lockedUntil: number
}

// Adapts game-core zombie state to visual walking/biting poses.
// Movement is still read from simulation state; bobbing and leaning are visual offsets.
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

    view.lockedUntil = this.scene.time.now + 240
    view.sprite.play(`${view.type}-hit`, true)
  }

  private syncZombie(zombie: Zombie, simTime: number) {
    let view = this.views.get(zombie.id)

    if (!view) {
      view = this.createView(zombie)
      this.views.set(zombie.id, view)
    }

    const hpRatio = Phaser.Math.Clamp(zombie.hp / zombie.maxHp, 0, 1)
    const bob = zombie.state === 'walking' ? Math.sin(simTime * 8 + zombie.x * 0.05) * 3 : Math.sin(simTime * 18) * 1.5
    const lean = zombie.state === 'walking' ? Math.sin(simTime * 5 + zombie.row) * 0.04 : -0.09
    const width = zombie.type === 'conehead' ? 116 : 110
    const height = zombie.type === 'conehead' ? 142 : 136
    const targetAnimation = `${zombie.type}-${zombie.state === 'attacking' ? 'bite' : 'walk'}`

    if (this.scene.time.now >= view.lockedUntil && view.sprite.anims.currentAnim?.key !== targetAnimation) {
      view.sprite.play(targetAnimation, true)
    }

    view.aura.setPosition(zombie.x, zombie.y + 54)
    view.aura.setFillStyle(zombie.category === 'dangerous' ? gardenPalette.dangerLine : gardenPalette.shadow)
    view.aura.setAlpha(zombie.state === 'attacking' ? 0.34 : zombie.category === 'dangerous' ? 0.28 : 0.2)
    view.sprite.setPosition(zombie.x, zombie.y + 10 + bob)
    view.sprite.setRotation(lean)
    view.sprite.setDisplaySize(width * (zombie.state === 'attacking' ? 1.05 : 1), height * (zombie.state === 'attacking' ? 0.97 : 1))
    view.sprite.clearTint()
    if (zombie.category === 'dangerous') {
      view.sprite.setTint(0xffd5c4)
    }
    view.dangerBadge?.setPosition(zombie.x + 2, zombie.y - 77 + bob * 0.4)
    view.hpBack.setPosition(zombie.x, zombie.y - 62)
    view.hp.setSize(44 * hpRatio, 5)
    view.hp.setPosition(zombie.x - 22 + 22 * hpRatio, zombie.y - 62)

    view.aura.setDepth(13 + zombie.row)
    view.sprite.setDepth(16 + zombie.row)
    view.dangerBadge?.setDepth(26 + zombie.row)
    view.hpBack.setDepth(24 + zombie.row)
    view.hp.setDepth(25 + zombie.row)
  }

  private createView(zombie: Zombie): ZombieView {
    const dangerBadge =
      zombie.category === 'dangerous'
        ? this.scene.add.circle(zombie.x + 2, zombie.y - 77, 7, gardenPalette.dangerLine, 0.95).setStrokeStyle(2, 0xfff1ba, 0.9)
        : undefined

    return {
      aura: this.scene.add.ellipse(
        zombie.x,
        zombie.y + 54,
        zombie.category === 'dangerous' ? 68 : 54,
        zombie.category === 'dangerous' ? 18 : 15,
        zombie.category === 'dangerous' ? gardenPalette.dangerLine : gardenPalette.shadow,
        zombie.category === 'dangerous' ? 0.28 : 0.2
      ),
      sprite: this.scene.add
        .sprite(zombie.x, zombie.y + 10, 'zombies-premium', `${zombie.type}/walk/0001`)
        .setOrigin(0.5, 0.72)
        .setDisplaySize(zombie.type === 'conehead' ? 116 : 110, zombie.type === 'conehead' ? 142 : 136)
        .play(`${zombie.type}-walk`),
      dangerBadge,
      hpBack: this.scene.add.rectangle(zombie.x, zombie.y - 62, 46, 5, gardenPalette.zombieHealthBack, 0.76),
      hp: this.scene.add.rectangle(zombie.x, zombie.y - 62, 44, 5, gardenPalette.zombieHealth, 1),
      type: zombie.type,
      category: zombie.category,
      lockedUntil: 0
    }
  }
}

function destroyZombieView(view: ZombieView) {
  view.aura.destroy()
  view.sprite.destroy()
  view.dangerBadge?.destroy()
  view.hpBack.destroy()
  view.hp.destroy()
}
