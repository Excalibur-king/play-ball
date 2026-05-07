type CardWithEffect = {
  effect: Record<string, unknown>
}

export function formatStrategyCardDamage(card: CardWithEffect) {
  return formatStrategyCardDamageAtLevel(card, 0)
}

export function formatStrategyCardDamageAtLevel(card: CardWithEffect, level: number) {
  const effect = card.effect

  if (typeof effect.damage !== 'number') {
    return undefined
  }

  const scaling = 1 + Math.max(0, Math.min(100, Math.floor(level))) / 100
  const damage = Math.round(effect.damage * scaling)

  if (typeof effect.bossDamage === 'number') {
    return `伤害 ${damage}（Boss ${Math.round(effect.bossDamage * scaling)}）`
  }

  const hits = getHitCount(effect)

  if (hits > 1) {
    return `伤害 ${damage} x ${hits}`
  }

  return `伤害 ${damage}`
}

function getHitCount(effect: Record<string, unknown>) {
  if (typeof effect.count === 'number') {
    return effect.count
  }

  if (typeof effect.strikes === 'number') {
    return effect.strikes
  }

  if (typeof effect.bounces === 'number') {
    return effect.bounces
  }

  return 1
}
