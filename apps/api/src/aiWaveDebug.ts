import type { AiWaveDebugSnapshot } from '@tower-rogue/shared'

let latestAiWaveDebug: AiWaveDebugSnapshot | null = null

export function getLatestAiWaveDebug() {
  return latestAiWaveDebug
}

export function setLatestAiWaveDebug(snapshot: AiWaveDebugSnapshot) {
  latestAiWaveDebug = snapshot
  return latestAiWaveDebug
}

export function updateLatestAiWaveDebug(
  updater: (current: AiWaveDebugSnapshot | null) => AiWaveDebugSnapshot | null
) {
  latestAiWaveDebug = updater(latestAiWaveDebug)
  return latestAiWaveDebug
}
