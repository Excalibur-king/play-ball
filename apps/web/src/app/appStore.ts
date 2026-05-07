import {
  defaultLevelId,
  defaultSkillLoadout,
  getLevelDefinition,
  type LevelId,
  type StrategyCardId
} from '@tower-rogue/game-core'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { sanitizeSkillLoadout } from './skillCardRules'

const MAX_SKILL_LEVEL = 100
const INITIAL_GOLD = 0
const INITIAL_SKILL_CRYSTALS = 10
export const DAILY_SKILL_CRYSTAL_PURCHASE_LIMIT = 5
export const SKILL_CRYSTAL_GOLD_COST = 1000

export type MapClearReward = {
  levelId: LevelId
  gold: number
  skillCrystals: number
  unlockedCardId?: StrategyCardId
}

export type AppScreen = 'home' | 'battle' | 'prototype'

type AppState = {
  screen: AppScreen
  activeLevelId: LevelId | null
  highlightedLevelId: LevelId
  gold: number
  skillCrystals: number
  inspirationCrystals: number
  skillLoadout: StrategyCardId[]
  skillLevels: Partial<Record<StrategyCardId, number>>
  dailySkillCrystalPurchases: number
  skillCrystalPurchaseDate: string
  ownedPremiumCards: StrategyCardId[]
  unlockedRewardCards: StrategyCardId[]
  latestUnlockedRewardCardId?: StrategyCardId
  latestMapClearReward?: MapClearReward
  setSkillLoadout: (cardIds: StrategyCardId[]) => void
  buyPremiumCard: (cardId: StrategyCardId, cost: number) => boolean
  buyDailySkillCrystal: () => boolean
  unlockRewardCard: (cardId: StrategyCardId) => boolean
  claimMapClearReward: (levelId: LevelId) => MapClearReward | undefined
  upgradeSkillCard: (cardId: StrategyCardId) => boolean
  dismissLatestUnlockedRewardCard: () => void
  dismissLatestMapClearReward: () => void
  openHome: () => void
  openPrototype: () => void
  startLevel: (levelId: LevelId) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      screen: 'home',
      activeLevelId: null,
      highlightedLevelId: defaultLevelId,
      gold: INITIAL_GOLD,
      skillCrystals: INITIAL_SKILL_CRYSTALS,
      inspirationCrystals: 0,
      skillLoadout: [...defaultSkillLoadout],
      skillLevels: {},
      dailySkillCrystalPurchases: 0,
      skillCrystalPurchaseDate: getTodayKey(),
      ownedPremiumCards: [],
      unlockedRewardCards: [],
      latestUnlockedRewardCardId: undefined,
      latestMapClearReward: undefined,
      setSkillLoadout: (cardIds) =>
        set((state) => ({
          skillLoadout: sanitizeSkillLoadout(cardIds, state)
        })),
      buyPremiumCard: (cardId, cost) => {
        let purchased = false

        set((state) => {
          if (state.ownedPremiumCards.includes(cardId) || state.inspirationCrystals < cost) {
            return state
          }

          purchased = true
          const ownedPremiumCards = [...state.ownedPremiumCards, cardId]

          return {
            inspirationCrystals: state.inspirationCrystals - cost,
            ownedPremiumCards,
            skillLoadout: sanitizeSkillLoadout(state.skillLoadout, {
              ...state,
              ownedPremiumCards
            })
          }
        })

        return purchased
      },
      buyDailySkillCrystal: () => {
        let purchased = false

        set((state) => {
          const todayKey = getTodayKey()
          const dailySkillCrystalPurchases =
            state.skillCrystalPurchaseDate === todayKey ? state.dailySkillCrystalPurchases : 0

          if (
            state.gold < SKILL_CRYSTAL_GOLD_COST ||
            dailySkillCrystalPurchases >= DAILY_SKILL_CRYSTAL_PURCHASE_LIMIT
          ) {
            return {
              dailySkillCrystalPurchases,
              skillCrystalPurchaseDate: todayKey
            }
          }

          purchased = true

          return {
            gold: state.gold - SKILL_CRYSTAL_GOLD_COST,
            skillCrystals: state.skillCrystals + 1,
            dailySkillCrystalPurchases: dailySkillCrystalPurchases + 1,
            skillCrystalPurchaseDate: todayKey
          }
        })

        return purchased
      },
      unlockRewardCard: (cardId) => {
        let unlocked = false

        set((state) => {
          if (state.unlockedRewardCards.includes(cardId)) {
            return state
          }

          unlocked = true
          const unlockedRewardCards = [...state.unlockedRewardCards, cardId]

          return {
            unlockedRewardCards,
            latestUnlockedRewardCardId: cardId,
            skillLoadout: sanitizeSkillLoadout(state.skillLoadout, {
              ...state,
              unlockedRewardCards
            })
          }
        })

        return unlocked
      },
      claimMapClearReward: (levelId) => {
        const level = getLevelDefinition(levelId)
        let reward: MapClearReward | undefined

        set((state) => {
          if (state.latestMapClearReward?.levelId === levelId) {
            reward = state.latestMapClearReward
            return state
          }

          const gold = rollRewardAmount(level.clearReward.gold)
          const skillCrystals = rollRewardAmount(level.clearReward.skillCrystals)
          const firstClearCardId = 'firstClearCardId' in level.clearReward ? level.clearReward.firstClearCardId : undefined
          const shouldUnlockCard = Boolean(firstClearCardId && !state.unlockedRewardCards.includes(firstClearCardId))
          const unlockedRewardCards =
            firstClearCardId && shouldUnlockCard ? [...state.unlockedRewardCards, firstClearCardId] : state.unlockedRewardCards

          reward = {
            levelId,
            gold,
            skillCrystals,
            unlockedCardId: shouldUnlockCard ? firstClearCardId : undefined
          }

          return {
            gold: state.gold + gold,
            skillCrystals: state.skillCrystals + skillCrystals,
            unlockedRewardCards,
            latestUnlockedRewardCardId: shouldUnlockCard ? firstClearCardId : state.latestUnlockedRewardCardId,
            latestMapClearReward: reward,
            skillLoadout: sanitizeSkillLoadout(state.skillLoadout, {
              ...state,
              unlockedRewardCards
            })
          }
        })

        return reward
      },
      upgradeSkillCard: (cardId) => {
        let upgraded = false

        set((state) => {
          const currentLevel = getSkillCardLevel(state.skillLevels, cardId)

          if (currentLevel >= MAX_SKILL_LEVEL) {
            return state
          }

          const cost = getSkillCardUpgradeCost(currentLevel)
          if (state.skillCrystals < cost) {
            return state
          }

          upgraded = true
          return {
            skillCrystals: state.skillCrystals - cost,
            skillLevels: {
              ...state.skillLevels,
              [cardId]: currentLevel + 1
            }
          }
        })

        return upgraded
      },
      dismissLatestUnlockedRewardCard: () =>
        set({
          latestUnlockedRewardCardId: undefined
        }),
      dismissLatestMapClearReward: () =>
        set({
          latestMapClearReward: undefined
        }),
      openHome: () =>
        set((state) => ({
          screen: 'home',
          activeLevelId: null,
          highlightedLevelId: state.highlightedLevelId
        })),
      openPrototype: () =>
        set({
          screen: 'prototype'
        }),
      startLevel: (levelId) =>
        set({
          screen: 'battle',
          activeLevelId: levelId,
          highlightedLevelId: levelId
        })
    }),
    {
      name: 'tower-rogue-app-store',
      partialize: (state) => ({
        highlightedLevelId: state.highlightedLevelId,
        gold: state.gold,
        skillCrystals: state.skillCrystals,
        inspirationCrystals: state.inspirationCrystals,
        skillLoadout: state.skillLoadout,
        skillLevels: state.skillLevels,
        dailySkillCrystalPurchases: state.dailySkillCrystalPurchases,
        skillCrystalPurchaseDate: state.skillCrystalPurchaseDate,
        ownedPremiumCards: state.ownedPremiumCards,
        unlockedRewardCards: state.unlockedRewardCards
      }),
      merge: (persistedState, currentState) => {
        const merged = {
          ...currentState,
          ...(persistedState as Partial<AppState>)
        }

        return {
          ...merged,
          gold: Math.max(INITIAL_GOLD, merged.gold ?? INITIAL_GOLD),
          skillCrystals: Math.max(INITIAL_SKILL_CRYSTALS, merged.skillCrystals ?? INITIAL_SKILL_CRYSTALS),
          dailySkillCrystalPurchases:
            merged.skillCrystalPurchaseDate === getTodayKey() ? merged.dailySkillCrystalPurchases ?? 0 : 0,
          skillCrystalPurchaseDate: merged.skillCrystalPurchaseDate ?? getTodayKey(),
          skillLoadout: sanitizeSkillLoadout(merged.skillLoadout, merged)
        }
      }
    }
  )
)

export function getSkillCardLevel(skillLevels: Partial<Record<StrategyCardId, number>>, cardId: StrategyCardId) {
  return Math.max(0, Math.min(MAX_SKILL_LEVEL, Math.floor(skillLevels[cardId] ?? 0)))
}

export function getSkillCardUpgradeCost(currentLevel: number) {
  if (currentLevel < 30) {
    return 2
  }

  if (currentLevel < 60) {
    return 4
  }

  if (currentLevel < 90) {
    return 6
  }

  return 8
}

function rollRewardAmount(range: readonly [number, number]) {
  const [min, max] = range
  return Math.round(min + Math.random() * Math.max(0, max - min))
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10)
}
