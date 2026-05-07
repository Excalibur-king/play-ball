import gameplayConfig from '@tower-rogue/game-content/generated/gameplay.json'
import type { GameState } from './types'

export const ACTIVE_STRATEGY_CARD_DRAW_COST = gameplayConfig.activeStrategyDraw.cost
export const ACTIVE_STRATEGY_CARD_DRAW_COOLDOWN = gameplayConfig.activeStrategyDraw.cooldownSeconds

export type StrategyCardDrawBlockReason = 'card-select' | 'not-playing' | 'insufficient-power' | 'cooldown'

export type StrategyCardDrawAvailability = {
  canDraw: boolean
  cost: number
  cooldownRemaining: number
  reason?: StrategyCardDrawBlockReason
}

export function getStrategyCardDrawAvailability(
  state: Pick<GameState, 'phase' | 'sun' | 'time' | 'nextStrategyCardDrawAt'>
): StrategyCardDrawAvailability {
  const cooldownRemaining = Math.max(0, state.nextStrategyCardDrawAt - state.time)

  if (state.phase === 'card_select') {
    return {
      canDraw: false,
      cost: ACTIVE_STRATEGY_CARD_DRAW_COST,
      cooldownRemaining,
      reason: 'card-select'
    }
  }

  if (state.phase !== 'playing') {
    return {
      canDraw: false,
      cost: ACTIVE_STRATEGY_CARD_DRAW_COST,
      cooldownRemaining,
      reason: 'not-playing'
    }
  }

  if (state.sun < ACTIVE_STRATEGY_CARD_DRAW_COST) {
    return {
      canDraw: false,
      cost: ACTIVE_STRATEGY_CARD_DRAW_COST,
      cooldownRemaining,
      reason: 'insufficient-power'
    }
  }

  if (cooldownRemaining > 0) {
    return {
      canDraw: false,
      cost: ACTIVE_STRATEGY_CARD_DRAW_COST,
      cooldownRemaining,
      reason: 'cooldown'
    }
  }

  return {
    canDraw: true,
    cost: ACTIVE_STRATEGY_CARD_DRAW_COST,
    cooldownRemaining
  }
}

export function getStrategyCardDrawDisabledReason(availability: StrategyCardDrawAvailability) {
  if (availability.reason === 'card-select') {
    return 'Finish the current card choice first.'
  }

  if (availability.reason === 'not-playing') {
    return 'Active draw is only available during a wave.'
  }

  if (availability.reason === 'insufficient-power') {
    return `Need ${availability.cost} purchase power to trigger an active draw.`
  }

  if (availability.reason === 'cooldown') {
    return `Active draw is cooling down for ${Math.ceil(availability.cooldownRemaining)}s.`
  }

  return undefined
}
