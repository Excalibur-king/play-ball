import { placePlant, startWave } from './commands'
import { clampDirectorAdjustment } from './director'
import { getHudSnapshot } from './selectors'
import { createInitialState } from './state'
import { updateSeedCooldowns } from './systems/cooldowns'
import { updatePlants } from './systems/plants'
import { updateProjectiles } from './systems/projectiles'
import { updateSunEconomy } from './systems/sunEconomy'
import { checkWaveEnd, updateWave } from './systems/waves'
import { updateZombies } from './systems/zombies'
import type { GameCommand, GameEvent, GameState, HudSnapshot } from './types'

// GameEngine is the facade used by Phaser. Internally it delegates to small
// systems so rule changes can be owned by different teammates without editing
// the renderer or one giant update loop.
export class GameEngine {
  state: GameState
  private events: GameEvent[] = []

  constructor() {
    this.state = createInitialState()
  }

  dispatch(command: GameCommand) {
    if (command.type === 'resetRun') {
      this.state = createInitialState()
      this.events = []
      return
    }

    if (command.type === 'setPaused') {
      this.state.paused = command.paused
      return
    }

    if (command.type === 'applyDirectorAdjustment') {
      this.state.director = clampDirectorAdjustment(command.adjustment)
      return
    }

    if (this.state.phase === 'lost' || this.state.phase === 'won') {
      return
    }

    if (command.type === 'selectPlant') {
      this.state.selectedPlantType = command.plantType
      return
    }

    if (command.type === 'placePlant') {
      placePlant(this.state, command.row, command.col, this.events)
      return
    }

    if (command.type === 'startWave') {
      startWave(this.state)
    }
  }

  step(dt: number) {
    if (this.state.paused || this.state.phase === 'won' || this.state.phase === 'lost') {
      return
    }

    this.state.time += dt
    updateSeedCooldowns(this.state, dt)
    updateSunEconomy(this.state, dt, this.events)
    updatePlants(this.state, dt, this.events)
    updateProjectiles(this.state, dt, this.events)
    updateZombies(this.state, dt, this.events)

    if (this.state.phase === 'playing') {
      updateWave(this.state, dt)
      checkWaveEnd(this.state, this.events)
    }
  }

  drainEvents() {
    const drained = this.events
    this.events = []
    return drained
  }

  getSnapshot(): HudSnapshot {
    return getHudSnapshot(this.state)
  }
}
