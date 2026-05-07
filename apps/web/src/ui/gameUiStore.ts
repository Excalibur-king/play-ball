import type { HudSnapshot } from '@tower-rogue/game-core'
import type {
  AiWaveDebugSnapshot,
  DirectorDebugSnapshot,
  StrategyAdviceDebugSnapshot,
  StrategyAdviceResponse
} from '@tower-rogue/shared'
import { create } from 'zustand'
import { gameBridge } from '../game/bridge/gameBridge'

type GameUiState = {
  snapshot: HudSnapshot | null
  battleAdvice: string
  battleAdviceLoading: boolean
  battleAdviceDurationMs?: number
  aiWaveDebug: AiWaveDebugSnapshot | null
  aiWaveDebugLoading: boolean
  directorDebug: DirectorDebugSnapshot | null
  directorDebugLoading: boolean
  strategyAdviceDebug: StrategyAdviceDebugSnapshot | null
  strategyAdviceDebugLoading: boolean
  strategyAdvice: StrategyAdviceResponse | null
  strategyAdviceLoading: boolean
  clearBattleAdvice: () => void
  clearDirectorDebug: () => void
  clearStrategyAdvice: () => void
  appendBattleAdvice: (chunk: string) => void
  connectBridge: () => () => void
  resetBattleUi: () => void
  setBattleAdvice: (battleAdvice: string) => void
  setBattleAdviceDurationMs: (battleAdviceDurationMs?: number) => void
  setBattleAdviceLoading: (battleAdviceLoading: boolean) => void
  setAiWaveDebug: (aiWaveDebug: AiWaveDebugSnapshot | null) => void
  setAiWaveDebugLoading: (aiWaveDebugLoading: boolean) => void
  setDirectorDebug: (directorDebug: DirectorDebugSnapshot | null) => void
  setDirectorDebugLoading: (directorDebugLoading: boolean) => void
  setStrategyAdviceDebug: (strategyAdviceDebug: StrategyAdviceDebugSnapshot | null) => void
  setStrategyAdviceDebugLoading: (strategyAdviceDebugLoading: boolean) => void
  setStrategyAdvice: (strategyAdvice: StrategyAdviceResponse | null) => void
  setStrategyAdviceLoading: (strategyAdviceLoading: boolean) => void
}

export const useGameUiStore = create<GameUiState>((set) => ({
  snapshot: null,
  battleAdvice: '',
  battleAdviceLoading: false,
  battleAdviceDurationMs: undefined,
  aiWaveDebug: null,
  aiWaveDebugLoading: false,
  directorDebug: null,
  directorDebugLoading: false,
  strategyAdviceDebug: null,
  strategyAdviceDebugLoading: false,
  strategyAdvice: null,
  strategyAdviceLoading: false,
  clearBattleAdvice: () =>
    set({
      battleAdvice: '',
      battleAdviceLoading: false,
      battleAdviceDurationMs: undefined
    }),
  clearDirectorDebug: () =>
    set({
      aiWaveDebug: null,
      aiWaveDebugLoading: false,
      directorDebug: null,
      directorDebugLoading: false
    }),
  clearStrategyAdvice: () =>
    set({
      strategyAdvice: null,
      strategyAdviceLoading: false,
      strategyAdviceDebug: null,
      strategyAdviceDebugLoading: false
    }),
  appendBattleAdvice: (chunk) => set((state) => ({ battleAdvice: `${state.battleAdvice}${chunk}` })),
  connectBridge: () =>
    gameBridge.subscribeSnapshot((snapshot) => {
      set({ snapshot })
    }),
  resetBattleUi: () =>
    set({
      snapshot: null,
      battleAdvice: '',
      battleAdviceLoading: false,
      battleAdviceDurationMs: undefined,
      aiWaveDebug: null,
      aiWaveDebugLoading: false,
      directorDebug: null,
      directorDebugLoading: false,
      strategyAdvice: null,
      strategyAdviceLoading: false,
      strategyAdviceDebug: null,
      strategyAdviceDebugLoading: false
    }),
  setBattleAdvice: (battleAdvice) => set({ battleAdvice }),
  setBattleAdviceDurationMs: (battleAdviceDurationMs) => set({ battleAdviceDurationMs }),
  setBattleAdviceLoading: (battleAdviceLoading) => set({ battleAdviceLoading }),
  setAiWaveDebug: (aiWaveDebug) => set({ aiWaveDebug }),
  setAiWaveDebugLoading: (aiWaveDebugLoading) => set({ aiWaveDebugLoading }),
  setDirectorDebug: (directorDebug) => set({ directorDebug }),
  setDirectorDebugLoading: (directorDebugLoading) => set({ directorDebugLoading }),
  setStrategyAdviceDebug: (strategyAdviceDebug) => set({ strategyAdviceDebug }),
  setStrategyAdviceDebugLoading: (strategyAdviceDebugLoading) => set({ strategyAdviceDebugLoading }),
  setStrategyAdvice: (strategyAdvice) => set({ strategyAdvice }),
  setStrategyAdviceLoading: (strategyAdviceLoading) => set({ strategyAdviceLoading })
}))
