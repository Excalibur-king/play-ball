import { defaultLevelId, type LevelId, type StrategyCardId } from '@tower-rogue/game-content'
import {
  clearSelectedBuilding,
  drawStrategyCards,
  applyRealtimeDirectorFallback,
  hydrateAiWavePlan,
  hydrateDirectorDecisionParams,
  hydrateRealtimeAiWavePlan,
  hydrateStrategyRecommendations,
  placeBuilding,
  placePlant,
  setSelectedBuildingMode,
  selectStrategyCard,
  setSkillLoadout,
  startWave,
  upgradeBuilding,
  useSkillCard
} from './commands'
import { clampDirectorAdjustment } from './director'
import { getHudSnapshot } from './selectors'
import { createInitialState } from './state'
import { updateSeedCooldowns } from './systems/cooldowns'
import { updatePendingSkillEffects } from './systems/cards'
import { updatePlants } from './systems/plants'
import { updateProjectiles } from './systems/projectiles'
import { updateRunFlow } from './systems/runFlow'
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

  constructor(
    levelId: LevelId = defaultLevelId,
    skillLoadout?: StrategyCardId[],
    skillLevels: Partial<Record<StrategyCardId, number>> = {}
  ) {
    this.state = createInitialState(levelId)
    this.state.skillLevels = sanitizeSkillLevels(skillLevels)

    if (skillLoadout) {
      setSkillLoadout(this.state, skillLoadout)
    }
  }

  dispatch(command: GameCommand) {
    if (command.type === 'resetRun') {
      const skillLoadout = this.state.skillLoadout
      const skillLevels = this.state.skillLevels
      this.state = createInitialState(this.state.levelId)
      this.state.skillLevels = skillLevels
      setSkillLoadout(this.state, skillLoadout)
      this.events = []
      return
    }

    if (command.type === 'setPaused') {
      this.state.paused = command.paused
      return
    }

    if (command.type === 'applyDirectorAdjustment') {
      this.state.pendingDirectorAdjustment = clampDirectorAdjustment(command.adjustment)
      return
    }

    if (command.type === 'clearSelectedPlant') {
      clearSelectedBuilding(this.state)
      return
    }

    if (this.state.phase === 'lost' || this.state.phase === 'won') {
      return
    }

    if (command.type === 'selectPlant') {
      setSelectedBuildingMode(this.state, command.plantType, command.mode)
      return
    }

    if (command.type === 'selectBuilding') {
      setSelectedBuildingMode(this.state, command.buildingId, command.mode)
      return
    }

    if (command.type === 'placePlant') {
      placePlant(this.state, command.row, command.col, this.events, command.keepSelected)
      return
    }

    if (command.type === 'placeBuilding') {
      placeBuilding(this.state, command.row, command.col, this.events, command.keepSelected)
      return
    }

    if (command.type === 'upgradeBuilding') {
      upgradeBuilding(this.state, command.buildingId, this.events)
      return
    }

    if (command.type === 'selectStrategyCard') {
      selectStrategyCard(this.state, command.cardId, this.events)
      return
    }

    if (command.type === 'setSkillLoadout') {
      setSkillLoadout(this.state, command.cardIds)
      return
    }

    if (command.type === 'useSkillCard') {
      useSkillCard(this.state, command.cardId, this.events)
      return
    }

    if (command.type === 'startWave') {
      startWave(this.state, this.events)
      return
    }

    if (command.type === 'drawStrategyCards') {
      drawStrategyCards(this.state, this.events)
      return
    }

    if (command.type === 'hydrateStrategyRecommendations') {
      hydrateStrategyRecommendations(this.state, command.recommendations)
      return
    }

    if (command.type === 'hydrateAiWavePlan') {
      hydrateAiWavePlan(this.state, {
        clearedWave: command.clearedWave,
        plan: command.plan
      })
      return
    }

    if (command.type === 'hydrateRealtimeAiWavePlan') {
      hydrateRealtimeAiWavePlan(this.state, {
        wave: command.wave,
        plan: command.plan
      }, this.events)
      return
    }

    if (command.type === 'applyRealtimeDirectorFallback') {
      applyRealtimeDirectorFallback(this.state, {
        wave: command.wave
      })
      return
    }

    if (command.type === 'hydrateDirectorDecisionParams') {
      hydrateDirectorDecisionParams(this.state, {
        clearedWave: command.clearedWave,
        params: command.params
      })
      return
    }
  }

  step(dt: number) {
    if (this.state.paused || this.state.phase === 'won' || this.state.phase === 'lost') {
      return
    }

    this.state.time += dt
    updateSeedCooldowns(this.state, dt)
    updatePendingSkillEffects(this.state, this.events)
    updateSunEconomy(this.state, dt, this.events)
    updatePlants(this.state, dt, this.events)
    updateProjectiles(this.state, dt, this.events)
    updateZombies(this.state, dt, this.events)

    if (this.state.phase === 'playing') {
      updateWave(this.state, dt, this.events)
      checkWaveEnd(this.state, this.events)
    }

    updateRunFlow(this.state, this.events)
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

function sanitizeSkillLevels(skillLevels: Partial<Record<StrategyCardId, number>>) {
  return Object.fromEntries(
    Object.entries(skillLevels).map(([cardId, level]) => [
      cardId,
      Math.max(0, Math.min(100, Math.floor(Number(level) || 0)))
    ])
  ) as Partial<Record<StrategyCardId, number>>
}
