import { getLevelMap, type LevelId } from '@tower-rogue/game-core'
import { useEffect } from 'react'
import { useAppStore } from '../appStore'
import { GameCanvas } from '../../ui/GameCanvas'
import { HUD } from '../../ui/HUD'
import { getBattleBackgroundUrl } from '../../game/assets/assetManifest'
import { gameBridge } from '../../game/bridge/gameBridge'
import { useBattleAdvice } from '../../ui/useBattleAdvice'
import { useEnemyDirector } from '../../ui/useEnemyDirector'
import { useGameUiStore } from '../../ui/gameUiStore'
import { useStrategyCardAdvice } from '../../ui/useStrategyCardAdvice'

export function BattlePage({ levelId }: { levelId: LevelId }) {
  const battleBackgroundUrl = getBattleBackgroundUrl(getLevelMap(levelId).id)

  return (
    <main className="app-shell">
      <BattleRuntime levelId={levelId} battleBackgroundUrl={battleBackgroundUrl} />
    </main>
  )
}

function BattleRuntime({ levelId, battleBackgroundUrl }: { levelId: LevelId; battleBackgroundUrl: string }) {
  const connectBridge = useGameUiStore((state) => state.connectBridge)
  const resetBattleUi = useGameUiStore((state) => state.resetBattleUi)
  const snapshot = useGameUiStore((state) => state.snapshot)
  const openHome = useAppStore((state) => state.openHome)
  const skillLoadout = useAppStore((state) => state.skillLoadout)
  const skillLevels = useAppStore((state) => state.skillLevels)
  const claimMapClearReward = useAppStore((state) => state.claimMapClearReward)
  useBattleAdvice()
  useEnemyDirector()
  useStrategyCardAdvice()

  useEffect(() => {
    resetBattleUi()
    const disconnect = connectBridge()

    return () => {
      disconnect()
      resetBattleUi()
    }
  }, [connectBridge, resetBattleUi])

  useEffect(() => {
    if (snapshot?.phase !== 'won') {
      return
    }

    claimMapClearReward(levelId)
  }, [claimMapClearReward, levelId, snapshot?.phase])

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Escape') {
        return
      }

      const target = event.target as HTMLElement | null
      const tagName = target?.tagName
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target?.isContentEditable) {
        return
      }

      gameBridge.dispatch({ type: 'clearSelectedPlant' })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <section
      className="stage"
      onContextMenu={(event) => {
        event.preventDefault()
        gameBridge.dispatch({ type: 'clearSelectedPlant' })
      }}
      style={{
        backgroundImage: `linear-gradient(180deg, rgba(24, 10, 8, 0.15), rgba(24, 10, 8, 0.35)), url("${battleBackgroundUrl}")`
      }}
    >
      <GameCanvas levelId={levelId} skillLoadout={skillLoadout} skillLevels={skillLevels} />
      <HUD onExitMap={openHome} />
    </section>
  )
}
