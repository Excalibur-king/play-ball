import type { WaveDef } from './types.js'

export const waves = [
  {
    id: 'volcano_wave_01',
    mapId: 'volcano',
    index: 1,
    durationSeconds: 30,
    enemyGroups: [
      { enemyId: 'ember_grunt', count: 8, route: 'mixed', startSecond: 2, interval: 2.8 }
    ],
    rewardPurchasePower: 60,
    pressureGoal: '熟悉基础输出，让玩家理解攻击建筑负责清理普通敌人。',
    nextWaveHint: '第 2 波会出现极速敌人，需要防御机关或攻速补强。',
    aiDirectorAllowed: false,
    status: 'draft'
  },
  {
    id: 'volcano_wave_02',
    mapId: 'volcano',
    index: 2,
    durationSeconds: 40,
    enemyGroups: [
      { enemyId: 'ember_grunt', count: 8, route: 'mixed', startSecond: 2, interval: 2.4 },
      { enemyId: 'spark_runner', count: 4, route: 'center', startSecond: 8, interval: 2.4 }
    ],
    rewardPurchasePower: 70,
    pressureGoal: '逼玩家做阻挡，让玩家意识到没有防御机关会漏极速敌人。',
    nextWaveHint: '第 3 波会出现重攻敌人，会更快破坏建筑。',
    aiDirectorAllowed: true,
    status: 'draft'
  },
  {
    id: 'volcano_wave_03',
    mapId: 'volcano',
    index: 3,
    durationSeconds: 45,
    enemyGroups: [
      { enemyId: 'ember_grunt', count: 8, route: 'mixed', startSecond: 2, interval: 2.6 },
      { enemyId: 'basalt_smasher', count: 3, route: 'left', startSecond: 13, interval: 5 }
    ],
    rewardPurchasePower: 80,
    pressureGoal: '制造建筑被拆压力，让玩家看到建筑血量和修复的重要性。',
    nextWaveHint: '第 4 波会出现飞天敌人，防御机关无法阻挡。',
    aiDirectorAllowed: true,
    status: 'draft'
  },
  {
    id: 'volcano_wave_04',
    mapId: 'volcano',
    index: 4,
    durationSeconds: 55,
    enemyGroups: [
      { enemyId: 'ember_grunt', count: 8, route: 'mixed', startSecond: 2, interval: 2.2 },
      { enemyId: 'spark_runner', count: 4, route: 'mixed', startSecond: 10, interval: 4 },
      { enemyId: 'ash_wing', count: 5, route: 'mixed', startSecond: 14, interval: 5 }
    ],
    rewardPurchasePower: 90,
    pressureGoal: '制造对空覆盖压力，让玩家意识到防御机关不能解决飞天。',
    nextWaveHint: '第 5 波是 Boss，火山核心兽即将出现。',
    aiDirectorAllowed: true,
    status: 'draft'
  },
  {
    id: 'volcano_wave_05',
    mapId: 'volcano',
    index: 5,
    durationSeconds: 75,
    enemyGroups: [
      { enemyId: 'volcano_core_beast', count: 1, route: 'center', startSecond: 8, interval: 1 },
      { enemyId: 'ember_grunt', count: 8, route: 'mixed', startSecond: 2, interval: 2.6 },
      { enemyId: 'basalt_smasher', count: 3, route: 'mixed', startSecond: 18, interval: 6 },
      { enemyId: 'ash_wing', count: 4, route: 'mixed', startSecond: 24, interval: 5 }
    ],
    bossId: 'volcano_core_beast',
    clearRewardId: 'volcano_victory_cache',
    pressureGoal: '最终构筑检验，综合压测输出、防御、修复和对空覆盖。',
    nextWaveHint: '这是最终波。',
    aiDirectorAllowed: false,
    status: 'draft'
  }
] as const satisfies readonly WaveDef[]
