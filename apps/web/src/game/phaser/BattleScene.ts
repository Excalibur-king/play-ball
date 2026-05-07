import { GameEngine, getWorldDefinition, type LevelId, type StrategyCardId } from '@tower-rogue/game-core'
import Phaser from 'phaser'
import { gameBridge } from '../bridge/gameBridge'
import { LawnInput } from './input/LawnInput'
import { DirectorLanePreviewRenderer } from './renderers/DirectorLanePreviewRenderer'
import { EffectsRenderer } from './renderers/EffectsRenderer'
import { LawnRenderer } from './renderers/LawnRenderer'
import { PlantRenderer } from './renderers/PlantRenderer'
import { PlacementPreviewRenderer } from './renderers/PlacementPreviewRenderer'
import { ProjectileRenderer } from './renderers/ProjectileRenderer'
import { RouteGuideRenderer } from './renderers/RouteGuideRenderer'
import { ZombieRenderer } from './renderers/ZombieRenderer'

// BattleScene is deliberately thin:
// it owns Phaser lifecycle, wires game-core to renderers, and publishes HUD snapshots.
// Gameplay rules belong in game-core; visual details belong in renderer classes.
export class BattleScene extends Phaser.Scene {
  private readonly engine: GameEngine
  private readonly world: ReturnType<typeof getWorldDefinition>
  private unsubscribeCommands: (() => void) | undefined
  private lawnInput: LawnInput | undefined
  private plantRenderer!: PlantRenderer
  private zombieRenderer!: ZombieRenderer
  private projectileRenderer!: ProjectileRenderer
  private effectsRenderer!: EffectsRenderer
  private directorLanePreviewRenderer!: DirectorLanePreviewRenderer
  private routeGuideRenderer!: RouteGuideRenderer
  private placementPreviewRenderer!: PlacementPreviewRenderer
  private hoveredCell: { row: number; col: number } | null = null
  private lastSnapshotAt = 0

  constructor(levelId: LevelId, skillLoadout: StrategyCardId[], skillLevels: Partial<Record<StrategyCardId, number>>) {
    super('battle')
    this.engine = new GameEngine(levelId, skillLoadout, skillLevels)
    this.world = getWorldDefinition(levelId)
  }

  create() {
    this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0)')
    this.input.mouse?.disableContextMenu()
    new LawnRenderer(this, this.world).draw()

    this.lawnInput = new LawnInput(
      this,
      this.world,
      (row, col, intent) => {
        gameBridge.dispatch({ type: 'placePlant', row, col, keepSelected: intent.keepSelected })
      },
      (hoveredCell) => {
        this.hoveredCell = hoveredCell
      }
    )
    this.lawnInput.create()

    this.plantRenderer = new PlantRenderer(this)
    this.zombieRenderer = new ZombieRenderer(this)
    this.projectileRenderer = new ProjectileRenderer(this)
    this.effectsRenderer = new EffectsRenderer(this)
    this.directorLanePreviewRenderer = new DirectorLanePreviewRenderer(this)
    this.routeGuideRenderer = new RouteGuideRenderer(this)
    this.placementPreviewRenderer = new PlacementPreviewRenderer(this, this.world)

    this.unsubscribeCommands = gameBridge.onCommand((command) => {
      this.engine.dispatch(command)

      if (command.type === 'resetRun') {
        this.clearDynamicViews()
      }

      this.publishSnapshot()
    })

    this.publishSnapshot()

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeCommands?.()
      this.unsubscribeCommands = undefined
      this.lawnInput?.destroy()
      this.directorLanePreviewRenderer?.destroy()
      this.routeGuideRenderer?.destroy()
      this.placementPreviewRenderer?.destroy()
      this.clearDynamicViews()
    })
  }

  update(time: number, delta: number) {
    this.engine.step(delta / 1000)

    this.plantRenderer.sync(this.engine.state.plants)
    this.zombieRenderer.sync(this.engine.state.zombies, this.engine.state.time)
    this.projectileRenderer.sync(this.engine.state.projectiles)
    this.syncDirectorLanePreview()
    this.syncRouteGuides()
    this.syncPlacementPreview()
    const effectContext = {
      plants: this.engine.state.plants,
      zombies: this.engine.state.zombies,
      activeCardEffects: this.engine.state.activeCardEffects,
      time: this.engine.state.time,
      plantRenderer: this.plantRenderer,
      zombieRenderer: this.zombieRenderer
    }
    this.effectsRenderer.handleEvents(this.engine.drainEvents(), effectContext)
    this.effectsRenderer.update(effectContext)

    // React does not need per-frame updates; throttle HUD snapshots to reduce rerenders.
    if (time - this.lastSnapshotAt > 120) {
      this.publishSnapshot()
      this.lastSnapshotAt = time
    }
  }

  private publishSnapshot() {
    this.syncDirectorLanePreview()
    this.syncRouteGuides()
    gameBridge.publishSnapshot(this.engine.getSnapshot())
  }

  private syncDirectorLanePreview() {
    this.directorLanePreviewRenderer.sync({
      phase: this.engine.state.phase,
      params: this.engine.state.directorPlan?.params,
      threatLevel: this.engine.state.directorPlan?.preview.threatLevel,
      timeMs: this.time.now
    })
  }

  private syncRouteGuides() {
    this.routeGuideRenderer.sync({
      phase: this.engine.state.phase,
      groups: this.engine.state.wave.groups,
      waveIndex: this.engine.state.waveIndex,
      timeMs: this.time.now
    })
  }

  private syncPlacementPreview() {
    const { selectedPlantType, selectedPlantMode, plants, phase, sun } = this.engine.state
    const interactive = phase !== 'card_select' && phase !== 'won' && phase !== 'lost'
    const hoveredCell = this.hoveredCell
    const occupied = hoveredCell ? plants.some((plant) => plant.row === hoveredCell.row && plant.col === hoveredCell.col) : false
    const canAfford = selectedPlantType ? sun >= this.world.buildingDefinitions[selectedPlantType].cost : false

    this.placementPreviewRenderer.sync({
      hoveredCell,
      selectedPlantType,
      selectedPlantMode,
      canAfford,
      occupied,
      interactive
    })
  }

  private clearDynamicViews() {
    this.plantRenderer?.clear()
    this.zombieRenderer?.clear()
    this.projectileRenderer?.clear()
  }
}
