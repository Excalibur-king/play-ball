import type { HudSnapshot, SeedSlot } from '@tower-rogue/game-core'
import { gameBridge } from '../game/bridge/gameBridge'
import { ActionBar } from './ActionBar'
import { MatchStats } from './MatchStats'
import { SeedBank } from './SeedBank'
import { SunCounter } from './SunCounter'
import { useGameUiStore } from './gameUiStore'

export function HUD() {
  const snapshot = useGameUiStore((state) => state.snapshot)

  if (!snapshot) {
    return null
  }

  return <HUDContent snapshot={snapshot} />
}

// HUDContent is split from the store-bound wrapper so it can be tested or
// storybooked later with a plain HudSnapshot fixture.
function HUDContent({ snapshot }: { snapshot: HudSnapshot }) {
  const isFinished = snapshot.phase === 'won' || snapshot.phase === 'lost'

  function selectSeed(seed: SeedSlot) {
    gameBridge.dispatch({ type: 'selectPlant', plantType: seed.type })
  }

  return (
    <div className="hud-layer">
      <div className="top-hud">
        <SunCounter sun={snapshot.sun} />
        <SeedBank isFinished={isFinished} seedBank={snapshot.seedBank} onSelect={selectSeed} />
        <MatchStats
          baseHp={snapshot.baseHp}
          wave={snapshot.wave}
          totalWaves={snapshot.totalWaves}
          fusionCount={snapshot.fusionCount}
          zombieCount={snapshot.zombieCount}
          dangerousZombieCount={snapshot.dangerousZombieCount}
        />
      </div>

      <ActionBar
        canStartWave={snapshot.canStartWave}
        isFinished={isFinished}
        paused={snapshot.paused}
        onStartWave={() => gameBridge.dispatch({ type: 'startWave' })}
        onPauseToggle={() => gameBridge.dispatch({ type: 'setPaused', paused: !snapshot.paused })}
        onReset={() => gameBridge.dispatch({ type: 'resetRun' })}
      />

      {snapshot.phase === 'ready' && !isFinished && <div className="status-chip">Wave Ready</div>}

      {isFinished && <div className={`result-banner ${snapshot.phase}`}>{snapshot.phase === 'won' ? 'Lawn Safe' : 'Yard Overrun'}</div>}
    </div>
  )
}
