import type { MapDef } from './types.js'

export const maps = [
  {
    id: 'volcano',
    name: '火山',
    theme: '熔岩、黑曜石、火山灰和高温喷口',
    laneCount: 5,
    baseHp: 10,
    initialPurchasePower: 240,
    runTimeMinutes: [2, 5],
    bossId: 'volcano_core_beast',
    status: 'draft',
    notes: 'V0.2 只做这一张地图，用来验证 5 波短局和策略卡推荐。'
  }
] as const satisfies readonly MapDef[]
