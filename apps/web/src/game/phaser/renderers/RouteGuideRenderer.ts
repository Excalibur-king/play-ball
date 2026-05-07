import { enemyDefinitions, lawn, rowsForRoute } from '@tower-rogue/game-content'
import type { RunPhase } from '@tower-rogue/game-core'
import Phaser from 'phaser'

type GuideRole = 'normal' | 'fast' | 'heavy_attack' | 'flying' | 'boss'
type HighlightStrength = 'primary' | 'secondary'
type GuideRoute = 'left' | 'center' | 'right' | 'mixed' | 'row-1' | 'row-2' | 'row-3' | 'row-4' | 'row-5'

type GuideGroup = {
  groupIndex: number
  enemyId: string
  route: GuideRoute
  count: number
  spawned: number
  spawnTimer: number
  interval: number
}

type LanePreviewView = {
  fill: Phaser.GameObjects.Graphics
  edge: Phaser.GameObjects.Graphics
}

type ActiveRowGuide = {
  role: GuideRole
  spawnTimer: number
  strength: HighlightStrength
}

type GuideStyle = {
  fillColor: number
  edgeColor: number
  baseAlpha: number
  pulseAlpha: number
  edgeAlpha: number
}

const warningWindowSeconds = 3

const guideStyles: Record<GuideRole, GuideStyle> = {
  normal: {
    fillColor: 0xf7d978,
    edgeColor: 0xffefae,
    baseAlpha: 0.08,
    pulseAlpha: 0.05,
    edgeAlpha: 0.34
  },
  fast: {
    fillColor: 0xf1bc52,
    edgeColor: 0xffe3a2,
    baseAlpha: 0.12,
    pulseAlpha: 0.08,
    edgeAlpha: 0.44
  },
  heavy_attack: {
    fillColor: 0xe9894c,
    edgeColor: 0xffd3a2,
    baseAlpha: 0.16,
    pulseAlpha: 0.12,
    edgeAlpha: 0.56
  },
  flying: {
    fillColor: 0x74dcc7,
    edgeColor: 0xd9fff6,
    baseAlpha: 0.13,
    pulseAlpha: 0.1,
    edgeAlpha: 0.48
  },
  boss: {
    fillColor: 0xdf5b49,
    edgeColor: 0xffd5c5,
    baseAlpha: 0.22,
    pulseAlpha: 0.16,
    edgeAlpha: 0.7
  }
}

const rolePriority: Record<GuideRole, number> = {
  normal: 1,
  fast: 2,
  flying: 3,
  heavy_attack: 4,
  boss: 5
}

// Route guides stay in Phaser so they can pulse above the board without
// adding DOM HUD weight. This version intentionally returns to the simpler
// lane-cell highlight look instead of the arrow-line treatment.
export class RouteGuideRenderer {
  private readonly laneViews: LanePreviewView[]

  constructor(private readonly scene: Phaser.Scene) {
    this.laneViews = Array.from({ length: lawn.rows }, (_, row) => this.createLaneView(row))
  }

  sync(input: {
    phase: RunPhase
    groups: readonly GuideGroup[]
    waveIndex: number
    timeMs: number
  }) {
    if (input.phase !== 'playing') {
      this.hideAll()
      return
    }

    const highlightedRows = collectHighlightedRows(input.groups, input.waveIndex)
    const pulse = (Math.sin(input.timeMs * 0.008) + 1) * 0.5

    for (const [row, view] of this.laneViews.entries()) {
      const guide = highlightedRows.get(row)

      if (!guide) {
        view.fill.setVisible(false)
        view.edge.setVisible(false)
        continue
      }

      const style = guideStyles[guide.role]
      const imminence = Phaser.Math.Clamp(1 - guide.spawnTimer / warningWindowSeconds, 0, 1)
      const strengthMultiplier = guide.strength === 'primary' ? 1 : 0.72
      const pulseBoost = style.pulseAlpha * (0.45 + imminence * 0.55) * pulse

      drawRowCells(view, row, {
        fillColor: style.fillColor,
        fillAlpha: (style.baseAlpha + pulseBoost) * strengthMultiplier,
        edgeColor: style.edgeColor,
        edgeAlpha: (style.edgeAlpha + imminence * 0.1) * strengthMultiplier,
        shimmer: pulse,
        isSecondary: guide.strength === 'secondary'
      })
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
      view.fill.clear().setVisible(false)
      view.edge.clear().setVisible(false)
    }
  }

  private createLaneView(row: number): LanePreviewView {
    const fill = this.scene.add.graphics().setDepth(2).setBlendMode(Phaser.BlendModes.SCREEN).setVisible(false)
    const edge = this.scene.add.graphics().setDepth(3).setVisible(false)

    return { fill, edge }
  }
}

function collectHighlightedRows(groups: readonly GuideGroup[], waveIndex: number) {
  const rows = new Map<number, ActiveRowGuide>()

  for (const group of groups) {
    if (group.spawned > 0 || group.count <= group.spawned || group.spawnTimer > warningWindowSeconds) {
      continue
    }

    const role = normalizeGuideRole(enemyDefinitions[group.enemyId as keyof typeof enemyDefinitions]?.role)
    const strength: HighlightStrength = group.route === 'mixed' ? 'secondary' : 'primary'

    for (const row of getProjectedRows(group, waveIndex)) {
      const current = rows.get(row)

      if (!current || shouldReplaceGuide(role, group.spawnTimer, current)) {
        rows.set(row, {
          role,
          spawnTimer: group.spawnTimer,
          strength
        })
      }
    }
  }

  return rows
}

function getProjectedRows(group: GuideGroup, waveIndex: number) {
  const routeRows = rowsForRoute(group.route)
  const remaining = Math.max(0, group.count - group.spawned)
  const rows = new Set<number>()

  for (let spawnOffset = 0; spawnOffset < remaining; spawnOffset += 1) {
    const projectedSpawnAt = group.spawnTimer + spawnOffset * group.interval

    if (projectedSpawnAt > warningWindowSeconds) {
      break
    }

    const seed = group.groupIndex + group.spawned + spawnOffset
    const row = routeRows[(seed + waveIndex) % routeRows.length]

    if (row !== undefined) {
      rows.add(row)
    }
  }

  if (rows.size === 0) {
    const seed = group.groupIndex + group.spawned
    const fallbackRow = routeRows[(seed + waveIndex) % routeRows.length]

    if (fallbackRow !== undefined) {
      rows.add(fallbackRow)
    }
  }

  return rows
}

function shouldReplaceGuide(role: GuideRole, spawnTimer: number, current: ActiveRowGuide) {
  const candidateScore = rolePriority[role] * 10 + (warningWindowSeconds - spawnTimer)
  const currentScore = rolePriority[current.role] * 10 + (warningWindowSeconds - current.spawnTimer)
  return candidateScore > currentScore
}

function normalizeGuideRole(role?: string): GuideRole {
  switch (role) {
    case 'fast':
    case 'heavy_attack':
    case 'flying':
    case 'boss':
      return role
    case 'normal':
    default:
      return 'normal'
  }
}

function drawRowCells(
  view: LanePreviewView,
  row: number,
  input: {
    fillColor: number
    fillAlpha: number
    edgeColor: number
    edgeAlpha: number
    shimmer: number
    isSecondary: boolean
  }
) {
  const { originX, originY, cellWidth, cellHeight, cols } = lawn
  const top = originY + row * cellHeight
  const insetX = input.isSecondary ? 7 : 5
  const insetY = input.isSecondary ? 8 : 6
  const radius = input.isSecondary ? 10 : 12
  const fillWidth = cellWidth - insetX * 2
  const fillHeight = cellHeight - insetY * 2

  view.fill.clear().setVisible(true)
  view.edge.clear().setVisible(true)

  for (let col = 0; col < cols; col += 1) {
    const left = originX + col * cellWidth

    view.fill.fillStyle(input.fillColor, input.fillAlpha)
    view.fill.fillRoundedRect(left + insetX, top + insetY, fillWidth, fillHeight, radius)

    view.edge.lineStyle(2, input.edgeColor, input.edgeAlpha)
    view.edge.strokeRoundedRect(left + insetX + 1, top + insetY + 1, fillWidth - 2, fillHeight - 2, radius - 1)

    view.edge.fillStyle(input.edgeColor, input.edgeAlpha * (0.18 + input.shimmer * 0.12))
    view.edge.fillRoundedRect(left + insetX + 10, top + insetY + 8, Math.max(14, fillWidth - 20), 5, 2.5)
  }
}
