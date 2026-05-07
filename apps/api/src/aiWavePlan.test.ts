import { getLevelWaveDefinitions } from '@tower-rogue/game-content'
import { describe, expect, it } from 'vitest'
import { extractJsonObject, normalizeModelAiWavePlan, normalizeRealtimeAiIntent, parseAiWavePlanResponse } from './aiWavePlan.js'

describe('AI wave plan parsing', () => {
  it('parses fenced JSON into a compiled plan', () => {
    const nextWave = getLevelWaveDefinitions('volcano_frontier')[1]

    expect(nextWave).toBeDefined()

    const parsed = parseAiWavePlanResponse({
      content: [
        '```json',
        JSON.stringify({
          pressureGoal: '中路常规压住，再插入右路快怪抢节奏。',
          nextWaveHint: '先看中路，再防右路提速。',
          phases: [
            {
              label: '中路起压',
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
              label: '右路插速',
              startSecond: 12,
              directives: [
                {
                  kind: 'role',
                  role: 'fast',
                  route: 'right',
                  budgetUnits: 4,
                  cadence: 'dense'
                }
              ]
            }
          ]
        }),
        '```'
      ].join('\n'),
      levelId: 'volcano_frontier',
      targetWaveIndex: 1,
      nextWave: nextWave!
    })

    expect(parsed.plan.phases).toHaveLength(2)
    expect(parsed.compileResult.groups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          enemyId: 'ember_grunt',
          count: 5
        }),
        expect.objectContaining({
          enemyId: 'spark_runner',
          count: 2
        })
      ])
    )
  })

  it('extracts plain JSON and normalizes null optionals away', () => {
    const content = JSON.stringify({
      pressureGoal: '整波稳压',
      nextWaveHint: '空字段会被归一化。',
      phases: [
        {
          label: '首段',
          description: null,
          startSecond: 0.04,
          directives: [
            {
              kind: 'enemy',
              enemyId: 'ember_grunt',
              route: 'center',
              count: 5,
              cadence: 'steady',
              startOffset: null
            }
          ]
        }
      ]
    })

    const normalized = normalizeModelAiWavePlan(extractJsonObject(content))

    expect(normalized.phases[0]?.description).toBeUndefined()
    expect(normalized.phases[0]?.startSecond).toBe(0)
    expect(normalized.phases[0]?.directives[0]).toEqual(
      expect.objectContaining({
        kind: 'enemy',
        enemyId: 'ember_grunt',
        startOffset: undefined
      })
    )
  })

  it('parses lightweight realtime AI intent', () => {
    const intent = normalizeRealtimeAiIntent({
      rows: [5, '3', 5],
      roles: ['fast', 'flying'],
      intensity: '2',
      cadence: 'dense'
    })

    expect(intent).toEqual({
      rows: [5, 3, 5],
      roles: ['fast', 'flying'],
      intensity: 2,
      cadence: 'dense'
    })
  })

  it('rejects invalid schema and boss semantics', () => {
    const bossWave = getLevelWaveDefinitions('volcano_frontier')[4]

    expect(bossWave).toBeDefined()

    expect(() =>
      parseAiWavePlanResponse({
        content: '{"pressureGoal":"bad","nextWaveHint":"bad","phases":[]}',
        levelId: 'volcano_frontier',
        targetWaveIndex: 4,
        nextWave: bossWave!
      })
    ).toThrow()

    expect(() =>
      parseAiWavePlanResponse({
        content: JSON.stringify({
          pressureGoal: '少了 Boss',
          nextWaveHint: '非法 Boss 波',
          phases: [
            {
              label: '侧翼试探',
              startSecond: 0,
              directives: [
                {
                  kind: 'enemy',
                  enemyId: 'ember_grunt',
                  route: 'left',
                  count: 6,
                  cadence: 'steady'
                }
              ]
            }
          ]
        }),
        levelId: 'volcano_frontier',
        targetWaveIndex: 4,
        nextWave: bossWave!
      })
    ).toThrow('exactly one')
  })
})
