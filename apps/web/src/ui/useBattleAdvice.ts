import type { HudSnapshot, RecommendationSlot } from '@tower-rogue/game-core'
import type { BattleAdviceRequest } from '@tower-rogue/shared'
import { useEffect, useRef } from 'react'
import { streamBattleAdvice } from '../api/battleAdvice'
import { useGameUiStore } from './gameUiStore'

export function useBattleAdvice() {
  const snapshot = useGameUiStore((state) => state.snapshot)
  const clearBattleAdvice = useGameUiStore((state) => state.clearBattleAdvice)
  const appendBattleAdvice = useGameUiStore((state) => state.appendBattleAdvice)
  const setBattleAdvice = useGameUiStore((state) => state.setBattleAdvice)
  const setBattleAdviceLoading = useGameUiStore((state) => state.setBattleAdviceLoading)
  const setBattleAdviceDurationMs = useGameUiStore((state) => state.setBattleAdviceDurationMs)
  const latestRequestId = useRef(0)
  const requestedSelectionKey = useRef('idle')
  const abortController = useRef<AbortController | null>(null)
  const selectionKey =
    snapshot?.phase === 'card_select' && snapshot.recommendations.length > 0
      ? [
          snapshot.levelId,
          snapshot.wave,
          snapshot.cardSelectionSource ?? 'none',
          snapshot.recommendations.map((recommendation) => recommendation.cardId).join(',')
        ].join('|')
      : 'idle'

  useEffect(() => {
    return () => {
      abortController.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!snapshot || snapshot.phase !== 'card_select' || snapshot.recommendations.length === 0) {
      abortController.current?.abort()
      abortController.current = null
      latestRequestId.current += 1
      requestedSelectionKey.current = 'idle'
      clearBattleAdvice()
      return
    }

    if (requestedSelectionKey.current === selectionKey) {
      return
    }

    const requestId = latestRequestId.current + 1
    latestRequestId.current = requestId
    requestedSelectionKey.current = selectionKey
    abortController.current?.abort()

    const controller = new AbortController()
    abortController.current = controller
    const startedAt = performance.now()

    setBattleAdvice('')
    setBattleAdviceLoading(true)
    setBattleAdviceDurationMs(undefined)

    streamBattleAdvice(createAdviceRequest(snapshot), appendBattleAdvice, controller.signal)
      .catch(() => {
        if (!controller.signal.aborted && requestId === latestRequestId.current) {
          setBattleAdvice('AI分析暂不可用，优先选择能缓解当前压力的卡牌，并补强薄弱路线。')
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && requestId === latestRequestId.current) {
          setBattleAdviceDurationMs(Math.round(performance.now() - startedAt))
          setBattleAdviceLoading(false)
        }
      })

    return () => {
      controller.abort()
      if (requestId === latestRequestId.current) {
        setBattleAdviceLoading(false)
      }
    }
  }, [
    appendBattleAdvice,
    clearBattleAdvice,
    selectionKey,
    setBattleAdvice,
    setBattleAdviceDurationMs,
    setBattleAdviceLoading,
    snapshot
  ])
}

function createAdviceRequest(snapshot: HudSnapshot): BattleAdviceRequest {
  return {
    baseHp: snapshot.baseHp,
    purchasePower: snapshot.purchasePower,
    wave: snapshot.wave,
    phase: snapshot.phase,
    plants: snapshot.plants,
    enemies: snapshot.enemies,
    recommendations: snapshot.recommendations.map(toRecommendationInput)
  }
}

function toRecommendationInput(recommendation: RecommendationSlot) {
  return {
    name: recommendation.card.name,
    description: recommendation.card.description,
    slot: recommendation.slot
  }
}
