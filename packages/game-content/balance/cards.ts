import type { StrategyCardDef } from './types.js'

export const cards = [
  {
    id: 'energy_instant_power',
    name: '能量喷涌',
    type: 'energy',
    tags: ['economy', 'instant', 'recovery'],
    solves: { low_economy: 0.95, block_capacity_low: 0.3 },
    synergy: ['all_buildings'],
    effect: { kind: 'gain_purchase_power', value: 240 },
    description: '立即获得 240 点能量，用于补建筑和顶节奏。',
    recommendReason: '购买力偏低但需要立刻补建筑时，能量喷涌最直接。',
    status: 'draft'
  },
  {
    id: 'emergency_freeze',
    name: '时滞法环',
    type: 'emergency',
    tags: ['emergency', 'control', 'anti_fast'],
    solves: { fast_pressure_high: 0.95, base_danger: 0.45 },
    synergy: ['lava_wall', 'attack_speed_up'],
    effect: { kind: 'freeze_enemies', nonBossDuration: 3, bossDuration: 1 },
    description: '场上非 Boss 敌人停止 3 秒，Boss 停止 1 秒，用于救急控场。',
    recommendReason: '上波漏怪多或极速压力高时，时滞法环可以立刻争取击杀时间。',
    status: 'draft'
  },
  {
    id: 'emergency_repair_all',
    name: '愈光灌注',
    type: 'emergency',
    tags: ['emergency', 'repair', 'anti_breaker'],
    solves: { building_break_high: 0.95, boss_incoming: 0.45 },
    synergy: ['lava_wall', 'energy_core'],
    effect: { kind: 'repair_all_buildings', value: 80 },
    description: '所有装置恢复 80 点生命，不超过最大生命值，用于修复被打残的装置。',
    recommendReason: '建筑被毁或重攻压力高时，愈光灌注能稳住防线。',
    status: 'draft'
  },
  {
    id: 'spell_lava_rain',
    name: '星辉骤雨',
    type: 'attack',
    tags: ['spell', 'aoe', 'anti_swarm'],
    solves: { ground_damage_low: 0.85, fast_pressure_high: 0.65 },
    synergy: ['all_enemies'],
    effect: { kind: 'spell_lava_rain', strikes: 8, damage: 35 },
    description: '在全场降下 8 枚星辉法弹，优先落向敌人密集区域，每次造成 35 点范围伤害。',
    recommendReason: '敌人数量多时，星辉骤雨能快速清掉密集小怪。',
    status: 'draft'
  },
  {
    id: 'summon_flame_hawks',
    name: '风羽使魔',
    type: 'attack',
    tags: ['summon', 'anti_air', 'flying_counter'],
    solves: { flying_pressure_high: 0.95, coverage_low: 0.35 },
    synergy: ['all_enemies'],
    effect: { kind: 'summon_flame_hawks', count: 2, damage: 65 },
    description: '召唤 2 只风羽使魔在空中巡逻，优先攻击飞行敌人，每只造成 65 点伤害。',
    recommendReason: '飞天压力高时，风羽使魔能独立补对空伤害。',
    status: 'draft'
  },
  {
    id: 'summon_furnace_golem',
    name: '学院魔偶',
    type: 'attack',
    tags: ['summon', 'attack', 'frontline'],
    solves: { ground_damage_low: 0.7, block_capacity_low: 0.55 },
    synergy: ['melee_turret'],
    effect: { kind: 'summon_furnace_golem', durationSeconds: 25 },
    // 数值与 melee_turret 一致：每 0.5s 出拳 1 次，每次造成 16 点伤害（≈32 DPS），生命 160，可阻挡。
    description: '在指定空格召唤 1 个学院魔偶（生命 160，每 0.5 秒出拳造成 16 点伤害，可阻挡前排），持续 25 秒后消散。',
    recommendReason: '需要临时前排输出时，学院魔偶能同时补阻挡和伤害。',
    status: 'draft'
  },
  {
    id: 'defense_temp_wall',
    name: '以太结界',
    type: 'defense',
    tags: ['defense', 'emergency_block', 'anti_fast'],
    solves: { block_capacity_low: 0.9, fast_pressure_high: 0.75, base_danger: 0.45 },
    synergy: ['lava_wall'],
    effect: {
      kind: 'spawn_temporary_wall',
      target: 'highest_pressure_route',
      buildingId: 'lava_wall',
      count: 1,
      durationWaves: 1
    },
    description: '在压力最高路线生成 1 道临时以太结界，持续 1 波，用于单路压力过高时救场。',
    recommendReason: '某一路线压力明显过高时，以太结界能立刻补前排。',
    status: 'draft'
  },
  {
    id: 'summon_energy_sprite',
    name: '能量精灵',
    type: 'energy',
    tags: ['summon', 'economy', 'energy'],
    solves: { low_economy: 0.8, energy_heavy: 0.45 },
    synergy: ['energy_core'],
    effect: {
      kind: 'summon_energy_sprite',
      count: 2,
      durationSeconds: 9,
      collectionIntervalSeconds: 3
    },
    description: '召唤 2 个能量精灵围绕能量核心飞行，每隔 3 秒额外收集一次现有能量核心的能量，不影响核心正常产出，持续 9 秒。',
    recommendReason: '经济落后但不想只靠被动产出时，能量精灵能补一段节奏。',
    status: 'draft'
  },
  {
    id: 'pivot_wall_feedback',
    name: '奥术反震',
    type: 'pivot',
    tags: ['pivot', 'defense_damage', 'anti_swarm'],
    solves: { defense_heavy: 0.75, ground_damage_low: 0.45, fast_pressure_high: 0.35 },
    synergy: ['lava_wall'],
    effect: { kind: 'wall_damage_reflection', target: 'lava_wall', damage: 10, cooldown: 1, durationWaves: 1 },
    description: '下一波中，己方结界类装置受到地面攻击时，对攻击者造成 10 点反震伤害，1 秒冷却。',
    recommendReason: '防御建筑多但输出不足时，奥术反震能把前排承伤转成伤害。',
    status: 'draft'
  },
  {
    id: 'attack_molten_chain',
    name: '秘火连锁',
    type: 'attack',
    tags: ['attack', 'aoe', 'anti_swarm'],
    solves: { ground_damage_low: 0.7, fast_pressure_high: 0.55 },
    synergy: ['ranged_turret'],
    effect: { kind: 'spell_molten_chain', bounces: 5, damage: 45 },
    description: '召唤一团秘火在敌人之间弹跳 5 次，每次命中一个敌人并造成 45 点小范围溅射伤害。',
    recommendReason: '密集小怪压力高时，秘火连锁能主动清理一批敌人。',
    status: 'draft'
  },
  {
    id: 'reward_fire_dragon_breath',
    name: '火龙吐息',
    type: 'emergency',
    tags: ['reward', 'aoe', 'fire_dragon', 'map_clear'],
    solves: { base_danger: 0.85, ground_damage_low: 0.8, fast_pressure_high: 0.7, boss_incoming: 0.55 },
    synergy: ['all_enemies'],
    effect: { kind: 'summon_fire_dragon_breath', target: 'all_enemies', damage: 110 },
    description: '通关火山地图后解锁。召唤火龙掠过战场，对场上所有敌人进行群体攻击，每个敌人都受到 110 点伤害。',
    recommendReason: '火山地图通关奖励技能，用于后续地图中处理满场敌人压力。',
    status: 'draft',
    notes: '火山地图通关后解锁，不进入普通波次后的随机策略卡池。'
  },
  {
    id: 'premium_starfall_contract',
    name: '星陨契约',
    type: 'attack',
    tags: ['premium', 'burst_damage', 'single_target', 'shop'],
    solves: { boss_incoming: 0.85, ground_damage_low: 0.7, fast_pressure_high: 0.45 },
    synergy: ['all_enemies'],
    effect: { kind: 'premium_starfall_contract', strikes: 3, damage: 150 },
    description: '通过主界面【商店】购买后解锁。使用后召唤 3 颗星陨火石砸向当前血量最高的敌人，每颗造成 150 点单体伤害；如果目标死亡，剩余火石会自动转向场上其他敌人。',
    recommendReason: '商店购买的强力爆发技能，适合处理 Boss 或场上高血量威胁。',
    status: 'draft',
    notes: '通过商店消耗灵感原石解锁，可加入刷图技能包，每局最多使用一次。'
  }
] as const satisfies readonly StrategyCardDef[]
