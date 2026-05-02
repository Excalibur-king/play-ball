import { useEffect, useRef } from 'react'
import { requestHiddenDirector } from '../api/director'
import { gameBridge } from '../game/bridge/gameBridge'
import { useGameUiStore } from './gameUiStore'

export function useHiddenDirector() {
  const snapshot = useGameUiStore((state) => state.snapshot)
  const processedWaves = useRef(new Set<number>())

  useEffect(() => {
    if (!snapshot) {
      return
    }

    if (snapshot.phase === 'ready' && snapshot.wave === 1) {
      processedWaves.current.clear()
    }

    if (snapshot.phase !== 'ready' || snapshot.wave <= 1 || processedWaves.current.has(snapshot.wave)) {
      return
    }

    // This is intentionally not exposed in the HUD. The backend/model can tune
    // pacing between waves, but all visible gameplay still comes from game-core.
    processedWaves.current.add(snapshot.wave)
    let cancelled = false

    requestHiddenDirector({
      baseHp: snapshot.baseHp,
      sun: snapshot.sun,
      wave: snapshot.wave,
      phase: snapshot.phase,
      plantCount: snapshot.plantCount,
      zombieCount: snapshot.zombieCount
    }).then((response) => {
      if (!cancelled) {
        gameBridge.dispatch({
          type: 'applyDirectorAdjustment',
          adjustment: response.adjustment
        })
      }
    })

    return () => {
      cancelled = true
    }
  }, [snapshot])
}
