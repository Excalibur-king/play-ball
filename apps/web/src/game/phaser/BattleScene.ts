import { GameEngine, getWorldDefinition } from '@tower-rogue/game-core'
import Phaser from 'phaser'
import { gameBridge } from '../bridge/gameBridge'
import { LawnInput } from './input/LawnInput'
import { EffectsRenderer } from './renderers/EffectsRenderer'
import { LawnRenderer } from './renderers/LawnRenderer'
import { PlantRenderer } from './renderers/PlantRenderer'
import { ProjectileRenderer } from './renderers/ProjectileRenderer'
import { ZombieRenderer } from './renderers/ZombieRenderer'

const world = getWorldDefinition()

// BattleScene is deliberately thin:
// it owns Phaser lifecycle, wires game-core to renderers, and publishes HUD snapshots.
// Gameplay rules belong in game-core; visual details belong in renderer classes.
export class BattleScene extends Phaser.Scene {
  private readonly engine = new GameEngine()
  private unsubscribeCommands: (() => void) | undefined
  private lawnInput: LawnInput | undefined
  private plantRenderer!: PlantRenderer
  private zombieRenderer!: ZombieRenderer
  private projectileRenderer!: ProjectileRenderer
  private effectsRenderer!: EffectsRenderer
  private lastSnapshotAt = 0

  constructor() {
    super('battle')
  }

  create() {
    this.cameras.main.setBackgroundColor('#8fd4ff')
    new LawnRenderer(this, world).draw()

    this.lawnInput = new LawnInput(this, world, (row, col) => {
      gameBridge.dispatch({ type: 'placePlant', row, col })
    })
    this.lawnInput.create()

    this.plantRenderer = new PlantRenderer(this)
    this.zombieRenderer = new ZombieRenderer(this)
    this.projectileRenderer = new ProjectileRenderer(this)
    this.effectsRenderer = new EffectsRenderer(this)

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
      this.clearDynamicViews()
    })
  }

  update(time: number, delta: number) {
    this.engine.step(delta / 1000)

    this.plantRenderer.sync(this.engine.state.plants)
    this.zombieRenderer.sync(this.engine.state.zombies, this.engine.state.time)
    this.projectileRenderer.sync(this.engine.state.projectiles)
    this.effectsRenderer.handleEvents(this.engine.drainEvents(), {
      plants: this.engine.state.plants,
      plantRenderer: this.plantRenderer,
      zombieRenderer: this.zombieRenderer
    })

    // React does not need per-frame updates; throttle HUD snapshots to reduce rerenders.
    if (time - this.lastSnapshotAt > 120) {
      this.publishSnapshot()
      this.lastSnapshotAt = time
    }
  }

  private publishSnapshot() {
    gameBridge.publishSnapshot(this.engine.getSnapshot())
  }

  private clearDynamicViews() {
    this.plantRenderer?.clear()
    this.zombieRenderer?.clear()
    this.projectileRenderer?.clear()
  }
}
