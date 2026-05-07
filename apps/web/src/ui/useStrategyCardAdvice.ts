import { recommendStrategyCards, type StrategyCardId } from '@tower-rogue/game-core'
import { useEffect, useRef } from 'react'
import { gameBridge } from '../game/bridge/gameBridge'
import { requestLatestStrategyAdviceDebug, requestStrategyAdvice } from '../api/strategyAdvice'
import { useGameUiStore } from './gameUiStore'

export function useStrategyCardAdvice() {
  const snapshot = useGameUiStore((state) => state.snapshot)
  const clearStrategyAdvice = useGameUiStore((state) => state.clearStrategyAdvice)
  const setStrategyAdviceDebug = useGameUiStore((state) => state.setStrategyAdviceDebug)
  const setStrategyAdviceDebugLoading = useGameUiStore((state) => state.setStrategyAdviceDebugLoading)
  const setStrategyAdvice = useGameUiStore((state) => state.setStrategyAdvice)
  const setStrategyAdviceLoading = useGameUiStore((state) => state.setStrategyAdviceLoading)
  const latestRequestId = useRef(0)
  const requestedSelectionKey = useRef<string>('idle')
  const cardSelectionSource = snapshot?.cardSelectionSource
  const cardSelectionSnapshot = snapshot?.cardSelectionSnapshot
  const selectionKey =
    snapshot?.phase === 'card_select' && cardSelectionSource && cardSelectionSnapshot
      ? [
          cardSelectionSource,
          cardSelectionSnapshot.wave,
          cardSelectionSnapshot.problemTags.join(','),
          cardSelectionSnapshot.chosenCardTags.join(',')
        ].join('|')
      : 'idle'

  useEffect(() => {
    if (
      !snapshot ||
      snapshot.phase !== 'card_select' ||
      !cardSelectionSource ||
      !cardSelectionSnapshot
    ) {
      latestRequestId.current += 1
      requestedSelectionKey.current = 'idle'
      clearStrategyAdvice()
      return
    }

    if (requestedSelectionKey.current === selectionKey) {
      return
    }

    const requestId = latestRequestId.current + 1
    latestRequestId.current = requestId
    requestedSelectionKey.current = selectionKey

    gameBridge.dispatch({
      type: 'hydrateStrategyRecommendations',
      recommendations: recommendStrategyCards(cardSelectionSnapshot)
    })

    setStrategyAdvice(null)
    setStrategyAdviceLoading(true)
    setStrategyAdviceDebug(null)
    setStrategyAdviceDebugLoading(true)

    void (async () => {
      const response = await requestStrategyAdvice({
        source: cardSelectionSource,
        snapshot: cardSelectionSnapshot
      })

      if (requestId !== latestRequestId.current) {
        return
      }

      if (response?.recommendations?.length) {
        gameBridge.dispatch({
          type: 'hydrateStrategyRecommendations',
          recommendations: response.recommendations.map((recommendation, index) => ({
            cardId: recommendation.cardId as StrategyCardId,
            slot: recommendation.slot,
            score: 100 - index * 5,
            reason: recommendation.reason
          }))
        })
      }

      setStrategyAdvice(response)
      setStrategyAdviceLoading(false)

      void requestLatestStrategyAdviceDebug().then((debugSnapshot) => {
        if (requestId !== latestRequestId.current) {
          return
        }

        setStrategyAdviceDebug(debugSnapshot)
        setStrategyAdviceDebugLoading(false)
      })
    })()

    return () => {
      if (requestId === latestRequestId.current) {
        setStrategyAdviceLoading(false)
        setStrategyAdviceDebugLoading(false)
      }
    }
  }, [
    clearStrategyAdvice,
    selectionKey,
    setStrategyAdvice,
    setStrategyAdviceDebug,
    setStrategyAdviceDebugLoading,
    setStrategyAdviceLoading,
    snapshot?.phase,
    cardSelectionSource,
    cardSelectionSnapshot
  ])
}
