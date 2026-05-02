import type { HiddenDirectorAdjustment } from './types'

// The hidden director can tune pacing, but hard clamps keep it from silently
// rewriting balance or creating impossible waves.
export function clampDirectorAdjustment(adjustment: HiddenDirectorAdjustment): HiddenDirectorAdjustment {
  return {
    spawnIntervalMultiplier: clamp(adjustment.spawnIntervalMultiplier, 0.75, 1.25),
    zombieHpMultiplier: clamp(adjustment.zombieHpMultiplier, 0.85, 1.2),
    sunDripMultiplier: clamp(adjustment.sunDripMultiplier, 0.85, 1.25)
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
