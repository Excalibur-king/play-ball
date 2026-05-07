import type { Plant } from '@tower-rogue/game-core'
import Phaser from 'phaser'
import { assetManifest } from '../../assets/assetManifest'
import { gardenPalette } from '../theme'

type PlantView = {
  container: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Sprite
  hpBack: Phaser.GameObjects.Rectangle
  hp: Phaser.GameObjects.Rectangle
  type: Plant['type']
  upgraded: boolean
  attackSprite?: Phaser.GameObjects.Sprite
  upgradeRing?: Phaser.GameObjects.Arc
  deathAnimationStarted: boolean
}

// Mirrors game-core buildings into disposable Phaser view objects.
// The simulation owns positions and health; this class only adapts manifest
// visuals into containers, sprites, and lightweight feedback effects.
export class PlantRenderer {
  private readonly views = new Map<string, PlantView>()

  constructor(private readonly scene: Phaser.Scene) {}

  sync(plants: Plant[]) {
    const currentIds = new Set(plants.filter((plant) => shouldRenderPlantBase(plant)).map((plant) => plant.id))

    for (const [id, view] of this.views) {
      if (!currentIds.has(id) && !view.deathAnimationStarted) {
        destroyPlantView(view)
        this.views.delete(id)
      }
    }

    for (const plant of plants) {
      if (!shouldRenderPlantBase(plant)) {
        continue
      }
      this.syncPlant(plant)
    }
  }

  playShooterRecoil(plants: Plant[], from: { x: number; y: number }) {
    const plant = plants.find(
      (item) => shouldRenderPlantBase(item) && Math.abs(item.x + 30 - from.x) < 10 && Math.abs(item.y - 7 - from.y) < 34
    )
    const view = plant ? this.views.get(plant.id) : undefined

    if (!plant || !view) {
      return
    }

    const recoil = assetManifest.buildings[plant.type].recoil
    if (!recoil) {
      return
    }

    const baseX = view.body.x
    const baseScaleX = view.body.scaleX

    this.scene.tweens.add({
      targets: view.body,
      x: baseX - recoil.distance,
      scaleX: baseScaleX * recoil.scaleX,
      duration: recoil.duration,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        view.body.setX(baseX)
        view.body.setScale(baseScaleX, view.body.scaleY)
      }
    })
  }

  playAttackAnimation(plants: Plant[], from: { x: number; y: number }) {
    const plant = plants.find(
      (item) => shouldRenderPlantBase(item) && Math.abs(item.x + 30 - from.x) < 10 && Math.abs(item.y - 7 - from.y) < 34
    )
    return this.playAttackAnimationForPlant(plant)
  }

  playAttackAnimationById(plants: Plant[], plantId: string) {
    const plant = plants.find((item) => item.id === plantId && shouldRenderPlantBase(item))
    return this.playAttackAnimationForPlant(plant)
  }

  private playAttackAnimationForPlant(plant: Plant | undefined) {
    const view = plant ? this.views.get(plant.id) : undefined

    if (!plant || !view || view.deathAnimationStarted) {
      return 0
    }

    const attackAnimation = assetManifest.buildings[plant.type].attackAnimation
    if (!attackAnimation) {
      return 0
    }

    if (view.attackSprite) {
      view.attackSprite.destroy()
      view.attackSprite = undefined
    }

    view.body.setVisible(false)
    const attackSprite = this.scene.add.sprite(
      0,
      attackAnimation.bodyOffsetY,
      attackAnimation.body.textureKey,
      attackAnimation.body.frame
    )
    attackSprite.setOrigin(0.5, 1)
    const lockAttackSpriteSize = () => {
      attackSprite.setDisplaySize(attackAnimation.displayWidth, attackAnimation.displayHeight)
    }

    lockAttackSpriteSize()
    attackSprite.on(Phaser.Animations.Events.ANIMATION_UPDATE, lockAttackSpriteSize)
    view.container.add(attackSprite)
    view.attackSprite = attackSprite

    if (attackAnimation.body.animationKey) {
      attackSprite.play(attackAnimation.body.animationKey)
      const animation = this.scene.anims.get(attackAnimation.body.animationKey)
      const animationDurationMs = animation ? (animation.frames.length / animation.frameRate) * 1000 : 300
      attackSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (view.attackSprite === attackSprite) {
          attackSprite.destroy()
          view.attackSprite = undefined
          view.body.setVisible(true)
        }
      })
      return animationDurationMs
    }

    view.body.setVisible(true)
    return 0
  }

  playDeath(plantId: string, plantType: Plant['type'], at: { x: number; y: number }) {
    const view = this.views.get(plantId)

    if (view?.deathAnimationStarted) {
      return
    }

    if (!view) {
      this.spawnDetachedDeathAnimation(plantType, at)
      return
    }

    const visual = assetManifest.buildings[view.type]
    const deathAnimation = visual.deathAnimation

    view.deathAnimationStarted = true
    view.attackSprite?.destroy()
    view.attackSprite = undefined
    view.upgradeRing?.setVisible(false)
    view.hpBack.setVisible(false)
    view.hp.setVisible(false)

    if (deathAnimation?.body.animationKey) {
      view.body.setVisible(true)
      view.body.setTexture(deathAnimation.body.textureKey, deathAnimation.body.frame)
      view.body.setDisplaySize(deathAnimation.displayWidth, deathAnimation.displayHeight)
      view.body.setY(deathAnimation.bodyOffsetY)
      view.body.play(deathAnimation.body.animationKey)
      view.body.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.destroyView(plantId, view))
      return
    }

    this.fadeOutView(plantId, view)
  }

  clear() {
    for (const view of this.views.values()) {
      destroyPlantView(view)
    }
    this.views.clear()
  }

  private syncPlant(plant: Plant) {
    let view = this.views.get(plant.id)

    if (view && view.type !== plant.type) {
      destroyPlantView(view)
      this.views.delete(plant.id)
      view = undefined
    }

    if (view?.deathAnimationStarted) {
      return
    }

    if (!view) {
      view = this.createPlantView(plant)
      this.views.set(plant.id, view)
    }

    const visual = assetManifest.buildings[plant.type]
    const hpRatio = Phaser.Math.Clamp(plant.hp / plant.maxHp, 0, 1)

    view.container.setPosition(plant.x, plant.y)
    view.container.setDepth(10 + plant.row)
    view.hpBack.setPosition(plant.x, plant.y - visual.hpOffsetY)
    view.hp.setSize(44 * hpRatio, 5)
    view.hp.setPosition(plant.x - 22 + 22 * hpRatio, plant.y - visual.hpOffsetY)
    view.hpBack.setDepth(20 + plant.row)
    view.hp.setDepth(21 + plant.row)

    if (view.upgraded !== plant.upgraded) {
      this.syncUpgradeRing(view, plant)
    }
  }

  private createPlantView(plant: Plant) {
    const visual = assetManifest.buildings[plant.type]
    const container = this.scene.add.container(plant.x, plant.y)
    const shadow = this.scene.add.ellipse(0, visual.shadow.offsetY, visual.shadow.width, visual.shadow.height, gardenPalette.shadow, visual.shadow.alpha)
    const body = this.scene.add.sprite(0, visual.bodyOffsetY, visual.body.textureKey, visual.body.frame)

    body.setOrigin(0.5, 1)
    body.setDisplaySize(visual.displayWidth, visual.displayHeight)
    container.add([shadow, body])

    if (visual.body.animationKey) {
      body.play(visual.body.animationKey)
    }

    this.scene.tweens.add({
      targets: body,
      y: visual.bodyOffsetY - visual.idleBob.distance,
      duration: visual.idleBob.duration,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })

    const hpBack = this.scene.add.rectangle(plant.x, plant.y - visual.hpOffsetY, 46, 5, gardenPalette.healthBack, 0.72)
    const hp = this.scene.add.rectangle(plant.x, plant.y - visual.hpOffsetY, 44, 5, gardenPalette.plantHealth, 1)

    const view: PlantView = {
      container,
      body,
      hpBack,
      hp,
      type: plant.type,
      upgraded: false,
      deathAnimationStarted: false
    }

    this.syncUpgradeRing(view, plant)
    return view
  }

  private syncUpgradeRing(view: PlantView, plant: Plant) {
    if (view.upgradeRing) {
      view.container.remove(view.upgradeRing, true)
      view.upgradeRing = undefined
    }

    if (!plant.upgraded) {
      view.upgraded = false
      return
    }

    const visual = assetManifest.buildings[plant.type]
    const ring = this.scene.add.circle(0, visual.upgradeRing.offsetY, visual.upgradeRing.radius, 0xffffff, 0)
    ring.setStrokeStyle(3, 0xffef9a, 0.78)
    view.container.add(ring)
    view.upgradeRing = ring
    view.upgraded = true

    this.scene.tweens.add({
      targets: ring,
      alpha: 0.45,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 760,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }

  private spawnDetachedDeathAnimation(plantType: Plant['type'], at: { x: number; y: number }) {
    const visual = assetManifest.buildings[plantType]
    const deathAnimation = visual.deathAnimation

    if (!deathAnimation?.body.animationKey) {
      return
    }

    const sprite = this.scene.add
      .sprite(at.x, at.y + deathAnimation.bodyOffsetY, deathAnimation.body.textureKey, deathAnimation.body.frame)
      .setOrigin(0.5, 1)
      .setDisplaySize(deathAnimation.displayWidth, deathAnimation.displayHeight)
      .setDepth(72)

    sprite.play(deathAnimation.body.animationKey)
    sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => sprite.destroy())
  }

  private fadeOutView(plantId: string, view: PlantView) {
    this.scene.tweens.add({
      targets: view.container,
      alpha: 0,
      y: view.container.y + 10,
      duration: 240,
      ease: 'Quad.easeIn',
      onComplete: () => this.destroyView(plantId, view)
    })
  }

  private destroyView(plantId: string, view: PlantView) {
    if (this.views.get(plantId) !== view) {
      return
    }

    destroyPlantView(view)
    this.views.delete(plantId)
  }
}

function destroyPlantView(view: PlantView) {
  view.attackSprite?.destroy()
  view.container.destroy(true)
  view.hpBack.destroy()
  view.hp.destroy()
}

function shouldRenderPlantBase(plant: Plant) {
  if (plant.type === 'lava_wall' && plant.temporaryUntilWave !== undefined) {
    return false
  }

  if (plant.type === 'melee_turret' && plant.temporaryUntilTime !== undefined) {
    return false
  }

  return true
}
