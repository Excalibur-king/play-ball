import { getLevelEnemyDefinitions, getLevelWaveDefinitions } from '@tower-rogue/game-content'
import { describe, expect, it } from 'vitest'
import { calculateWaveDirectorCost, compileAiWavePlan } from './aiWave'

describe('compileAiWavePlan', () => {
  it('compiles role directives into concrete groups with cadence-based intervals', () => {
    const nextWave = getLevelWaveDefinitions('volcano_frontier')[1]
    const enemyDefinitions = getLevelEnemyDefinitions('volcano_frontier')

    expect(nextWave).toBeDefined()

    const compiled = compileAiWavePlan(
      {
        pressureGoal: '中路稳压，再插右路快怪。',
        nextWaveHint: '右路会突然提速。',
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
      },
      {
        levelId: 'volcano_frontier',
        targetWaveIndex: 1,
        nextWave: nextWave!,
        baseWaveCost: calculateWaveDirectorCost(nextWave!, enemyDefinitions)
      }
    )

    expect(compiled.groups).toEqual([
      {
        enemyId: 'ember_grunt',
        count: 5,
        route: 'center',
        startSecond: 2,
        interval: 2.4
      },
      {
        enemyId: 'spark_runner',
        count: 2,
        route: 'right',
        startSecond: 12,
        interval: 1.6
      }
    ])
    expect(compiled.preview.tags).toEqual(expect.arrayContaining(['中右双路', '常规', '2段']))
  })

  it('rejects plans outside the authored budget envelope', () => {
    const nextWave = getLevelWaveDefinitions('volcano_frontier')[1]
    const enemyDefinitions = getLevelEnemyDefinitions('volcano_frontier')

    expect(() =>
      compileAiWavePlan(
        {
          pressureGoal: '预算过低',
          nextWaveHint: '不应通过。',
          phases: [
            {
              label: '单段',
              startSecond: 0,
              directives: [
                {
                  kind: 'role',
                  role: 'normal',
                  route: 'center',
                  budgetUnits: 5,
                  cadence: 'steady'
                }
              ]
            }
          ]
        },
        {
          levelId: 'volcano_frontier',
          targetWaveIndex: 1,
          nextWave: nextWave!,
          baseWaveCost: calculateWaveDirectorCost(nextWave!, enemyDefinitions)
        }
      )
    ).toThrow('outside the allowed envelope')
  })

  it('requires an explicit boss enemy on boss waves', () => {
    const bossWave = getLevelWaveDefinitions('volcano_frontier')[4]
    const enemyDefinitions = getLevelEnemyDefinitions('volcano_frontier')

    expect(() =>
      compileAiWavePlan(
        {
          pressureGoal: '缺少 Boss',
          nextWaveHint: '非法。',
          phases: [
            {
              label: '侧翼小压',
              startSecond: 0,
              directives: [
                {
                  kind: 'enemy',
                  enemyId: 'ember_grunt',
                  route: 'left',
                  count: 6,
                  cadence: 'steady'
                },
                {
                  kind: 'enemy',
                  enemyId: 'basalt_smasher',
                  route: 'center',
                  count: 4,
                  cadence: 'steady'
                },
                {
                  kind: 'enemy',
                  enemyId: 'ash_wing',
                  route: 'right',
                  count: 5,
                  cadence: 'steady'
                }
              ]
            }
          ]
        },
        {
          levelId: 'volcano_frontier',
          targetWaveIndex: 4,
          nextWave: bossWave!,
          baseWaveCost: calculateWaveDirectorCost(bossWave!, enemyDefinitions),
          bossId: bossWave!.bossId
        }
      )
    ).toThrow('exactly one')
  })

  it('accepts boss waves with one explicit boss plus side pressure', () => {
    const bossWave = getLevelWaveDefinitions('volcano_frontier')[4]
    const enemyDefinitions = getLevelEnemyDefinitions('volcano_frontier')

    const compiled = compileAiWavePlan(
      {
        pressureGoal: 'Boss 顶中路，侧翼继续给压力。',
        nextWaveHint: '中路扛 Boss，右路记得补对空。',
        phases: [
          {
            label: '侧翼预热',
            startSecond: 0,
            directives: [
              {
                kind: 'enemy',
                enemyId: 'ember_grunt',
                route: 'left',
                count: 6,
                cadence: 'steady',
                startOffset: 2
              }
            ]
          },
          {
            label: 'Boss 入场',
            startSecond: 8,
            directives: [
              {
                kind: 'enemy',
                enemyId: 'volcano_core_beast',
                route: 'center',
                count: 1,
                cadence: 'steady'
              }
            ]
          },
          {
            label: '后段夹压',
            startSecond: 15,
            directives: [
              {
                kind: 'enemy',
                enemyId: 'basalt_smasher',
                route: 'center',
                count: 4,
                cadence: 'steady'
              },
              {
                kind: 'enemy',
                enemyId: 'ash_wing',
                route: 'right',
                count: 5,
                cadence: 'steady',
                startOffset: 5
              }
            ]
          }
        ]
      },
      {
        levelId: 'volcano_frontier',
        targetWaveIndex: 4,
        nextWave: bossWave!,
        baseWaveCost: calculateWaveDirectorCost(bossWave!, enemyDefinitions),
        bossId: bossWave!.bossId
      }
    )

    expect(compiled.groups.some((group) => group.enemyId === 'volcano_core_beast' && group.count === 1)).toBe(true)
    expect(compiled.preview.threatLevel).toBe('critical')
  })
})
