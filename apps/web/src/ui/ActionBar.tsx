import type { SkillPackSlot, StrategyCardId } from '@tower-rogue/game-core'
import { useRef, useState } from 'react'
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
  const isCooldown = strategyCardDrawCooldownRemaining > 0
  const drawCooldownLabel = isCooldown ? `${Math.ceil(strategyCardDrawCooldownRemaining)}s` : '抽卡'
  const drawStateClass = !canDrawStrategyCards
    ? 'disabled'
    : isCooldown
      ? 'cooldown'
      : 'ready'

  return (
    <div className="bottom-bar">
      <div className="bottom-bar-center">
        <button
          type="button"
          className={`draw-card-btn ${drawStateClass}`}
          disabled={!canDrawStrategyCards}
          title="抽取策略卡"
          onClick={onDrawStrategyCards}
        >
          <span className="draw-card-btn-icon">&#9830;</span>
          <span className="draw-card-btn-label">{drawCooldownLabel}</span>
        </button>

        {skillPack.map((slot) => {
          const stateClass = slot.used ? 'used' : slot.usable ? 'ready' : 'locked'
          return (
            <SkillTooltipWrapper key={slot.cardId} slot={slot}>
              <button
                type="button"
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
            </SkillTooltipWrapper>
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

const TOOLTIP_DELAY_MS = 300

const TYPE_LABELS: Record<string, string> = {
  attack: '攻击',
  energy: '能量',
  defense: '防御',
  emergency: '紧急',
  pivot: '转折',
  summon: '召唤',
  spell: '法术',
  reward: '奖励',
  premium: '高级'
}

function SkillTooltipWrapper({ slot, children }: { slot: SkillPackSlot; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)

  const show = () => {
    clearTimeout(hideTimerRef.current)
    timerRef.current = setTimeout(() => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect()
        setPos({ x: rect.left + rect.width / 2, y: rect.top })
      }
      setVisible(true)
    }, TOOLTIP_DELAY_MS)
  }

  const scheduleHide = () => {
    clearTimeout(timerRef.current)
    hideTimerRef.current = setTimeout(() => setVisible(false), 80)
  }

  const cancelHide = () => {
    clearTimeout(hideTimerRef.current)
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: tooltip wrapper needs mouse events
    <div className="skill-tooltip-wrapper" role="group" ref={wrapperRef} onMouseEnter={show} onMouseLeave={scheduleHide}>
      {children}
      {visible && pos && <SkillTooltip slot={slot} position={pos} onMouseEnter={cancelHide} onMouseLeave={scheduleHide} />}
    </div>
  )
}

function SkillTooltip({ slot, position, onMouseEnter, onMouseLeave }: {
  slot: SkillPackSlot
  position: { x: number; y: number }
  onMouseEnter: () => void
  onMouseLeave: () => void
}) {
  const { card, cardId, level, used, disabledReason } = slot
  const typeLabel = TYPE_LABELS[card.type] ?? card.type
  const effectValue = getEffectValue(card.effect)

  return (
    <div
      className="skill-tooltip"
      role="tooltip"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="skill-tooltip-art">
        <StrategyCardArtwork cardId={cardId} name={card.name} type={card.type} className="skill-tooltip-art-inner" />
      </div>
      <div className="skill-tooltip-body">
        <div className="skill-tooltip-header">
          <span className={`skill-tooltip-type ${card.type}`}>{typeLabel}</span>
          <strong className="skill-tooltip-name">{card.name}</strong>
          {level > 1 && <span className="skill-tooltip-level">Lv.{level}</span>}
        </div>
        <p className="skill-tooltip-desc">{card.description}</p>
        {effectValue && <span className="skill-tooltip-effect-badge">{effectValue}</span>}
        {card.tags.length > 0 && (
          <div className="skill-tooltip-tags">
            {card.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
        {card.synergy.length > 0 && (
          <div className="skill-tooltip-synergy">
            <span className="skill-tooltip-synergy-label">协同</span>
            {card.synergy.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        )}
        {used && <span className="skill-tooltip-status used">已使用</span>}
        {!used && disabledReason && <span className="skill-tooltip-status locked">{disabledReason}</span>}
      </div>
    </div>
  )
}

function getEffectValue(effect: { kind: string; [key: string]: unknown }): string | null {
  const { kind } = effect
  if ('damage' in effect && typeof effect.damage === 'number') {
    return `${effect.damage} DMG`
  }
  if ('heal' in effect && typeof effect.heal === 'number') {
    return `${effect.heal} HEAL`
  }
  if ('sun' in effect && typeof effect.sun === 'number') {
    return `+${effect.sun} SUN`
  }
  if ('shield' in effect && typeof effect.shield === 'number') {
    return `${effect.shield} SHIELD`
  }
  if (kind === 'summon' && 'count' in effect) {
    return `x${effect.count}`
  }
  return null
}
