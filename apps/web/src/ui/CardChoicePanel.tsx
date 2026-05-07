import type { RecommendationSlot, StrategyCardId } from '@tower-rogue/game-core'
import { StrategyCardArtwork } from './StrategyCardArtwork'
import { formatStrategyCardDamage } from './strategyCardText'

type CardChoicePanelProps = {
  recommendations: RecommendationSlot[]
  battleAdvice: string
  battleAdviceLoading: boolean
  onSelect: (cardId: StrategyCardId) => void
}

export function CardChoicePanel({ recommendations, battleAdvice, battleAdviceLoading, onSelect }: CardChoicePanelProps) {
  if (recommendations.length === 0) {
    return null
  }

  return (
    <div className="card-choice-panel">
      <div className="card-choice-header">
        <span className="card-choice-header-icon" aria-hidden="true" />
        <strong>选择策略卡</strong>
      </div>

      {(battleAdvice || battleAdviceLoading) && (
        <div className={`card-choice-advice ${battleAdviceLoading ? 'loading' : ''}`}>
          <span className="card-choice-advice-label">AI 分析</span>
          <p>{battleAdvice || '正在分析局势…'}</p>
        </div>
      )}

      <div className="card-choice-list">
        {recommendations.map((recommendation) => {
          const damageText = formatStrategyCardDamage(recommendation.card)

          return (
            <button
              type="button"
              key={recommendation.cardId}
              className={`strategy-card ${recommendation.slot}`}
              onClick={() => onSelect(recommendation.cardId)}
              title={recommendation.reason}
            >
              <StrategyCardArtwork
                cardId={recommendation.card.id}
                name={recommendation.card.name}
                type={recommendation.card.type}
                className="strategy-card-art-bg"
              />
              <div className="strategy-card-body">
                <span className="card-slot">{formatRecommendationSlot(recommendation.slot)}</span>
                <strong>{recommendation.card.name}</strong>
                {damageText ? <small className="card-damage-badge">{damageText}</small> : null}
                <span className="card-description">{recommendation.card.description}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function formatRecommendationSlot(slot: RecommendationSlot['slot']) {
  switch (slot) {
    case 'emergency':
      return '救急'
    case 'synergy':
      return '联动'
    case 'pivot':
      return '转向'
    default:
      return slot
  }
}
