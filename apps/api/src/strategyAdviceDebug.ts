import type { StrategyAdviceDebugSnapshot } from '@tower-rogue/shared'

let latestStrategyAdviceDebug: StrategyAdviceDebugSnapshot | null = null

export function getLatestStrategyAdviceDebug() {
  return latestStrategyAdviceDebug
}

export function setLatestStrategyAdviceDebug(snapshot: StrategyAdviceDebugSnapshot) {
  latestStrategyAdviceDebug = snapshot
  return latestStrategyAdviceDebug
}

export function updateLatestStrategyAdviceDebug(
  updater: (current: StrategyAdviceDebugSnapshot | null) => StrategyAdviceDebugSnapshot | null
) {
  latestStrategyAdviceDebug = updater(latestStrategyAdviceDebug)
  return latestStrategyAdviceDebug
}
