import { enemyDefinitions, getLevelWaveDefinitions, type EnemyId } from './index'
import { describe, expect, it } from 'vitest'

describe('volcano wave progression', () => {
  const waves = getLevelWaveDefinitions('volcano_frontier')

  it('keeps the first wave to two explicit lanes so openings build multi-lane awareness without going full-map', () => {
    expect(waves[0]).toBeDefined()
    expect(waves[0]?.enemyGroups.every((group) => group.route !== 'mixed')).toBe(true)
    expect(new Set(waves[0]?.enemyGroups.map((group) => group.route))).toEqual(new Set(['center', 'left']))
  })

  it('concentrates breaker pressure into explicit lanes instead of diluting it across mixed spawns', () => {
    const breakerWaves = waves.filter((wave) =>
      wave.enemyGroups.some((group) => enemyDefinitions[group.enemyId as EnemyId].role === 'heavy_attack')
    )

    expect(breakerWaves.length).toBeGreaterThan(0)

    for (const wave of breakerWaves) {
      const breakerGroups = wave.enemyGroups.filter((group) => enemyDefinitions[group.enemyId as EnemyId].role === 'heavy_attack')
      expect(breakerGroups.every((group) => group.route !== 'mixed')).toBe(true)
    }
  })

  it('switches late waves to lane-specific split pressure instead of full-map mixed swarms', () => {
    for (const wave of waves.slice(2)) {
      const routes = new Set(wave.enemyGroups.map((group) => group.route))

      expect(routes.has('mixed')).toBe(false)
      expect(routes.size).toBeGreaterThan(1)
    }
  })
})
