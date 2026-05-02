import type { HudSnapshot } from '@tower-rogue/game-core'
import { create } from 'zustand'
import { gameBridge } from '../game/bridge/gameBridge'

type GameUiState = {
  snapshot: HudSnapshot | null
  connectBridge: () => () => void
}

export const useGameUiStore = create<GameUiState>((set) => ({
  snapshot: null,
  connectBridge: () =>
    gameBridge.subscribeSnapshot((snapshot) => {
      set({ snapshot })
    })
}))
