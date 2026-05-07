import gameplayConfig from '@tower-rogue/game-content/generated/gameplay.json'
import type { GameState } from './types'

export const INITIAL_READY_COUNTDOWN_SECONDS = gameplayConfig.runLoop.initialReadySeconds
export const POST_CARD_READY_COUNTDOWN_SECONDS = gameplayConfig.runLoop.postCardReadySeconds
export const WAVE_CLEARED_CARD_SELECTION_SECONDS = gameplayConfig.runLoop.waveCardSelectSeconds

export function scheduleReadyCountdown(state: Pick<GameState, 'time' | 'waveIndex' | 'readyAutoStartAt'>) {
  state.readyAutoStartAt = state.time + getReadyCountdownDuration(state.waveIndex)
}

export function clearReadyCountdown(state: Pick<GameState, 'readyAutoStartAt'>) {
  state.readyAutoStartAt = undefined
}

export function scheduleWaveClearedCardSelectionCountdown(
  state: Pick<GameState, 'time' | 'cardSelectionAutoPickAt'>
) {
  state.cardSelectionAutoPickAt = state.time + WAVE_CLEARED_CARD_SELECTION_SECONDS
}

export function clearCardSelectionCountdown(state: Pick<GameState, 'cardSelectionAutoPickAt'>) {
  state.cardSelectionAutoPickAt = undefined
}

export function getCountdownRemaining(triggerAt: number | undefined, time: number) {
  return triggerAt === undefined ? 0 : Math.max(0, triggerAt - time)
}

function getReadyCountdownDuration(waveIndex: number) {
  return waveIndex === 0 ? INITIAL_READY_COUNTDOWN_SECONDS : POST_CARD_READY_COUNTDOWN_SECONDS
}
