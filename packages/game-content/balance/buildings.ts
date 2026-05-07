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
    name: '魂能导仪',
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
    visualRule: '稳定发光的魂能导仪，读法偏经济型魔导具，不要像攻击武器。',
    status: 'draft',
    notes: 'V0.2 经济型魔导具原型：持续生产购买力，被破坏后停止产出。'
  },
  {
    id: 'melee_turret',
    name: '守护魔导具',
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
    visualRule: '短射程守护型魔导具，底座厚重，近战读法清晰，偏前排输出。',
    status: 'draft',
    notes: '近战型魔导具：0.5 秒一击，血量厚，用于拦截贴脸敌人。'
  },
  {
    id: 'ranged_turret',
    name: '索敌魔导具',
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
    visualRule: '远距索敌魔导具，炮口和弹道读法清晰，能打地面和飞天。',
    status: 'draft',
    notes: '远程型魔导具：1.5 秒一发，血量偏低，负责远程爆发和对空。'
  },
  {
    id: 'laser_turret',
    name: '秘仪魔导具',
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
    notes: '爆发型魔导具：发射 10 次路径光束后消退。'
  },
  {
    id: 'lava_wall',
    name: '屏障魔导具',
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
    visualRule: '厚重、低矮、横向阻挡感强，必须明显是屏障型魔导具而不是输出武器。',
    status: 'draft',
    notes: 'V0.2 防御型魔导具原型：阻挡地面敌人，不阻挡飞天。'
  }
] as const satisfies readonly BuildingDef[]
