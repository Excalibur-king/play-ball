import type { GameplayConfigDef } from './types.js'
import { combatBalance } from './combatBalance.js'

export const gameplay = {
  combatBalance,
  activeStrategyDraw: {
    cost: 60,
    cooldownSeconds: 30
  },
  runLoop: {
    initialReadySeconds: 10,
    postCardReadySeconds: 6,
    waveCardSelectSeconds: 8
  }
} as const satisfies GameplayConfigDef
