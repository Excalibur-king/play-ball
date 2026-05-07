import type { SkillPackSlot, StrategyCardId } from '@tower-rogue/game-core'
import { StrategyCardArtwork } from './StrategyCardArtwork'
import { formatStrategyCardDamageAtLevel } from './strategyCardText'

type SkillPackPanelProps = {
  skillPack: SkillPackSlot[]
  onUse: (cardId: StrategyCardId) => void
  onClose: () => void
}

export function SkillPackPanel({ skillPack, onUse, onClose }: SkillPackPanelProps) {
  return (
    <div className="battle-skill-pack-panel">
      <img className="battle-skill-pack-frame" src="/assets/ui/skill_pack_popup.png" alt="" aria-hidden="true" draggable={false} />
      <div className="battle-skill-pack-body">
        <button type="button" className="battle-skill-pack-close" aria-label="收起" onClick={onClose} />
        <div className="battle-skill-pack-list">
          {skillPack.map((slot) => {
            const damageText = formatStrategyCardDamageAtLevel(slot.card, slot.level)
            const detailText = slot.used ? '本局已使用。' : slot.disabledReason ?? slot.card.description
            const stateClassName = slot.used ? 'used' : slot.usable ? 'ready' : 'locked'

            return (
              <button
                key={slot.cardId}
                className={`battle-skill-card ${slot.card.type} ${stateClassName}`}
                type="button"
                disabled={!slot.usable}
                title={slot.disabledReason ?? slot.card.description}
                onClick={() => onUse(slot.cardId)}
              >
                <span className="battle-skill-card-gem battle-skill-card-gem-top" aria-hidden="true" />
                <span className="battle-skill-card-gem battle-skill-card-gem-bottom" aria-hidden="true" />
                <StrategyCardArtwork
                  cardId={slot.card.id}
                  name={slot.card.name}
                  type={slot.card.type}
                  className="battle-skill-card-art"
                />
                <div className="battle-skill-card-copy">
                  <div className="battle-skill-card-head">
                    <span className="battle-skill-card-type">{formatCardType(slot.card.type)}</span>
                    <span className="battle-skill-card-state">阶数 {slot.level}</span>
                    {slot.used ? <span className="battle-skill-card-state">已使用</span> : null}
                  </div>
                  <strong className="battle-skill-card-title">{slot.card.name}</strong>
                  {damageText ? <small className="battle-skill-card-damage">{damageText}</small> : null}
                  <em className="battle-skill-card-description">{detailText}</em>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function formatCardType(type: SkillPackSlot['card']['type']) {
  switch (type) {
    case 'energy':
      return '能量'
    case 'attack':
      return '攻击'
    case 'defense':
      return '防御'
    case 'emergency':
      return '救急'
    case 'pivot':
      return '转向'
    default:
      return type
  }
}
