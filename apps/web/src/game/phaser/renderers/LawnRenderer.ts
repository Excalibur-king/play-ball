import { getWorldDefinition } from '@tower-rogue/game-core'
import Phaser from 'phaser'
import { gardenPalette } from '../theme'

type World = ReturnType<typeof getWorldDefinition>

// Draws the static backyard scene once. It owns no gameplay state.
export class LawnRenderer {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: World
  ) {}

  draw() {
    const graphics = this.scene.add.graphics()
    const { originX, originY, cellWidth, cellHeight, rows, cols, houseLineX, spawnX } = this.world.lawn

    graphics.fillStyle(gardenPalette.sky, 1)
    graphics.fillRect(0, 0, 1280, 720)

    graphics.fillStyle(gardenPalette.skyLight, 1)
    graphics.fillRect(0, 0, 1280, originY - 30)

    this.drawCloud(graphics, 252, 58, 1)
    this.drawCloud(graphics, 742, 42, 0.8)
    this.drawCloud(graphics, 1040, 76, 0.7)
    this.drawFence(graphics, originY)
    this.drawHouse(graphics, originX)
    this.drawZombieLane(graphics, spawnX, originY, rows, cellHeight)
    this.drawGrid(graphics, originX, originY, rows, cols, cellWidth, cellHeight)
    this.drawHouseLine(graphics, houseLineX, originY, rows, cellHeight)
    this.drawLabels(spawnX)
  }

  private drawFence(graphics: Phaser.GameObjects.Graphics, originY: number) {
    graphics.fillStyle(0xf0d28b, 1)
    graphics.fillRect(0, originY - 42, 1280, 30)
    graphics.lineStyle(2, 0x9d713d, 0.35)

    for (let x = 0; x < 1280; x += 44) {
      graphics.fillStyle(x % 88 === 0 ? gardenPalette.fenceLight : gardenPalette.fenceDark, 1)
      graphics.fillRect(x, originY - 46, 36, 38)
      graphics.lineBetween(x, originY - 46, x, originY - 8)
    }
  }

  private drawHouse(graphics: Phaser.GameObjects.Graphics, originX: number) {
    graphics.fillStyle(gardenPalette.wood, 1)
    graphics.fillRect(0, 0, originX - 24, 720)
    graphics.fillStyle(gardenPalette.woodDark, 1)
    graphics.fillRect(0, 0, originX - 24, 122)
    graphics.fillStyle(gardenPalette.houseWall, 1)
    graphics.fillRect(34, 150, 82, 92)
    graphics.fillStyle(0x7a3f2d, 1)
    graphics.fillRect(48, 178, 30, 64)
    graphics.fillStyle(gardenPalette.houseRoof, 1)
    graphics.fillTriangle(24, 152, 75, 104, 126, 152)
  }

  private drawZombieLane(
    graphics: Phaser.GameObjects.Graphics,
    spawnX: number,
    originY: number,
    rows: number,
    cellHeight: number
  ) {
    graphics.fillStyle(gardenPalette.laneDirt, 1)
    graphics.fillRect(spawnX - 14, originY - 20, 120, rows * cellHeight + 40)
    graphics.lineStyle(3, gardenPalette.dirtLine, 0.8)
    graphics.strokeRect(spawnX - 14, originY - 20, 120, rows * cellHeight + 40)
  }

  private drawGrid(
    graphics: Phaser.GameObjects.Graphics,
    originX: number,
    originY: number,
    rows: number,
    cols: number,
    cellWidth: number,
    cellHeight: number
  ) {
    graphics.fillStyle(gardenPalette.lawnBorder, 1)
    graphics.fillRect(originX - 8, originY - 8, cols * cellWidth + 16, rows * cellHeight + 16)
    graphics.lineStyle(4, 0x3b7e35, 0.72)
    graphics.strokeRect(originX - 8, originY - 8, cols * cellWidth + 16, rows * cellHeight + 16)

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = originX + col * cellWidth
        const y = originY + row * cellHeight
        const color = (row + col) % 2 === 0 ? gardenPalette.grassA : gardenPalette.grassB
        graphics.fillStyle(color, 1)
        graphics.fillRect(x, y, cellWidth, cellHeight)
        graphics.fillStyle(gardenPalette.grassHighlight, 0.18)
        graphics.fillEllipse(x + cellWidth * 0.28, y + cellHeight * 0.72, 34, 8)
        graphics.fillEllipse(x + cellWidth * 0.74, y + cellHeight * 0.32, 22, 6)
      }
    }

    graphics.lineStyle(2, gardenPalette.lawnLine, 0.35)
    for (let row = 0; row <= rows; row += 1) {
      const y = originY + row * cellHeight
      graphics.lineBetween(originX, y, originX + cols * cellWidth, y)
    }

    for (let col = 0; col <= cols; col += 1) {
      const x = originX + col * cellWidth
      graphics.lineBetween(x, originY, x, originY + rows * cellHeight)
    }
  }

  private drawHouseLine(graphics: Phaser.GameObjects.Graphics, houseLineX: number, originY: number, rows: number, cellHeight: number) {
    graphics.lineStyle(10, gardenPalette.dangerLine, 0.18)
    graphics.lineBetween(houseLineX, originY - 22, houseLineX, originY + rows * cellHeight + 22)
    graphics.lineStyle(4, gardenPalette.dangerLine, 0.88)
    graphics.lineBetween(houseLineX, originY - 14, houseLineX, originY + rows * cellHeight + 14)
  }

  private drawLabels(spawnX: number) {
    const house = this.scene.add.text(28, 302, 'HOUSE', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#fff0c4',
      fontStyle: '700'
    })
    house.setShadow(2, 3, '#6b381f', 0)

    const zombies = this.scene.add.text(spawnX - 8, 92, 'ZOMBIES', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#5b3b1f',
      fontStyle: '700'
    })
    zombies.setShadow(1, 2, '#e5c481', 0)
  }

  private drawCloud(graphics: Phaser.GameObjects.Graphics, x: number, y: number, scale: number) {
    graphics.fillStyle(0xffffff, 0.82)
    graphics.fillCircle(x, y, 22 * scale)
    graphics.fillCircle(x + 24 * scale, y - 8 * scale, 28 * scale)
    graphics.fillCircle(x + 52 * scale, y, 20 * scale)
    graphics.fillRoundedRect(x - 4 * scale, y, 72 * scale, 18 * scale, 10 * scale)
  }
}
