import { defaultLevelId } from '@tower-rogue/game-core'
import { BattlePage } from './pages/BattlePage'
import { HomePage } from './pages/HomePage'
import { PrototypePage } from './pages/PrototypePage'
import { useAppStore } from './appStore'

export function App() {
  const screen = useAppStore((state) => state.screen)
  const activeLevelId = useAppStore((state) => state.activeLevelId)

  if (screen === 'prototype') {
    return <PrototypePage />
  }

  if (screen === 'battle') {
    return <BattlePage levelId={activeLevelId ?? defaultLevelId} />
  }

  return <HomePage />
}
