import type { PlantType } from '@tower-rogue/game-core'
import { getWorldDefinition } from '@tower-rogue/game-core'
import Phaser from 'phaser'
import { assetManifest } from '../../assets/assetManifest'
import { gardenPalette } from '../theme'

type World = ReturnType<typeof getWorldDefinition>
type HoveredCell = { row: number; col: number } | null

type PlacementPreviewState = {
  hoveredCell: HoveredCell
  selectedPlantType: PlantType | null
  selectedPlantMode: 'single' | 'persistent'
  canAfford: boolean
  occupied: boolean
  interactive: boolean
}

export class PlacementPreviewRenderer {
  private readonly container: Phaser.GameObjects.Container
  private readonly cellFill: Phaser.GameObjects.Rectangle
  private readonly cellOutline: Phaser.GameObjects.Rectangle
  private readonly shadow: Phaser.GameObjects.Ellipse
  private readonly body: Phaser.GameObjects.Sprite

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: World
  ) {
    const { cellWidth, cellHeight } = world.lawn
    this.container = scene.add.container(0, 0).setDepth(18).setVisible(false)
    this.cellFill = scene.add.rectangle(0, 0, cellWidth - 6, cellHeight - 6, gardenPalette.sun, 0.14)
    this.cellOutline = scene.add.rectangle(0, 0, cellWidth - 4, cellHeight - 4)
    this.cellOutline.setStrokeStyle(2, 0xfff2a0, 0.75)
    this.shadow = scene.add.ellipse(0, 32, 70, 16, gardenPalette.shadow, 0.15)
    this.body = scene.add.sprite(0, 28, assetManifest.buildings.energy_core.body.textureKey)
    this.body.setOrigin(0.5, 1)
    this.body.setAlpha(0.42)
    this.container.add([this.cellFill, this.cellOutline, this.shadow, this.body])
  }

  sync(state: PlacementPreviewState) {
    if (!state.hoveredCell || !state.selectedPlantType || !state.interactive) {
      this.container.setVisible(false)
      return
    }

    const { row, col } = state.hoveredCell
    const { originX, originY, cellWidth, cellHeight } = this.world.lawn
    const visual = assetManifest.buildings[state.selectedPlantType]
    const centerX = originX + col * cellWidth + cellWidth / 2
    const centerY = originY + row * cellHeight + cellHeight / 2
    const outlineColor = state.occupied ? 0xffd46b : state.canAfford ? (state.selectedPlantMode === 'persistent' ? 0xfff2a0 : 0xb5ffc0) : 0xff8f84
    const fillColor = state.occupied ? 0xffd46b : state.canAfford ? 0x9ce6a6 : 0xff8f84

    this.container.setVisible(true)
    this.container.setPosition(centerX, centerY)
    this.cellFill.setFillStyle(fillColor, state.occupied ? 0.12 : state.canAfford ? 0.14 : 0.18)
    this.cellOutline.setStrokeStyle(state.selectedPlantMode === 'persistent' ? 3 : 2, outlineColor, state.occupied ? 0.82 : 0.72)

    this.shadow.setPosition(0, visual.shadow.offsetY)
    this.shadow.setSize(visual.shadow.width, visual.shadow.height)
    this.shadow.setFillStyle(gardenPalette.shadow, visual.shadow.alpha)

    this.body.setTexture(visual.body.textureKey, visual.body.frame)
    this.body.setPosition(0, visual.bodyOffsetY)
    this.body.setDisplaySize(visual.displayWidth, visual.displayHeight)
    this.body.setVisible(!state.occupied)
    this.body.setAlpha(state.canAfford ? 0.42 : 0.24)
  }

  destroy() {
    this.container.destroy(true)
  }
}
