import type { SeedSlot } from '@tower-rogue/game-core'

type SeedBankProps = {
  isFinished: boolean
  seedBank: SeedSlot[]
  onSelect: (seed: SeedSlot, mode: 'single' | 'persistent') => void
}

export function SeedBank({ isFinished, seedBank, onSelect }: SeedBankProps) {
  const slotArtSources: Record<SeedSlot['type'], string> = {
    energy_core: '/assets/ui/soul_conduit_card.png',
    melee_turret: '/assets/ui/guardian_device_card.png',
    ranged_turret: '/assets/ui/selection_device_card.png',
    laser_turret: '/assets/ui/mystic_device_card.png',
    lava_wall: '/assets/ui/barrier_device_card.png'
  }

  return (
    <aside className="seed-bank-sidebar" aria-label="魔导具">
      <span className="seed-bank-sidebar-title">魔导具</span>
      <div className="seed-bank-sidebar-list">
        {seedBank.map((seed) => {
          const disabled = isFinished || seed.cooldownRemaining > 0

          return (
            <button
              type="button"
              key={seed.type}
              className={`seed-sidebar-slot ${seed.role} ${seed.selected ? 'selected' : ''} ${seed.selectedMode === 'persistent' ? 'persistent' : ''}`}
              disabled={disabled}
              onClick={(event) => onSelect(seed, event.shiftKey ? 'persistent' : 'single')}
              onDoubleClick={() => onSelect(seed, 'persistent')}
              title={`${seed.name} · 消耗 ${seed.cost}${seed.selectedMode === 'persistent' ? ' · 连建中' : ''}`}
              aria-label={`${seed.name}，消耗 ${seed.cost}${seed.cooldownRemaining > 0 ? `，冷却 ${seed.cooldownRemaining.toFixed(1)} 秒` : ''}`}
            >
              <img className="seed-sidebar-slot-art" src={slotArtSources[seed.type]} alt="" aria-hidden="true" draggable={false} />
              <span className="seed-sidebar-slot-cost">{seed.cost}</span>
              {seed.selected ? (
                <span className={`seed-sidebar-slot-mode ${seed.selectedMode ?? 'single'}`}>
                  {seed.selectedMode === 'persistent' ? '连建' : '单次'}
                </span>
              ) : null}
              {seed.cooldownRemaining > 0 ? <span className="seed-sidebar-cooldown">{seed.cooldownRemaining.toFixed(1)}s</span> : null}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
