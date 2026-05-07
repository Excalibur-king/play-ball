import { getLevelWaveDefinitions } from '@tower-rogue/game-content'
import { describe, expect, it } from 'vitest'
import { buildDirectorPlanFromParams, buildDirectorPreviewText, createDirectorDecisionParams } from './director'
import type { BattleSnapshot } from './types'

describe('director param executor', () => {
  it('builds stable addedGroups from fake params', () => {
    const nextWave = getLevelWaveDefinitions('volcano_frontier')[3]

    expect(nextWave).toBeDefined()

    const snapshot: BattleSnapshot = {
      wave: 3,
      baseHp: 7,
      purchasePower: 80,
      leaksLastWave: 1,
      destroyedBuildingsLastWave: 0,
      buildingCounts: {
        energy: 2,
        attack: 3,
        defense: 1
      },
      outputProfile: {
        groundDamage: 58,
        flyingDamage: 42,
        attackCoverage: 3,
        blockCapacity: 160,
        energyIncome: 50
      },
      pressureProfile: {
        groundPressure: 12,
        flyingPressure: 5,
        fastPressure: 4,
        buildingDamagePressure: 2
      },
      lanePressure: [
        {
          lane: 0,
          leaksLastWave: 0,
          enemiesReachedFront: 0,
          destroyedBuildingsLastWave: 0,
          groundDps: 22,
          flyingDps: 22,
          blockHp: 180,
          economyValue: 25,
          pressureScore: 0.42
        },
        {
          lane: 1,
          leaksLastWave: 1,
          enemiesReachedFront: 1,
          destroyedBuildingsLastWave: 0,
          groundDps: 18,
          flyingDps: 18,
          blockHp: 90,
          economyValue: 0,
          pressureScore: 0.58
        },
        {
          lane: 2,
          leaksLastWave: 0,
          enemiesReachedFront: 0,
          destroyedBuildingsLastWave: 0,
          groundDps: 20,
          flyingDps: 12,
          blockHp: 0,
          economyValue: 25,
          pressureScore: 0.63
        },
        {
          lane: 3,
          leaksLastWave: 1,
          enemiesReachedFront: 1,
          destroyedBuildingsLastWave: 0,
          groundDps: 10,
          flyingDps: 0,
          blockHp: 0,
          economyValue: 0,
          pressureScore: 0.78
        },
        {
          lane: 4,
          leaksLastWave: 0,
          enemiesReachedFront: 0,
          destroyedBuildingsLastWave: 0,
          groundDps: 8,
          flyingDps: 0,
          blockHp: 0,
          economyValue: 0,
          pressureScore: 0.72
        }
      ],
      nextWavePreview: {
        normal: 8,
        fast: 4,
        heavyAttack: 0,
        flying: 5,
        hasBoss: false
      },
      problemTags: ['flying_pressure_high'],
      chosenCardTags: []
    }

    const plan = buildDirectorPlanFromParams({
      levelId: 'volcano_frontier',
      targetWaveIndex: 3,
      snapshot,
      nextWave: nextWave!,
      params: {
        intent: 'probe_anti_air',
        aggression: 0.75,
        primaryRoute: 'right',
        roleWeights: {
          normal: 0.2,
          fast: 0,
          heavyAttack: 0,
          flying: 1
        },
        spendRatio: 0.8,
        timingStyle: 'steady'
      }
    })

    expect(plan.budget).toEqual({
      reserve: 6,
      spendCap: 4.8,
      spent: 4
    })
    expect(plan.addedGroups).toEqual([
      {
        enemyId: 'ash_wing',
        count: 1,
        route: 'right',
        startSecond: 8,
        interval: 3.6
      },
      {
        enemyId: 'ember_grunt',
        count: 1,
        route: 'right',
        startSecond: 11.6,
        interval: 2.1
      }
    ])
    expect(plan.preview).toEqual({
      title: '右路空袭压制',
      subtitle: '整波飞行单位会持续施压，尽快补对空火力。',
      tags: ['右路', '飞行', '持续'],
      threatLevel: 'high'
    })
  })

  it('builds stable director preview text from params and snapshot', () => {
    const snapshot: BattleSnapshot = {
      wave: 1,
      baseHp: 5,
      purchasePower: 85,
      leaksLastWave: 3,
      destroyedBuildingsLastWave: 0,
      buildingCounts: {
        energy: 1,
        attack: 2,
        defense: 0
      },
      outputProfile: {
        groundDamage: 58,
        flyingDamage: 42,
        attackCoverage: 2,
        blockCapacity: 142,
        energyIncome: 25
      },
      pressureProfile: {
        groundPressure: 12,
        flyingPressure: 0,
        fastPressure: 4,
        buildingDamagePressure: 0
      },
      lanePressure: [
        {
          lane: 0,
          leaksLastWave: 2,
          enemiesReachedFront: 2,
          destroyedBuildingsLastWave: 0,
          groundDps: 0,
          flyingDps: 0,
          blockHp: 0,
          economyValue: 0,
          pressureScore: 0.51
        },
        {
          lane: 1,
          leaksLastWave: 0,
          enemiesReachedFront: 0,
          destroyedBuildingsLastWave: 0,
          groundDps: 16,
          flyingDps: 0,
          blockHp: 142,
          economyValue: 25,
          pressureScore: 0
        },
        {
          lane: 2,
          leaksLastWave: 1,
          enemiesReachedFront: 1,
          destroyedBuildingsLastWave: 0,
          groundDps: 42,
          flyingDps: 42,
          blockHp: 0,
          economyValue: 0,
          pressureScore: 0.376
        },
        {
          lane: 3,
          leaksLastWave: 1,
          enemiesReachedFront: 1,
          destroyedBuildingsLastWave: 0,
          groundDps: 0,
          flyingDps: 0,
          blockHp: 0,
          economyValue: 0,
          pressureScore: 0.255
        },
        {
          lane: 4,
          leaksLastWave: 1,
          enemiesReachedFront: 1,
          destroyedBuildingsLastWave: 0,
          groundDps: 0,
          flyingDps: 0,
          blockHp: 0,
          economyValue: 0,
          pressureScore: 0.255
        }
      ],
      nextWavePreview: {
        normal: 8,
        fast: 4,
        heavyAttack: 0,
        flying: 0,
        hasBoss: false
      },
      problemTags: ['fast_pressure_high', 'block_capacity_low'],
      chosenCardTags: []
    }

    expect(
      buildDirectorPreviewText(
        {
          intent: 'probe_fast',
          aggression: 0.8,
          primaryRoute: 'left',
          roleWeights: {
            normal: 0.35,
            fast: 1,
            heavyAttack: 0,
            flying: 0
          },
          spendRatio: 0.75,
          timingStyle: 'frontload'
        },
        snapshot
      )
    ).toEqual({
      title: '左路极速试探',
      subtitle: '前段快速压线，优先补阻挡或减速。',
      tags: ['左路', '高速', '前压'],
      threatLevel: 'high'
    })
  })

  it('uses wave policy seeds to keep the next wave focused on its teaching goal', () => {
    const nextWave = getLevelWaveDefinitions('volcano_frontier')[1]

    expect(nextWave?.directorPolicy?.preferredIntents).toContain('probe_fast')

    const snapshot: BattleSnapshot = {
      wave: 1,
      baseHp: 6,
      purchasePower: 70,
      leaksLastWave: 1,
      destroyedBuildingsLastWave: 0,
      buildingCounts: {
        energy: 1,
        attack: 2,
        defense: 1
      },
      outputProfile: {
        groundDamage: 60,
        flyingDamage: 20,
        attackCoverage: 2,
        blockCapacity: 180,
        energyIncome: 25
      },
      pressureProfile: {
        groundPressure: 4,
        flyingPressure: 0,
        fastPressure: 0,
        buildingDamagePressure: 0
      },
      lanePressure: [
        { lane: 0, leaksLastWave: 0, enemiesReachedFront: 0, destroyedBuildingsLastWave: 0, groundDps: 18, flyingDps: 0, blockHp: 90, economyValue: 25, pressureScore: 0.42 },
        { lane: 1, leaksLastWave: 1, enemiesReachedFront: 1, destroyedBuildingsLastWave: 0, groundDps: 12, flyingDps: 0, blockHp: 90, economyValue: 0, pressureScore: 0.54 },
        { lane: 2, leaksLastWave: 0, enemiesReachedFront: 0, destroyedBuildingsLastWave: 0, groundDps: 20, flyingDps: 20, blockHp: 0, economyValue: 0, pressureScore: 0.33 },
        { lane: 3, leaksLastWave: 0, enemiesReachedFront: 0, destroyedBuildingsLastWave: 0, groundDps: 10, flyingDps: 0, blockHp: 0, economyValue: 0, pressureScore: 0.28 },
        { lane: 4, leaksLastWave: 0, enemiesReachedFront: 0, destroyedBuildingsLastWave: 0, groundDps: 10, flyingDps: 0, blockHp: 0, economyValue: 0, pressureScore: 0.27 }
      ],
      nextWavePreview: {
        normal: 8,
        fast: 0,
        heavyAttack: 0,
        flying: 0,
        hasBoss: false
      },
      problemTags: [],
      chosenCardTags: []
    }

    expect(
      createDirectorDecisionParams({
        snapshot,
        nextWave
      })
    ).toEqual(
      expect.objectContaining({
        intent: 'probe_fast',
        primaryRoute: 'left',
        timingStyle: 'frontload'
      })
    )
  })

  it('uses recent director history to avoid repeating the same preferred intent when another legal test exists', () => {
    const nextWave = getLevelWaveDefinitions('volcano_frontier')[3]

    expect(nextWave?.directorPolicy?.preferredIntents).toContain('probe_anti_air')

    const snapshot: BattleSnapshot = {
      wave: 3,
      baseHp: 7,
      purchasePower: 90,
      leaksLastWave: 0,
      destroyedBuildingsLastWave: 0,
      buildingCounts: {
        energy: 2,
        attack: 3,
        defense: 1
      },
      outputProfile: {
        groundDamage: 58,
        flyingDamage: 30,
        attackCoverage: 2,
        blockCapacity: 150,
        energyIncome: 50
      },
      pressureProfile: {
        groundPressure: 10,
        flyingPressure: 5,
        fastPressure: 4,
        buildingDamagePressure: 1
      },
      lanePressure: [
        { lane: 0, leaksLastWave: 0, enemiesReachedFront: 0, destroyedBuildingsLastWave: 0, groundDps: 12, flyingDps: 12, blockHp: 90, economyValue: 0, pressureScore: 0.7 },
        { lane: 1, leaksLastWave: 0, enemiesReachedFront: 0, destroyedBuildingsLastWave: 0, groundDps: 12, flyingDps: 12, blockHp: 90, economyValue: 0, pressureScore: 0.66 },
        { lane: 2, leaksLastWave: 0, enemiesReachedFront: 0, destroyedBuildingsLastWave: 0, groundDps: 18, flyingDps: 6, blockHp: 0, economyValue: 25, pressureScore: 0.48 },
        { lane: 3, leaksLastWave: 0, enemiesReachedFront: 0, destroyedBuildingsLastWave: 0, groundDps: 14, flyingDps: 0, blockHp: 0, economyValue: 0, pressureScore: 0.6 },
        { lane: 4, leaksLastWave: 0, enemiesReachedFront: 0, destroyedBuildingsLastWave: 0, groundDps: 8, flyingDps: 0, blockHp: 0, economyValue: 0, pressureScore: 0.56 }
      ],
      nextWavePreview: {
        normal: 8,
        fast: 4,
        heavyAttack: 0,
        flying: 5,
        hasBoss: false
      },
      problemTags: ['flying_pressure_high', 'coverage_low'],
      chosenCardTags: []
    }

    expect(
      createDirectorDecisionParams({
        snapshot,
        nextWave,
        recentDirectorHistory: [
          {
            wave: 3,
            intent: 'probe_anti_air',
            primaryRoute: 'left',
            reasonTag: 'flying_pressure_high'
          }
        ]
      })
    ).toEqual(
      expect.objectContaining({
        intent: 'split_pressure',
        primaryRoute: 'left',
        secondaryRoute: 'right'
      })
    )
  })
})
