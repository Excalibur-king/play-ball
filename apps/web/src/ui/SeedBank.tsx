import type { SeedSlot } from '@tower-rogue/game-core'

function getRoleLabel(seed: SeedSlot): { text: string; cls: string } {
  if (seed.role === 'energy') return { text: '能量', cls: 'energy' }
  if (seed.role === 'defense') return { text: '防御', cls: 'defense' }
  switch (seed.attackKind) {
    case 'melee': return { text: '近战', cls: 'atk-melee' }
    case 'laser': return { text: '激光', cls: 'atk-laser' }
    case 'projectile': return { text: '远程', cls: 'atk-ranged' }
    default: return { text: '攻击', cls: 'atk-default' }
  }
}

type SeedBankProps = {
  isFinished: boolean
  seedBank: SeedSlot[]
  onSelect: (seed: SeedSlot, mode: 'single' | 'persistent') => void
}

export function SeedBank({ isFinished, seedBank, onSelect }: SeedBankProps) {
  const slotArtSources: Record<SeedSlot['type'], string> = {
    energy_core: '/assets/game/units/buildings/energy_core/idle.png',
    melee_turret: '/assets/game/units/buildings/melee_turret/idle.png',
    ranged_turret: '/assets/game/units/buildings/ranged_turret/idle.png',
    laser_turret: '/assets/game/units/buildings/laser_turret/idle.png',
    lava_wall: '/assets/game/units/buildings/lava_wall/idle.png'
  }

  return (
    <aside className="seed-bank-sidebar" aria-label="冒险团">
      <span className="seed-bank-sidebar-title">冒险团</span>
      <div className="seed-bank-sidebar-list">
        {seedBank.map((seed) => {
          const disabled = isFinished || seed.cooldownRemaining > 0
          const roleLabel = getRoleLabel(seed)

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
              <span className={`seed-sidebar-slot-role ${roleLabel.cls}`}>{roleLabel.text}</span>
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
