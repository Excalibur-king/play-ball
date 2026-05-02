import { getWorldDefinition } from '@tower-rogue/game-core'
import Phaser from 'phaser'

type World = ReturnType<typeof getWorldDefinition>

// Owns pointer hit areas for lawn cells.
// It emits grid coordinates only; game rules stay in game-core.
export class LawnInput {
  private readonly cells: Phaser.GameObjects.Rectangle[] = []

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: World,
    private readonly onCellSelected: (row: number, col: number) => void
  ) {}

  create() {
    const { originX, originY, cellWidth, cellHeight, rows, cols } = this.world.lawn

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const cell = this.scene.add.rectangle(
          originX + col * cellWidth + cellWidth / 2,
          originY + row * cellHeight + cellHeight / 2,
          cellWidth - 4,
          cellHeight - 4,
          0xffffff,
          0
        )

        cell.setInteractive({ useHandCursor: true })
        cell.on('pointerover', () => cell.setFillStyle(0xffe27a, 0.22))
        cell.on('pointerout', () => cell.setFillStyle(0xffffff, 0))
        cell.on('pointerdown', () => this.onCellSelected(row, col))
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
