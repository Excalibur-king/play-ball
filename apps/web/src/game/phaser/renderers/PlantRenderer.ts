import type { Plant } from '@tower-rogue/game-core'
import Phaser from 'phaser'
import { gardenPalette } from '../theme'

type PlantPiece =
  | Phaser.GameObjects.Arc
  | Phaser.GameObjects.Ellipse
  | Phaser.GameObjects.Rectangle
  | Phaser.GameObjects.Image
  | Phaser.GameObjects.Sprite

type PlantView = {
  componentsKey: string
  pieces: PlantPiece[]
  hpBack: Phaser.GameObjects.Rectangle
  hp: Phaser.GameObjects.Rectangle
  mainSprite?: Phaser.GameObjects.Sprite
}

// Mirrors game-core plants into disposable Phaser view objects.
// The simulation owns positions and health; this class owns idle/recoil animation only.
export class PlantRenderer {
  private readonly views = new Map<string, PlantView>()

  constructor(private readonly scene: Phaser.Scene) {}

  sync(plants: Plant[]) {
    const currentIds = new Set(plants.map((plant) => plant.id))

    for (const [id, view] of this.views) {
      if (!currentIds.has(id)) {
        destroyPlantView(view)
        this.views.delete(id)
      }
    }

    for (const plant of plants) {
      this.syncPlant(plant)
    }
  }

  playShooterRecoil(plants: Plant[], from: { x: number; y: number }) {
    const plant = plants.find((item) => Math.abs(item.x + 30 - from.x) < 10 && Math.abs(item.y - 7 - from.y) < 12)

    if (!plant) {
      return
    }

    const view = this.views.get(plant.id)

    if (!view) {
      return
    }

    if (view.mainSprite) {
      view.mainSprite.play('pea-shooter-shoot', true)
      view.mainSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (view.mainSprite?.active) {
          view.mainSprite.play('pea-shooter-idle', true)
        }
      })
    }

    this.scene.tweens.add({
      targets: view.pieces,
      x: '-=6',
      scaleX: 0.96,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut'
    })
  }

  clear() {
    for (const view of this.views.values()) {
      destroyPlantView(view)
    }
    this.views.clear()
  }

  private syncPlant(plant: Plant) {
    let view = this.views.get(plant.id)
    const componentsKey = plant.components.join('+')

    if (view && view.componentsKey !== componentsKey) {
      destroyPlantView(view)
      this.views.delete(plant.id)
      view = undefined
    }

    if (!view) {
      view = this.createPlantView(plant)
      this.views.set(plant.id, view)
    }

    const hpRatio = Phaser.Math.Clamp(plant.hp / plant.maxHp, 0, 1)
    view.hp.setSize(44 * hpRatio, 5)
    view.hp.setPosition(plant.x - 22 + 22 * hpRatio, plant.y - 44)

    for (const piece of view.pieces) {
      piece.setDepth(10 + plant.row)
    }

    view.hpBack.setDepth(20 + plant.row)
    view.hp.setDepth(21 + plant.row)
  }

  private createPlantView(plant: Plant): PlantView {
    const pieces: PlantPiece[] = []
    const components = plant.components.length > 0 ? plant.components : [plant.type]
    const isFused = components.length > 1
    const hasPea = components.includes('pea-shooter')
    const hasSunflower = components.includes('sunflower')
    const hasWallNut = components.includes('wall-nut')
    const fusionColor = getFusionColor(components)

    const shadow = this.scene.add.ellipse(plant.x, plant.y + 36, isFused ? 80 : 68, 15, gardenPalette.shadow, 0.18)
    pieces.push(shadow)

    if (isFused) {
      const aura = this.scene.add.circle(plant.x, plant.y, 42, fusionColor, 0.16)
      aura.setStrokeStyle(3, fusionColor, 0.62)
      pieces.push(aura)
    }

    if (hasWallNut) {
      const shield = this.scene.add.circle(plant.x, plant.y + 2, isFused ? 38 : 34, 0x8f623d, isFused ? 0.34 : 0.14)
      shield.setStrokeStyle(isFused ? 4 : 0, 0xffe1a3, isFused ? 0.74 : 0)
      pieces.push(shield)
    }

    if (hasSunflower) {
      const glow = this.scene.add.circle(plant.x, plant.y, 34, gardenPalette.sun, 0.16)
      pieces.push(glow)

      if (!hasPea) {
        const sprite = this.scene.add
          .image(plant.x, hasWallNut ? plant.y - 13 : plant.y, 'plant-sunflower')
          .setDisplaySize(hasWallNut ? 54 : isFused ? 68 : 76, hasWallNut ? 54 : isFused ? 68 : 76)
        pieces.push(sprite)
      } else {
        this.addSunMotifs(plant, pieces)
      }
    }

    if (hasPea) {
      const glow = this.scene.add.circle(plant.x + 4, plant.y - 5, 34, gardenPalette.plantHealth, 0.14)
      const sprite = this.scene.add
        .sprite(plant.x + 6, plant.y + 2, 'plants-premium', 'pea-shooter/idle/0001')
        .setDisplaySize(isFused ? 124 : 116, isFused ? 112 : 104)
        .play('pea-shooter-idle')
      pieces.push(glow, sprite)

      if (hasWallNut) {
        this.addArmorPlates(plant, pieces)
      }

      this.startIdleAnimation(plant, pieces)

      const hpBack = this.scene.add.rectangle(plant.x, plant.y - 44, 46, 5, gardenPalette.healthBack, 0.72)
      const hp = this.scene.add.rectangle(plant.x, plant.y - 44, 44, 5, gardenPalette.plantHealth, 1)

      return { componentsKey: plant.components.join('+'), pieces, hpBack, hp, mainSprite: sprite }
    }

    if (hasWallNut) {
      const sprite = this.scene.add
        .image(plant.x, hasSunflower ? plant.y + 10 : plant.y, 'plant-wall-nut')
        .setDisplaySize(isFused ? 78 : 70, isFused ? 88 : 82)
      pieces.push(sprite)

      if (hasSunflower) {
        this.addSunMotifs(plant, pieces)
      }
    }

    this.startIdleAnimation(plant, pieces)

    const hpBack = this.scene.add.rectangle(plant.x, plant.y - 44, 46, 5, gardenPalette.healthBack, 0.72)
    const hp = this.scene.add.rectangle(plant.x, plant.y - 44, 44, 5, gardenPalette.plantHealth, 1)

    return { componentsKey: plant.components.join('+'), pieces, hpBack, hp }
  }

  private addSunMotifs(plant: Plant, pieces: PlantPiece[]) {
    pieces.push(
      this.scene.add.circle(plant.x - 27, plant.y - 30, 7, gardenPalette.sun, 0.92),
      this.scene.add.circle(plant.x + 29, plant.y - 28, 5, gardenPalette.sun, 0.82),
      this.scene.add.circle(plant.x + 33, plant.y + 10, 4, gardenPalette.sun, 0.72)
    )
  }

  private addArmorPlates(plant: Plant, pieces: PlantPiece[]) {
    const leftPlate = this.scene.add.rectangle(plant.x - 28, plant.y + 4, 12, 36, 0x9a6a42, 0.78)
    const rightPlate = this.scene.add.rectangle(plant.x + 32, plant.y + 4, 12, 36, 0x9a6a42, 0.78)
    leftPlate.setStrokeStyle(2, 0xffdf9a, 0.72)
    rightPlate.setStrokeStyle(2, 0xffdf9a, 0.72)
    pieces.push(leftPlate, rightPlate)
  }

  private startIdleAnimation(plant: Plant, pieces: PlantPiece[]) {
    // Idle motion is intentionally view-only. It should never change simulation positions.
    const components = plant.components.length > 0 ? plant.components : [plant.type]

    if (components.includes('sunflower') && !components.includes('pea-shooter')) {
      this.scene.tweens.add({
        targets: pieces,
        y: '+=3',
        scaleX: 1.03,
        scaleY: 0.97,
        duration: 1100,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
      return
    }

    if (components.includes('pea-shooter')) {
      this.scene.tweens.add({
        targets: pieces,
        y: '+=2',
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      })
      return
    }

    this.scene.tweens.add({
      targets: pieces,
      scaleX: 1.015,
      scaleY: 0.985,
      duration: 1350,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    })
  }
}

function getFusionColor(components: Plant['components']) {
  if (components.includes('pea-shooter') && components.includes('sunflower')) {
    return 0xffd85c
  }

  if (components.includes('pea-shooter') && components.includes('wall-nut')) {
    return 0x9fdb74
  }

  return 0xffb45e
}

function destroyPlantView(view: PlantView) {
  for (const piece of view.pieces) {
    piece.destroy()
  }

  view.hpBack.destroy()
  view.hp.destroy()
}
