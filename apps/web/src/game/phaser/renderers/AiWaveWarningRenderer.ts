import { lawn, rowsForRoute } from '@tower-rogue/game-content'
import type { AiWaveRoute } from '@tower-rogue/game-core'
import Phaser from 'phaser'

const WARNING_DURATION_MS = 2500
const WARNING_FADE_MS = 600
const FILL_COLOR = 0xff6b3d
const EDGE_COLOR = 0xffad7a
const BASE_ALPHA = 0.05
const PEAK_ALPHA = 0.35
const EDGE_ALPHA = 0.7
const PULSE_SPEED = 0.012

type LaneWarningView = {
  fill: Phaser.GameObjects.Rectangle
  edge: Phaser.GameObjects.Rectangle
}

export class AiWaveWarningRenderer {
  private readonly laneViews: LaneWarningView[]
  private activeRows = new Set<number>()
  private triggerTime = 0
  private active = false

  constructor(private readonly scene: Phaser.Scene) {
    const laneWidth = lawn.spawnX - lawn.originX
    this.laneViews = Array.from({ length: lawn.rows }, (_, row) => {
      const laneY = lawn.originY + row * lawn.cellHeight + lawn.cellHeight / 2
      const fill = scene.add
        .rectangle(lawn.originX + laneWidth / 2, laneY, laneWidth, lawn.cellHeight * 0.8, FILL_COLOR, 0)
        .setDepth(2)
        .setBlendMode(Phaser.BlendModes.SCREEN)
        .setVisible(false)
      const edge = scene.add
        .rectangle(lawn.spawnX - 6, laneY, 12, lawn.cellHeight * 0.7, EDGE_COLOR, 0)
        .setDepth(3)
        .setVisible(false)
      return { fill, edge }
    })
  }

  trigger(routes: AiWaveRoute[]) {
    this.activeRows.clear()
    for (const route of routes) {
      for (const row of rowsForRoute(route)) {
        this.activeRows.add(row)
      }
    }
    if (this.activeRows.size === 0) return
    this.triggerTime = this.scene.time.now
    this.active = true
  }

  sync(timeMs: number) {
    if (!this.active) return

    const elapsed = timeMs - this.triggerTime
    if (elapsed > WARNING_DURATION_MS + WARNING_FADE_MS) {
      this.hideAll()
      this.active = false
      return
    }

    const fadeFactor = elapsed > WARNING_DURATION_MS
      ? 1 - (elapsed - WARNING_DURATION_MS) / WARNING_FADE_MS
      : 1

    const pulse = (Math.sin(elapsed * PULSE_SPEED) + 1) * 0.5
    const alpha = (BASE_ALPHA + (PEAK_ALPHA - BASE_ALPHA) * pulse) * fadeFactor

    for (const [row, view] of this.laneViews.entries()) {
      if (!this.activeRows.has(row)) {
        view.fill.setVisible(false)
        view.edge.setVisible(false)
        continue
      }
      view.fill.setVisible(true).setFillStyle(FILL_COLOR, alpha)
      view.edge.setVisible(true).setFillStyle(EDGE_COLOR, EDGE_ALPHA * fadeFactor * (0.6 + pulse * 0.4))
    }
  }

  destroy() {
    for (const view of this.laneViews) {
      view.fill.destroy()
      view.edge.destroy()
    }
  }

  private hideAll() {
    for (const view of this.laneViews) {
      view.fill.setVisible(false)
      view.edge.setVisible(false)
    }
  }
}
