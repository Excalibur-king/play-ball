import { strategyCards } from '@tower-rogue/game-content'
import { isStrategyCardImplemented } from './systems/cards'
import type { BattleSnapshot, CardRecommendation } from './types'

export function recommendStrategyCards(snapshot: BattleSnapshot): CardRecommendation[] {
  const scored = strategyCards.filter(isSelectableRecommendationCard).map((card) => {
    const tags = card.tags as readonly string[]
    const synergy = card.synergy as readonly string[]
    const problemMatch = (Object.entries(card.solves) as Array<[string, number]>).reduce(
      (sum, [tag, value]) => sum + (snapshot.problemTags.includes(tag) ? value * 50 : 0),
      0
    )
    const nextWaveMatch = getNextWaveMatch(tags, snapshot) * 30
    const buildSynergy = getBuildSynergy(synergy, snapshot) * 20
    const emergencyBonus = snapshot.baseHp <= 4 && card.type === 'emergency' ? 20 : 0
    const repeatPenalty = snapshot.chosenCardTags.some((tag) => tags.includes(tag)) ? 8 : 0

    return {
      card,
      score: problemMatch + nextWaveMatch + buildSynergy + emergencyBonus - repeatPenalty
    }
  })

  const picked: CardRecommendation[] = []
  pickSlot('emergency', picked, scored, snapshot, (card) => card.type === 'emergency')
  pickSlot('synergy', picked, scored, snapshot, (card) => card.type === 'attack' || card.type === 'energy' || card.type === 'defense')
  pickSlot('pivot', picked, scored, snapshot, (card) => card.type === 'pivot')

  return picked
}

function isSelectableRecommendationCard(card: (typeof strategyCards)[number]) {
  const tags = card.tags as readonly string[]
  return isStrategyCardImplemented(card) && !tags.includes('reward') && !tags.includes('premium')
}

function pickSlot(
  slot: CardRecommendation['slot'],
  picked: CardRecommendation[],
  scored: Array<{ card: (typeof strategyCards)[number]; score: number }>,
  snapshot: BattleSnapshot,
  predicate: (card: (typeof strategyCards)[number]) => boolean
) {
  const alreadyPicked = new Set(picked.map((item) => item.cardId))
  const best = scored
    .filter((item) => predicate(item.card) && !alreadyPicked.has(item.card.id))
    .sort((a, b) => b.score - a.score)[0]

  if (!best) {
    return
  }

  picked.push({
    cardId: best.card.id,
    slot,
    score: Math.round(best.score),
    reason: buildDynamicRecommendationReason(best.card, snapshot)
  })
}

function buildDynamicRecommendationReason(card: (typeof strategyCards)[number], snapshot: BattleSnapshot) {
  const clauses: string[] = []
  const problemClause = getProblemClause(card, snapshot)
  const pressureClause = getPressureClause(card, snapshot)
  const synergyClause = getSynergyClause(card, snapshot)

  if (problemClause) clauses.push(problemClause)
  if (pressureClause && !clauses.includes(pressureClause)) clauses.push(pressureClause)
  if (synergyClause && clauses.length < 2) clauses.push(synergyClause)

  if (clauses.length === 0 && snapshot.baseHp <= 4 && card.type === 'emergency') {
    clauses.push('底线血量已经危险，这张更适合先把失败风险压下来。')
  }

  return clauses.slice(0, 2).join(' ') || card.recommendReason
}

function getProblemClause(card: (typeof strategyCards)[number], snapshot: BattleSnapshot) {
  const highestPressureLane = getHighestPressureLane(snapshot)
  const matchedProblem = (Object.entries(card.solves) as Array<[string, number]>)
    .filter(([tag]) => snapshot.problemTags.includes(tag))
    .sort((a, b) => b[1] - a[1])[0]?.[0]

  if (!matchedProblem) {
    return undefined
  }

  if (matchedProblem === 'low_economy') {
    return `当前购买力只有 ${snapshot.purchasePower}，而魂能导仪只有 ${snapshot.buildingCounts.energy} 件，先补经济更稳。`
  }

  if (matchedProblem === 'ground_damage_low') {
    return `地面输出偏低，但下一波地面压力有 ${snapshot.pressureProfile.groundPressure}，需要先补伤害。`
  }

  if (matchedProblem === 'fast_pressure_high') {
    return `极速压力偏高，上波漏怪 ${snapshot.leaksLastWave} 次，${highestPressureLane}最容易先被冲穿。`
  }

  if (matchedProblem === 'building_break_high') {
    return `重攻威胁高，上一波被毁了 ${snapshot.destroyedBuildingsLastWave} 件魔导具，得先保住前排和后排。`
  }

  if (matchedProblem === 'flying_pressure_high') {
    return `下一波飞行敌人有 ${snapshot.nextWavePreview.flying} 个，而${highestPressureLane}的对空最吃紧，这张正好补短板。`
  }

  if (matchedProblem === 'block_capacity_low') {
    return `前排阻挡偏薄，当前总承伤容量只有 ${snapshot.outputProfile.blockCapacity}，${highestPressureLane}已经接近失守。`
  }

  if (matchedProblem === 'boss_incoming') {
    return 'Boss 波快到了，这张能把你的容错或爆发提前补齐。'
  }

  if (matchedProblem === 'base_danger') {
    return `底线只剩 ${snapshot.baseHp} 点血，这张优先级在于先活过下一段压力。`
  }

  if (matchedProblem === 'coverage_low') {
    return `当前攻击覆盖只有 ${snapshot.outputProfile.attackCoverage} 条有效点位，部分路线容易漏掉。`
  }

  if (matchedProblem === 'defense_heavy') {
    return '前排已经有了，但输出转化不够，这张更适合把承伤变成击杀。'
  }

  if (matchedProblem === 'energy_heavy') {
    return `你已经铺了 ${snapshot.buildingCounts.energy} 件魂能导仪，这张可以把经济直接转成战斗力。`
  }

  return undefined
}

function getHighestPressureLane(snapshot: BattleSnapshot) {
  const lane = [...snapshot.lanePressure].sort((a, b) => b.pressureScore - a.pressureScore)[0]

  if (!lane) {
    return '其中一路'
  }

  return `第 ${lane.lane + 1} 路`
}

function getPressureClause(card: (typeof strategyCards)[number], snapshot: BattleSnapshot) {
  const tags = card.tags as readonly string[]

  if (snapshot.nextWavePreview.flying > 0 && tags.some((tag) => tag.includes('air') || tag.includes('flying'))) {
    return `下一波飞天单位会从高压路线穿过，优先准备对空会更划算。`
  }

  if (snapshot.nextWavePreview.fast > 0 && tags.some((tag) => tag.includes('fast') || tag.includes('control'))) {
    return `下一波有 ${snapshot.nextWavePreview.fast} 个极速敌人，这张能给你争取处理窗口。`
  }

  if (snapshot.nextWavePreview.heavyAttack > 0 && tags.some((tag) => tag.includes('breaker') || tag.includes('repair'))) {
    return `下一波重攻敌人有 ${snapshot.nextWavePreview.heavyAttack} 个，先保住关键魔导具更重要。`
  }

  if (snapshot.nextWavePreview.hasBoss && tags.some((tag) => tag.includes('damage') || tag.includes('repair'))) {
    return 'Boss 即将进场，提前准备爆发或修复会更有容错。'
  }

  return undefined
}

function getSynergyClause(card: (typeof strategyCards)[number], snapshot: BattleSnapshot) {
  const synergy = card.synergy as readonly string[]

  if (snapshot.buildingCounts.energy > 0 && synergy.includes('energy_core')) {
    return `你场上已有 ${snapshot.buildingCounts.energy} 件魂能导仪，这张能直接吃到现有铺场。`
  }

  if (
    snapshot.buildingCounts.attack > 0 &&
    (synergy.includes('melee_turret') || synergy.includes('ranged_turret') || synergy.includes('laser_turret'))
  ) {
    return `你已经摆了 ${snapshot.buildingCounts.attack} 件攻击型魔导具，这张会立刻放大现有火力。`
  }

  if (snapshot.buildingCounts.defense > 0 && synergy.includes('lava_wall')) {
    return `你前排已有 ${snapshot.buildingCounts.defense} 件屏障魔导具，这张能把前排价值继续抬高。`
  }

  if (synergy.includes('all_buildings') && snapshot.buildingCounts.energy + snapshot.buildingCounts.attack + snapshot.buildingCounts.defense >= 3) {
    return '这张不是单点补丁，而是能让你现有整套魔导具一起受益。'
  }

  return undefined
}

function getNextWaveMatch(tags: readonly string[], snapshot: BattleSnapshot) {
  let score = 0
  if (snapshot.nextWavePreview.fast > 0 && tags.some((tag) => tag.includes('fast'))) score += 0.7
  if (snapshot.nextWavePreview.flying > 0 && tags.some((tag) => tag.includes('air') || tag.includes('flying'))) score += 0.9
  if (snapshot.nextWavePreview.heavyAttack > 0 && tags.some((tag) => tag.includes('breaker') || tag.includes('repair'))) score += 0.7
  if (snapshot.nextWavePreview.hasBoss && tags.some((tag) => tag.includes('damage') || tag.includes('repair'))) score += 0.65
  return Math.min(1, score)
}

function getBuildSynergy(synergy: readonly string[], snapshot: BattleSnapshot) {
  let score = 0
  if (snapshot.buildingCounts.energy > 0 && synergy.includes('energy_core')) score += 0.6
  if (
    snapshot.buildingCounts.attack > 0 &&
    (synergy.includes('melee_turret') || synergy.includes('ranged_turret') || synergy.includes('laser_turret'))
  )
    score += 0.6
  if (snapshot.buildingCounts.defense > 0 && synergy.includes('lava_wall')) score += 0.6
  if (synergy.includes('all_buildings')) score += 0.25
  return Math.min(1, score)
}
