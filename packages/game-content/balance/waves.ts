import type { WaveDef } from './types.js'
import { buildWave, phaseWave } from './waveBuilder.js'

export const waves = [
  buildWave({
    id: 'volcano_wave_01',
    mapId: 'volcano',
    index: 1,
    durationSeconds: 34,
    directorReserveBudget: 0,
    phases: [
      phaseWave(0, [
        { enemyId: 'ember_grunt', count: 3, route: 'center', interval: 3.8, startOffset: 4 },
        { enemyId: 'ember_grunt', count: 2, route: 'left', interval: 4.2, startOffset: 8 }
      ], {
        label: '双路起手',
        description: '先稳住主路，再给一侧补轻压，让玩家从第一波开始建立双路补线意识。'
      })
    ],
    rewardPurchasePower: 75,
    pressureGoal: '第一波先用中路常规怪站住主防线，再从左路补一小段轻压，让玩家在低强度下熟悉双路补线。',
    nextWaveHint: '第 2 波仍以主防线为主，但会从侧路混入少量极速敌人，需要开始考虑阻挡、转火和补线速度。',
    aiDirectorAllowed: true,
    status: 'draft'
  }),
  buildWave({
    id: 'volcano_wave_02',
    mapId: 'volcano',
    index: 2,
    durationSeconds: 40,
    directorReserveBudget: 4,
    phases: [
      phaseWave(0, { enemyId: 'ember_grunt', count: 5, route: 'center', interval: 3.1, startOffset: 3 }, {
        label: '主路稍压',
        description: '继续让主路吃压，但强度控制在可处理范围内，给玩家留出转火和补线空间。'
      }),
      phaseWave(13, { enemyId: 'spark_runner', count: 2, route: 'left', interval: 2.5 }, {
        label: '侧路快探',
        description: '沿第一波已经出现过的侧路补少量快怪，试探玩家的补线速度、转火能力和阻挡反应。'
      })
    ],
    rewardPurchasePower: 80,
    pressureGoal: '第 2 波先让主路维持轻压，再从侧路插入少量快怪，开始教玩家在双路间转火和补线。',
    nextWaveHint: '第 3 波会把侧路压力做实，并把重攻敌人压进主防线，考验前排能否顶住。',
    aiDirectorAllowed: true,
    directorPolicy: {
      allowedIntents: ['relief', 'probe_fast'],
      preferredIntents: ['probe_fast'],
      maxSpendRatio: 0.75
    },
    status: 'draft'
  }),
  buildWave({
    id: 'volcano_wave_03',
    mapId: 'volcano',
    index: 3,
    durationSeconds: 45,
    directorReserveBudget: 5,
    phases: [
      phaseWave(0, { enemyId: 'ember_grunt', count: 5, route: 'left', interval: 2.8, startOffset: 3 }, {
        label: '侧路起压',
        description: '先让玩家意识到第二条防线正在形成，但还没到必须全图救火的程度。'
      }),
      phaseWave(16, { enemyId: 'basalt_smasher', count: 2, route: 'left', interval: 5.2 }, {
        label: '拆塔题登场',
        description: '重攻怪开始拆前排，逼玩家补单体火力和承伤结构。'
      }),
      phaseWave(24, { enemyId: 'ember_grunt', count: 3, route: 'center', interval: 3.4 }, {
        label: '主路补压',
        description: '在侧路分心后回补主路，开始考验双路注意力。'
      })
    ],
    rewardPurchasePower: 85,
    pressureGoal: '先用单侧普通怪建立第二条防线需求，再让少量重攻压到主防线上，避免前期同时被多路撕开。',
    nextWaveHint: '第 4 波会从另一侧加入飞天敌人，单靠屏障魔导具挡不住。',
    aiDirectorAllowed: true,
    directorPolicy: {
      allowedIntents: ['relief', 'pressure_economy'],
      preferredIntents: ['pressure_economy'],
      maxSpendRatio: 0.8
    },
    status: 'draft'
  }),
  buildWave({
    id: 'volcano_wave_04',
    mapId: 'volcano',
    index: 4,
    durationSeconds: 55,
    directorReserveBudget: 6,
    phases: [
      phaseWave(0, { enemyId: 'ember_grunt', count: 6, route: 'left', interval: 2.2, startOffset: 2 }, {
        label: '左路持续压',
        description: '先把注意力钉在地面一侧，让玩家感受火力被拉开的前兆。'
      }),
      phaseWave(9, { enemyId: 'spark_runner', count: 5, route: 'center', interval: 2.2 }, {
        label: '中路快压',
        description: '中路提速，打乱原本稳定的阻挡和清线节奏。'
      }),
      phaseWave(14, { enemyId: 'ash_wing', count: 6, route: 'right', interval: 4 }, {
        label: '右路空袭',
        description: '飞行敌人入场，要求玩家把覆盖从地面扩展到对空。'
      })
    ],
    rewardPurchasePower: 90,
    pressureGoal: '左右两侧分工施压，让玩家同时处理地面冲线和对空覆盖。',
    nextWaveHint: '第 5 波是 Boss，中路会顶住重压，侧翼还会持续漏压。',
    aiDirectorAllowed: true,
    directorPolicy: {
      allowedIntents: ['relief', 'probe_anti_air', 'split_pressure'],
      preferredIntents: ['probe_anti_air'],
      maxSpendRatio: 0.85
    },
    status: 'draft'
  }),
  buildWave({
    id: 'volcano_wave_05',
    mapId: 'volcano',
    index: 5,
    durationSeconds: 75,
    directorReserveBudget: 0,
    phases: [
      phaseWave(0, { enemyId: 'ember_grunt', count: 6, route: 'left', interval: 2.4, startOffset: 2 }, {
        label: '侧翼预热',
        description: '先用侧翼小压牵扯注意力，让最终波不是一上来就只看 Boss。'
      }),
      phaseWave(8, { enemyId: 'volcano_core_beast', count: 1, route: 'center', interval: 1 }, {
        label: 'Boss 入场',
        description: '核心兽顶中路，宣布最终综合检查正式开始。'
      }),
      phaseWave(15, { enemyId: 'basalt_smasher', count: 4, route: 'center', interval: 4.8 }, {
        label: '中路重压',
        description: 'Boss 站住后再叠拆塔重压，逼玩家判断承伤和爆发是否够用。'
      }),
      phaseWave(20, { enemyId: 'ash_wing', count: 5, route: 'right', interval: 4.2 }, {
        label: '右路持续空袭',
        description: '最终波后段把对空题也叠回来，检验完整防线而不是单点解法。'
      })
    ],
    bossId: 'volcano_core_beast',
    clearRewardId: 'reward_fire_dragon_breath',
    pressureGoal: 'Boss 顶中路、左右侧协同压场，检验完整防线被撕开后还能不能撑住。',
    nextWaveHint: '这是最终波。',
    aiDirectorAllowed: true,
    status: 'draft'
  })
] as const satisfies readonly WaveDef[]
