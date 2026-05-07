import { getWorldDefinition } from '@tower-rogue/game-core'
import Phaser from 'phaser'

type World = ReturnType<typeof getWorldDefinition>
type PlacementIntent = {
  keepSelected: boolean
}

// Owns pointer hit areas for lawn cells.
// It emits grid coordinates only; game rules stay in game-core.
export class LawnInput {
  private readonly cells: Phaser.GameObjects.Rectangle[] = []

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: World,
    private readonly onCellSelected: (row: number, col: number, intent: PlacementIntent) => void,
    private readonly onCellHoverChanged: (hoveredCell: { row: number; col: number } | null) => void
  ) {}

  create() {
    const { originX, originY, cellWidth, cellHeight, rows, cols, buildableColStart, buildableColEnd } = this.world.lawn

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const buildable = col >= buildableColStart && col <= buildableColEnd
        if (!buildable) {
          continue
        }

        const cell = this.scene.add
          .rectangle(originX + col * cellWidth + cellWidth / 2, originY + row * cellHeight + cellHeight / 2, cellWidth, cellHeight, 0xffffff, 0)
          .setDepth(4)

        cell.setInteractive({ useHandCursor: true })
        cell.on('pointerover', () => {
          cell.setFillStyle(0xffb86c, 0.16)
          this.onCellHoverChanged({ row, col })
        })
        cell.on('pointerout', () => {
          cell.setFillStyle(0xffffff, 0)
          this.onCellHoverChanged(null)
        })
        cell.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          if (pointer.rightButtonDown()) {
            return
          }

          const modifierEvent = pointer.event as MouseEvent | undefined
          this.onCellSelected(row, col, {
            keepSelected: Boolean(modifierEvent?.shiftKey)
          })
        })

        this.cells.push(cell)
      }
    }
  }

  destroy() {
    for (const cell of this.cells) {
      cell.destroy()
    }
    this.cells.length = 0
  }
}
