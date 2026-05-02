import type { SeedSlot } from '@tower-rogue/game-core'
import { Crosshair, Shield, Sprout } from 'lucide-react'

type SeedBankProps = {
  isFinished: boolean
  seedBank: SeedSlot[]
  onSelect: (seed: SeedSlot) => void
}

// SeedBank stays declarative: it exposes selected seed intent,
// while Phaser/game-core decide whether the click can affect the board.
export function SeedBank({ isFinished, seedBank, onSelect }: SeedBankProps) {
  return (
    <div className="seed-bank">
      {seedBank.map((seed) => (
        <button
          key={seed.type}
          className={`seed-card ${seed.role} ${seed.selected ? 'selected' : ''}`}
          disabled={isFinished || seed.cooldownRemaining > 0}
          onClick={() => onSelect(seed)}
          title={`${seed.name}: plant on empty cells or fuse into another plant`}
        >
          <span className="seed-icon">
            <SeedIcon seed={seed} />
          </span>
          <span className="seed-name">{seed.name}</span>
          <span className="seed-cost">{seed.cost}</span>
          {seed.cooldownRemaining > 0 && <span className="cooldown">{seed.cooldownRemaining.toFixed(1)}s</span>}
        </button>
      ))}
    </div>
  )
}

function SeedIcon({ seed }: { seed: SeedSlot }) {
  if (seed.role === 'damage') {
    return <Crosshair size={18} />
  }

  if (seed.role === 'blocker') {
    return <Shield size={18} />
  }

  return <Sprout size={18} />
}
