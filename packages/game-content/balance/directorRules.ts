import type { DirectorRuleDef } from './types.js'

export const directorRules = [
  {
    id: 'increase_pressure_when_safe',
    playerState: '玩家过于轻松，baseHp 大于等于 8 且无漏怪。',
    allowedAdjustment: '下一波普通 +2 或极速 +1。',
    limits: '不影响 Boss 波主结构，每波总压力增幅不超过 15%。',
    reasonTags: ['ground_damage_low', 'fast_pressure_high'],
    status: 'draft'
  },
  {
    id: 'test_greedy_economy',
    playerState: '玩家经济过强，能量建筑数量大于等于 3。',
    allowedAdjustment: '下一波加入 1 个重攻敌人。',
    limits: '不能连续两波加入重攻针对经济。',
    reasonTags: ['low_economy', 'building_break_high'],
    status: 'draft'
  },
  {
    id: 'test_low_anti_air',
    playerState: '玩家缺对空，flyingDamage 低。',
    allowedAdjustment: '下一波飞天 +1。',
    limits: '必须在下一波预告里显示。',
    reasonTags: ['flying_pressure_high'],
    status: 'draft'
  },
  {
    id: 'relieve_when_base_danger',
    playerState: '玩家濒危，baseHp 小于等于 3。',
    allowedAdjustment: '下一波总敌人数 -2，或普通替换为更慢敌人。',
    limits: '不移除 Boss，不改变已经开始的波次。',
    reasonTags: ['base_danger'],
    status: 'draft'
  },
  {
    id: 'reduce_breaker_after_losses',
    playerState: '建筑被毁过多。',
    allowedAdjustment: '降低下一波重攻数量 1 个。',
    limits: '不低于固定波次下限的 50%。',
    reasonTags: ['building_break_high'],
    status: 'draft'
  }
] as const satisfies readonly DirectorRuleDef[]

