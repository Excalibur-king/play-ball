import type { BuildingDef } from './types.js'
import { attackPowerFromDpsMultiplier, buildingHpFromTtdUnits, combatBalance } from './combatBalance.js'

const attackInterval = {
  melee: 0.5,
  ranged: 1.5,
  laser: 0.35
} as const

export const buildings = [
  {
    id: 'energy_core',
    name: '格鲁姆',
    type: 'defense',
    cost: 75,
    hp: buildingHpFromTtdUnits(combatBalance.buildingTtdUnitsAgainstHeavy.wall),
    canBlockGround: true,
    canTargetGround: false,
    canTargetFlying: false,
    tags: ['block', 'high_hp'],
    specialEffectHooks: ['defense_special'],
    upgrade: {
      cost: 80,
      hpBonus: buildingHpFromTtdUnits(0.95)
    },
    visualRule: '厚重、低矮、横向阻挡感强，必须明显是屏障型角色而不是输出武器。',
    status: 'draft',
    notes: '格鲁姆继承原结界装置：阻挡地面敌人，不阻挡飞天。'
  },
  {
    id: 'melee_turret',
    name: '莉娅娜',
    type: 'attack',
    cost: 125,
    hp: buildingHpFromTtdUnits(combatBalance.buildingTtdUnitsAgainstHeavy.rangedTower),
    attackPower: attackPowerFromDpsMultiplier(1, attackInterval.ranged),
    attackInterval: attackInterval.ranged,
    attackRange: 5.5,
    attackDirection: 'right',
    attackKind: 'projectile',
    projectileKey: 'basicBolt',
    canBlockGround: false,
    canTargetGround: true,
    canTargetFlying: true,
    tags: ['ranged', 'anti_air', 'burst_damage'],
    specialEffectHooks: ['attack_special'],
    upgrade: {
      cost: 110,
      attackPowerBonus: attackPowerFromDpsMultiplier(0.45, attackInterval.ranged),
      attackRangeBonus: 1
    },
    visualRule: '远距连击型角色，弹道读法清晰，能打地面和飞天。',
    status: 'draft',
    notes: '莉娅娜继承原连击装置：1.5 秒一发，负责远程爆发和对空。'
  },
  {
    id: 'ranged_turret',
    name: '奥利安',
    type: 'attack',
    cost: 120,
    hp: buildingHpFromTtdUnits(combatBalance.buildingTtdUnitsAgainstHeavy.laserTower),
    attackPower: attackPowerFromDpsMultiplier(2.6, attackInterval.laser),
    attackInterval: attackInterval.laser,
    attackRange: 7,
    attackDirection: 'right',
    attackKind: 'laser',
    charges: 10,
    projectileKey: 'laserBeam',
    canBlockGround: false,
    canTargetGround: true,
    canTargetFlying: false,
    tags: ['laser', 'burst_damage', 'limited_charges'],
    specialEffectHooks: ['laser_special'],
    upgrade: {
      cost: 125,
      attackPowerBonus: attackPowerFromDpsMultiplier(0.9, attackInterval.laser),
      attackRangeBonus: 1
    },
    visualRule: '视觉特效必须夸张，发射贯穿路径的强光束，十次后明显消退。',
    status: 'draft',
    notes: '奥利安继承原秘仪装置：发射 10 次路径光束后消退。'
  },
  {
    id: 'laser_turret',
    name: '托托尔',
    type: 'attack',
    cost: 85,
    hp: buildingHpFromTtdUnits(combatBalance.buildingTtdUnitsAgainstHeavy.meleeTower),
    attackPower: attackPowerFromDpsMultiplier(1, attackInterval.melee),
    attackInterval: attackInterval.melee,
    attackRange: 1.4,
    attackDirection: 'right',
    attackKind: 'melee',
    canBlockGround: true,
    canTargetGround: true,
    canTargetFlying: false,
    tags: ['melee', 'fast_attack', 'frontline'],
    specialEffectHooks: ['attack_special'],
    upgrade: {
      cost: 90,
      hpBonus: buildingHpFromTtdUnits(0.45),
      attackPowerBonus: attackPowerFromDpsMultiplier(0.45, attackInterval.melee)
    },
    visualRule: '短射程守卫型角色，近战读法清晰，偏前排输出。',
    status: 'draft',
    notes: '托托尔继承原守卫装置：0.5 秒一击，血量厚，用于拦截贴脸敌人。'
  },
  {
    id: 'lava_wall',
    name: '露米米',
    type: 'energy',
    cost: 50,
    hp: buildingHpFromTtdUnits(combatBalance.buildingTtdUnitsAgainstHeavy.economy),
    purchasePowerPerTick: 25,
    productionInterval: 8,
    canBlockGround: false,
    canTargetGround: false,
    canTargetFlying: false,
    tags: ['economy', 'fragile'],
    specialEffectHooks: ['energy_special'],
    upgrade: {
      cost: 75,
      hpBonus: buildingHpFromTtdUnits(0.3),
      purchasePowerPerTickBonus: 10
    },
    visualRule: '稳定发光的聚灵型角色，读法偏经济型，不要像攻击武器。',
    status: 'draft',
    notes: '露米米继承原聚灵装置：持续生产购买力，被破坏后停止产出。'
  }
] as const satisfies readonly BuildingDef[]
