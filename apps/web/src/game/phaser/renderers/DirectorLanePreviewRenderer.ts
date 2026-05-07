import { lawn, rowsForRoute } from '@tower-rogue/game-content'
import type { DirectorDecisionParams, DirectorThreatLevel, RunPhase } from '@tower-rogue/game-core'
import Phaser from 'phaser'

type LanePreviewView = {
  fill: Phaser.GameObjects.Rectangle
  edge: Phaser.GameObjects.Rectangle
}

type HighlightStrength = 'primary' | 'secondary'

type ThreatStyle = {
  fillColor: number
  edgeColor: number
  baseAlpha: number
  pulseAlpha: number
  edgeAlpha: number
}

const lanePreviewStyles: Record<DirectorThreatLevel, ThreatStyle> = {
  low: {
    fillColor: 0xf7d978,
    edgeColor: 0xffefae,
    baseAlpha: 0.08,
    pulseAlpha: 0.04,
    edgeAlpha: 0.35
  },
  medium: {
    fillColor: 0xf1bc52,
    edgeColor: 0xffe3a2,
    baseAlpha: 0.12,
    pulseAlpha: 0.08,
    edgeAlpha: 0.46
  },
  high: {
    fillColor: 0xe9894c,
    edgeColor: 0xffd3a2,
    baseAlpha: 0.16,
    pulseAlpha: 0.12,
    edgeAlpha: 0.58
  },
  critical: {
    fillColor: 0xdf5b49,
    edgeColor: 0xffd5c5,
    baseAlpha: 0.22,
    pulseAlpha: 0.16,
    edgeAlpha: 0.72
  }
}

export class DirectorLanePreviewRenderer {
  private readonly laneViews: LanePreviewView[]

  constructor(private readonly scene: Phaser.Scene) {
    this.laneViews = Array.from({ length: lawn.rows }, (_, row) => this.createLaneView(row))
  }

  sync(input: {
    phase: RunPhase
    params?: DirectorDecisionParams
    threatLevel?: DirectorThreatLevel
    timeMs: number
  }) {
    if (input.phase !== 'ready' || !input.params || !input.threatLevel) {
      this.hideAll()
      return
    }

    const highlightedRows = getHighlightedRows(input.params)
    const style = lanePreviewStyles[input.threatLevel]
    const pulse = (Math.sin(input.timeMs * 0.008) + 1) * 0.5

    for (const [row, view] of this.laneViews.entries()) {
      const strength = highlightedRows.get(row)

      if (!strength) {
        view.fill.setVisible(false)
        view.edge.setVisible(false)
        continue
      }

      const multiplier = strength === 'primary' ? 1 : 0.72
      view.fill
        .setVisible(true)
        .setFillStyle(style.fillColor, style.baseAlpha * multiplier + style.pulseAlpha * multiplier * pulse)
      view.edge
        .setVisible(true)
        .setFillStyle(style.edgeColor, style.edgeAlpha * multiplier)
        .setScale(1, 0.92 + pulse * 0.12 * multiplier)
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

  private createLaneView(row: number): LanePreviewView {
    const laneWidth = lawn.cols * lawn.cellWidth
    const laneY = lawn.originY + row * lawn.cellHeight + lawn.cellHeight / 2
    const fill = this.scene.add
      .rectangle(lawn.originX + laneWidth / 2, laneY, laneWidth, lawn.cellHeight - 10, 0xffffff, 0)
      .setDepth(2)
      .setBlendMode(Phaser.BlendModes.SCREEN)
      .setVisible(false)
    const edge = this.scene.add
      .rectangle(lawn.originX + laneWidth - 10, laneY, 18, lawn.cellHeight - 18, 0xffffff, 0)
      .setDepth(3)
      .setVisible(false)

    return { fill, edge }
  }
}

function getHighlightedRows(params: DirectorDecisionParams) {
  const rows = new Map<number, HighlightStrength>()

  for (const row of rowsForRoute(params.primaryRoute)) {
    rows.set(row, 'primary')
  }

  if (params.secondaryRoute && params.secondaryRoute !== params.primaryRoute) {
    for (const row of rowsForRoute(params.secondaryRoute)) {
      if (!rows.has(row)) {
        rows.set(row, 'secondary')
      }
    }
  }

  return rows
}
