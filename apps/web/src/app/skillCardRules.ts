import { isStrategyCardImplemented, strategyCards, type StrategyCardId } from '@tower-rogue/game-core'

type SkillCardLocks = {
  ownedPremiumCards: StrategyCardId[]
  unlockedRewardCards: StrategyCardId[]
}

export const premiumCardCosts: Partial<Record<StrategyCardId, number>> = {
  premium_starfall_contract: 1
}

export function getSkillCardById(cardId: StrategyCardId) {
  return strategyCards.find((card) => card.id === cardId)
}

export function isRewardCard(cardId: StrategyCardId) {
  return Boolean((getSkillCardById(cardId)?.tags as readonly string[] | undefined)?.includes('reward'))
}

export function isPremiumCard(cardId: StrategyCardId) {
  return Boolean((getSkillCardById(cardId)?.tags as readonly string[] | undefined)?.includes('premium'))
}

export function canEquipSkillCard(cardId: StrategyCardId, locks: SkillCardLocks) {
  const card = getSkillCardById(cardId)

  if (!card || !isStrategyCardImplemented(card)) {
    return false
  }

  if (isPremiumCard(cardId) && !locks.ownedPremiumCards.includes(cardId)) {
    return false
  }

  if (isRewardCard(cardId) && !locks.unlockedRewardCards.includes(cardId)) {
    return false
  }

  return true
}

export function sanitizeSkillLoadout(cardIds: StrategyCardId[], locks: SkillCardLocks) {
  return [...new Set(cardIds)].filter((cardId) => canEquipSkillCard(cardId, locks)).slice(0, 5)
}

export function getSkillCardDescription(
  cardId: StrategyCardId,
  locks: SkillCardLocks,
  fallbackDescription: string
) {
  const card = getSkillCardById(cardId)

  if (!card || !isStrategyCardImplemented(card)) {
    return '待实现，暂不可加入技能包'
  }

  if (isPremiumCard(cardId) && !locks.ownedPremiumCards.includes(cardId)) {
    return '商店购买后可加入技能包'
  }

  if (isRewardCard(cardId) && !locks.unlockedRewardCards.includes(cardId)) {
    return '通关解锁后可加入技能包'
  }

  return fallbackDescription
}
