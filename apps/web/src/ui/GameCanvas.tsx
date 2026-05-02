import { useEffect, useRef } from 'react'
import type Phaser from 'phaser'
import { createGame } from '../game/phaser/createGame'

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current || gameRef.current) {
      return
    }

    // React mounts exactly one Phaser runtime. After this point Phaser runs its
    // own loop independently; React only receives throttled HUD snapshots.
    gameRef.current = createGame(containerRef.current)

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return <div ref={containerRef} className="game-canvas" />
}
