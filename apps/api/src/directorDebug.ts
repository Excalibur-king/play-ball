import type { DirectorDebugSnapshot } from '@tower-rogue/shared'

let latestDirectorDebug: DirectorDebugSnapshot | null = null

export function getLatestDirectorDebug() {
  return latestDirectorDebug
}

export function setLatestDirectorDebug(snapshot: DirectorDebugSnapshot) {
  latestDirectorDebug = snapshot
  return latestDirectorDebug
}

export function updateLatestDirectorDebug(
  updater: (current: DirectorDebugSnapshot | null) => DirectorDebugSnapshot | null
) {
  latestDirectorDebug = updater(latestDirectorDebug)
  return latestDirectorDebug
}
