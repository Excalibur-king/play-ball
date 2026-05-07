import { useEffect, useRef } from 'react'
import type { LevelId, StrategyCardId } from '@tower-rogue/game-core'
import type Phaser from 'phaser'
import { createGame } from '../game/phaser/createGame'

export function GameCanvas({
  levelId,
  skillLoadout,
  skillLevels
}: {
  levelId: LevelId
  skillLoadout: StrategyCardId[]
  skillLevels: Partial<Record<StrategyCardId, number>>
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    // React mounts exactly one Phaser runtime. After this point Phaser runs its
    // own loop independently; React only receives throttled HUD snapshots.
    const game = createGame(containerRef.current, { levelId, skillLoadout, skillLevels })
    gameRef.current = game

    return () => {
      game.destroy(true)

      if (gameRef.current === game) {
        gameRef.current = null
      }
    }
  }, [levelId, skillLoadout, skillLevels])

  return <div ref={containerRef} className="game-canvas" />
}
