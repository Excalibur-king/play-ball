import Phaser from 'phaser'
import { getWorldDefinition } from '@tower-rogue/game-core'

type World = ReturnType<typeof getWorldDefinition>

const boardPalette = {
  boardShadow: 0x120807,
  boardFrame: 0xcaa56a,
  boardFrameDark: 0x5a3019,
  boardInnerGlow: 0x6ad7ff,
  deployFillA: 0x102133,
  deployFillB: 0x0c1726,
  deployEdge: 0xa2ebff,
  deployNode: 0x7ee7ff,
  approachFillA: 0x2b120d,
  approachFillB: 0x190b08,
  approachEdge: 0xffb177,
  deployText: '#2b190f',
  noteText: '#ffe4cb'
} as const

// Draws the static battle backdrop once. It owns no gameplay state.
export class LawnRenderer {
  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: World
  ) {}

  draw() {
    this.drawBoardPlate()
    this.drawGridLines()
    this.drawZoneLabels()
  }

  private drawBoardPlate() {
    const { originX, originY, cellWidth, cellHeight, rows, cols, buildableColStart, buildableColEnd } = this.world.lawn
    const width = cols * cellWidth
    const height = rows * cellHeight
    const buildableCols = buildableColEnd - buildableColStart + 1
    const buildableWidth = buildableCols * cellWidth
    const board = this.scene.add.graphics().setDepth(-20)
    const enemyApproachX = originX + buildableWidth
    const boardPadding = 10

    board.fillStyle(boardPalette.boardShadow, 0.14)
    board.fillRoundedRect(
      originX - boardPadding + 4,
      originY - boardPadding + 8,
      width + boardPadding * 2,
      height + boardPadding * 2,
      18
    )

    board.fillStyle(boardPalette.boardFrameDark, 0.34)
    board.fillRoundedRect(originX - boardPadding, originY - boardPadding, width + boardPadding * 2, height + boardPadding * 2, 18)
    board.lineStyle(3, boardPalette.boardFrame, 0.46)
    board.strokeRoundedRect(originX - boardPadding, originY - boardPadding, width + boardPadding * 2, height + boardPadding * 2, 18)

    board.fillStyle(boardPalette.deployFillA, 0.1)
    board.fillRoundedRect(originX, originY, buildableWidth, height, 14)
    board.lineStyle(2, boardPalette.deployEdge, 0.2)
    board.strokeRoundedRect(originX + 2, originY + 2, buildableWidth - 4, height - 4, 12)

    board.fillStyle(boardPalette.approachFillA, 0.12)
    board.fillRoundedRect(enemyApproachX, originY, width - buildableWidth, height, 14)
    board.lineStyle(2, boardPalette.approachEdge, 0.22)
    board.strokeRoundedRect(enemyApproachX + 2, originY + 2, width - buildableWidth - 4, height - 4, 12)

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const x = originX + col * cellWidth
        const y = originY + row * cellHeight
        const isEven = (row + col) % 2 === 0
        const buildable = col >= buildableColStart && col <= buildableColEnd

        if (buildable) {
          board.fillStyle(isEven ? boardPalette.deployFillA : boardPalette.deployFillB, isEven ? 0.08 : 0.05)
          board.fillRoundedRect(x + 2, y + 2, cellWidth - 4, cellHeight - 4, 10)
          board.fillStyle(boardPalette.boardInnerGlow, isEven ? 0.06 : 0.04)
          board.fillCircle(x + cellWidth - 13, y + 13, 3)
          continue
        }

        board.fillStyle(isEven ? boardPalette.approachFillA : boardPalette.approachFillB, isEven ? 0.1 : 0.06)
        board.fillRoundedRect(x + 2, y + 2, cellWidth - 4, cellHeight - 4, 10)
      }
    }
  }

  private drawGridLines() {
    const { originX, originY, cellWidth, cellHeight, rows, cols, buildableColStart, buildableColEnd } = this.world.lawn
    const grid = this.scene.add.graphics().setDepth(-16)
    const width = cols * cellWidth
    const height = rows * cellHeight

    for (let col = 0; col <= cols; col += 1) {
      const x = originX + col * cellWidth
      const inDeployZone = col >= buildableColStart && col <= buildableColEnd
      const isBoundary = col === buildableColStart || col === buildableColEnd + 1

      grid.lineStyle(isBoundary ? 3 : 1.5, inDeployZone ? boardPalette.deployEdge : boardPalette.approachEdge, isBoundary ? 0.22 : 0.1)
      grid.lineBetween(x, originY, x, originY + height)
    }

    for (let row = 0; row <= rows; row += 1) {
      const y = originY + row * cellHeight
      grid.lineStyle(1.5, boardPalette.deployEdge, 0.1)
      grid.lineBetween(originX, y, originX + width, y)
    }

    for (let row = 0; row < rows; row += 1) {
      for (let col = buildableColStart; col <= buildableColEnd; col += 1) {
        const x = originX + col * cellWidth
        const y = originY + row * cellHeight
        grid.fillStyle(boardPalette.deployNode, 0.12)
        grid.fillCircle(x + 9, y + 9, 2)
        grid.fillCircle(x + cellWidth - 9, y + cellHeight - 9, 2)
      }
    }
  }

  private drawZoneLabels() {
    const { originX, originY, cellWidth, buildableColStart, buildableColEnd, cols, rows, cellHeight } = this.world.lawn
    const buildableWidth = (buildableColEnd - buildableColStart + 1) * cellWidth
    const approachX = originX + (buildableColEnd + 1) * cellWidth
    const approachWidth = (cols - buildableColEnd - 1) * cellWidth
    const labelY = originY - 36
    const hasApproachZone = approachWidth > 0

    this.drawZoneTag(originX + buildableWidth * 0.5, labelY, 196, hasApproachZone ? '学院部署区' : '临时布防场', boardPalette.boardFrame, boardPalette.boardFrameDark)

    if (hasApproachZone) {
      this.drawZoneTag(approachX + approachWidth * 0.5, labelY, 208, '魔物潮入口', 0xff9f72, 0x5e2013)

      this.scene.add
        .text(approachX + 10, originY + rows * cellHeight + 14, '入口区仅供魔物涌入，无法展开魔导具', {
          fontFamily: 'Arial',
          fontSize: '14px',
          fontStyle: '700',
          color: boardPalette.noteText
        })
        .setDepth(-9)
        .setAlpha(0.72)
    }
  }

  private drawZoneTag(centerX: number, centerY: number, width: number, label: string, fillColor: number, edgeColor: number) {
    const background = this.scene.add.graphics().setDepth(-9)

    background.fillStyle(fillColor, 0.72)
    background.fillRoundedRect(centerX - width / 2, centerY - 16, width, 32, 14)
    background.lineStyle(2, edgeColor, 0.54)
    background.strokeRoundedRect(centerX - width / 2, centerY - 16, width, 32, 14)

    this.scene.add
      .text(centerX, centerY - 1, label, {
        fontFamily: 'Arial',
        fontSize: '15px',
        fontStyle: '700',
        color: boardPalette.deployText
      })
      .setOrigin(0.5)
      .setDepth(-8)
  }
}
