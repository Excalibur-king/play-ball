import { useEffect, useState } from 'react'

type StrategyCardArtworkProps = {
  cardId: string
  name: string
  type: string
  className?: string
}

const cardArtExtensions = ['png', 'svg', 'webp', 'jpg'] as const
const cardArtVersion = 'dr5-20260508'

export function StrategyCardArtwork({ cardId, name, type, className }: StrategyCardArtworkProps) {
  const [attemptIndex, setAttemptIndex] = useState(0)

  useEffect(() => {
    setAttemptIndex(0)
  }, [cardId])

  const artUrl = getCardArtUrl(cardId, attemptIndex)

  return (
    <div className={`strategy-card-art ${type} ${className ?? ''}`.trim()}>
      {artUrl ? (
        <img
          className="strategy-card-art-image"
          src={artUrl}
          alt={name}
          draggable={false}
          onError={() => setAttemptIndex((current) => current + 1)}
        />
      ) : (
        <div className="strategy-card-art-fallback">
          <span>{getFallbackLabel(name)}</span>
        </div>
      )}
    </div>
  )
}

function getCardArtUrl(cardId: string, attemptIndex: number) {
  const extension = cardArtExtensions[attemptIndex]
  return extension ? `/assets/game/cards/${cardId}.${extension}?v=${cardArtVersion}` : undefined
}

function getFallbackLabel(name: string) {
  return name.slice(0, Math.min(4, name.length))
}
