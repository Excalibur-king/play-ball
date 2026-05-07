import { describe, expect, it } from 'vitest'
import { AiWavePlanSchema } from './index'

describe('AiWavePlanSchema', () => {
  it('accepts legal role and enemy directives', () => {
    const parsed = AiWavePlanSchema.parse({
      pressureGoal: '先稳中路，再插右路快压。',
      nextWaveHint: '右路会在后段突然提速。',
      phases: [
        {
          label: '中路稳压',
          startSecond: 0,
          directives: [
            {
              kind: 'role',
              role: 'normal',
              route: 'center',
              budgetUnits: 5,
              cadence: 'steady',
              startOffset: 2
            }
          ]
        },
        {
          label: '右路提速',
          startSecond: 12,
          directives: [
            {
              kind: 'enemy',
              enemyId: 'spark_runner',
              route: 'right',
              count: 3,
              cadence: 'dense'
            }
          ]
        }
      ]
    })

    expect(parsed.phases).toHaveLength(2)
    expect(parsed.phases[0]?.directives[0]).toMatchObject({
      kind: 'role',
      role: 'normal'
    })
    expect(parsed.phases[1]?.directives[0]).toMatchObject({
      kind: 'enemy',
      enemyId: 'spark_runner'
    })
  })

  it('rejects invalid enums and empty phases', () => {
    expect(() =>
      AiWavePlanSchema.parse({
        pressureGoal: '非法枚举',
        nextWaveHint: '非法枚举',
        phases: [
          {
            label: '错误段落',
            startSecond: 0,
            directives: [
              {
                kind: 'role',
                role: 'boss',
                route: 'center',
                budgetUnits: 1,
                cadence: 'steady'
              }
            ]
          }
        ]
      })
    ).toThrow()

    expect(() =>
      AiWavePlanSchema.parse({
        pressureGoal: '空 phases',
        nextWaveHint: '空 phases',
        phases: []
      })
    ).toThrow()
  })
})
