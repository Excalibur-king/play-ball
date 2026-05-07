import type { SkillPackSlot, StrategyCardId } from '@tower-rogue/game-core'
import { StrategyCardArtwork } from './StrategyCardArtwork'

type ActionBarProps = {
  canStartWave: boolean
  canDrawStrategyCards: boolean
  shouldPulseStartWave: boolean
  isFinished: boolean
  isSelectingCards: boolean
  paused: boolean
  strategyCardDrawCooldownRemaining: number
  skillPack: SkillPackSlot[]
  onDrawStrategyCards: () => void
  onStartWave: () => void
  onPauseToggle: () => void
  onReset: () => void
  onExitMap: () => void
  onUseSkill: (cardId: StrategyCardId) => void
}

export function ActionBar({
  canDrawStrategyCards,
  strategyCardDrawCooldownRemaining,
  skillPack,
  onDrawStrategyCards,
  onReset,
  onExitMap,
  onUseSkill
}: ActionBarProps) {
  const drawCooldownLabel =
    strategyCardDrawCooldownRemaining > 0 ? `${Math.ceil(strategyCardDrawCooldownRemaining)}s` : '抽卡'

  return (
    <div className="bottom-bar">
      <div className="bottom-bar-left">
        <button
          type="button"
          className="bottom-bar-btn accent"
          disabled={!canDrawStrategyCards}
          title="抽取策略卡"
          onClick={onDrawStrategyCards}
        >
          {drawCooldownLabel}
        </button>
      </div>

      <div className="bottom-bar-skills">
        {skillPack.map((slot) => {
          const stateClass = slot.used ? 'used' : slot.usable ? 'ready' : 'locked'
          return (
            <button
              type="button"
              key={slot.cardId}
              className={`bottom-bar-skill ${slot.card.type} ${stateClass}`}
              disabled={!slot.usable}
              title={slot.used ? '已使用' : slot.disabledReason ?? slot.card.name}
              onClick={() => onUseSkill(slot.cardId)}
            >
              <div className="bottom-bar-skill-art">
                <StrategyCardArtwork
                  cardId={slot.cardId}
                  name={slot.card.name}
                  type={slot.card.type}
                  className="skill-inline-art"
                />
              </div>
              <span className="bottom-bar-skill-name">{slot.card.name}</span>
              {slot.used && <span className="bottom-bar-skill-used">✓</span>}
            </button>
          )
        })}
      </div>

      <div className="bottom-bar-right">
        <button type="button" className="bottom-bar-btn" title="重开本局" onClick={onReset}>
          ⟳
        </button>
        <button type="button" className="bottom-bar-btn" title="退出地图" onClick={onExitMap}>
          ✕
        </button>
      </div>
    </div>
  )
}
