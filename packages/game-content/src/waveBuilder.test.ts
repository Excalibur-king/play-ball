import { describe, expect, it } from 'vitest'
import { buildWave, phaseWave } from '../balance/waveBuilder.js'

describe('wave builder authoring helpers', () => {
  it('builds a wave from ordered phases and keeps the output flat for runtime consumers', () => {
    const wave = buildWave({
      id: 'test_wave',
      mapId: 'volcano',
      index: 2,
      durationSeconds: 40,
      directorReserveBudget: 4,
      rewardPurchasePower: 80,
      pressureGoal: 'test pressure',
      nextWaveHint: 'test hint',
      aiDirectorAllowed: true,
      status: 'draft',
      phases: [
        phaseWave(
          12,
          [
            { enemyId: 'spark_runner', count: 2, route: 'center', interval: 2.4 },
            { enemyId: 'ember_grunt', count: 1, route: 'left', interval: 3, startOffset: 4 }
          ],
          { stepSeconds: 1.5 }
        ),
        phaseWave(3, { enemyId: 'ember_grunt', count: 5, route: 'center', interval: 2.9 })
      ]
    })

    expect(wave.enemyGroups).toEqual([
      { enemyId: 'ember_grunt', count: 5, route: 'center', startSecond: 3, interval: 2.9 },
      { enemyId: 'spark_runner', count: 2, route: 'center', startSecond: 12, interval: 2.4 },
      { enemyId: 'ember_grunt', count: 1, route: 'left', startSecond: 17.5, interval: 3 }
    ])
    expect(wave.phases).toEqual([
      {
        id: 'test_wave_phase_01',
        label: '阶段 1',
        startSecond: 3,
        endSecond: 12
      },
      {
        id: 'test_wave_phase_02',
        label: '阶段 2',
        startSecond: 12,
        endSecond: 40
      }
    ])
  })

  it('rejects negative phase timing inputs early for content authors', () => {
    expect(() =>
      phaseWave(4, { enemyId: 'ember_grunt', count: 1, route: 'center', interval: 2, startOffset: -1 })
    ).toThrow('phaseWave.groups[0].startOffset must be a non-negative finite number.')
  })
})
