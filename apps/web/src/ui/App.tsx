import { useEffect } from 'react'
import { GameCanvas } from './GameCanvas'
import { HUD } from './HUD'
import { useGameUiStore } from './gameUiStore'
import { useHiddenDirector } from './useHiddenDirector'

export function App() {
  const connectBridge = useGameUiStore((state) => state.connectBridge)

  useEffect(() => connectBridge(), [connectBridge])
  useHiddenDirector()

  return (
    <main className="app-shell">
      <section className="stage">
        <GameCanvas />
        <HUD />
      </section>
    </main>
  )
}
