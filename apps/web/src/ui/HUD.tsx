import { getLevelDefinition, type HudSnapshot, type SeedSlot } from '@tower-rogue/game-core'
import { strategyCardDefinitions } from '@tower-rogue/game-content'
import { useAppStore, type MapClearReward } from '../app/appStore'
import { gameBridge } from '../game/bridge/gameBridge'
import { ActionBar } from './ActionBar'
import { CardChoicePanel } from './CardChoicePanel'
import { BaseHealthPanel, MatchStats } from './MatchStats'
import { SeedBank } from './SeedBank'
import { SunCounter } from './SunCounter'
import { useGameUiStore } from './gameUiStore'

type HUDProps = {
  onExitMap: () => void
}

export function HUD({ onExitMap }: HUDProps) {
  const snapshot = useGameUiStore((state) => state.snapshot)
  const latestMapClearReward = useAppStore((state) => state.latestMapClearReward)

  if (!snapshot) {
    return null
  }

  return (
    <HUDContent
      snapshot={snapshot}
      latestMapClearReward={latestMapClearReward}
      onExitMap={onExitMap}
    />
  )
}

// HUDContent is split from the store-bound wrapper so it can be tested or
// storybooked later with a plain HudSnapshot fixture.
function HUDContent({
  snapshot,
  latestMapClearReward,
  onExitMap
}: {
  snapshot: HudSnapshot
  latestMapClearReward?: MapClearReward
  onExitMap: () => void
}) {
  const isFinished = snapshot.phase === 'won' || snapshot.phase === 'lost'
  const isSelectingCards = snapshot.phase === 'card_select'
  const shouldPulseStartWave = snapshot.canStartWave
  const topCountdown = snapshot.readyCountdownRemaining > 0 ? Math.ceil(snapshot.readyCountdownRemaining) : null
  const wavePreview = snapshot.wavePlanPreview ?? snapshot.directorPreview

  function selectSeed(seed: SeedSlot, mode: 'single' | 'persistent') {
    gameBridge.dispatch({ type: 'selectPlant', plantType: seed.type, mode })
  }

  const showDirectorIntel = Boolean(wavePreview) && !isFinished

  return (
    <div className="hud-layer">
      {topCountdown ? <div className="top-countdown">{topCountdown}</div> : null}

      {/* Top info bar - single row */}
      <div className="top-bar">
        <SunCounter sun={snapshot.sun} />
        <MatchStats
          wave={snapshot.wave}
          totalWaves={snapshot.totalWaves}
          fusionCount={snapshot.fusionCount}
          zombieCount={snapshot.zombieCount}
          dangerousZombieCount={snapshot.dangerousZombieCount}
          flyingEnemyCount={snapshot.flyingEnemyCount}
        />
        <BaseHealthPanel baseHp={snapshot.baseHp} baseMaxHp={snapshot.baseMaxHp} baseShield={snapshot.baseShield} />
      </div>

      {/* Left side - vertical seed bank */}
      <SeedBank isFinished={isFinished} seedBank={snapshot.seedBank} onSelect={selectSeed} />

      {/* Bottom action bar with inline skills */}
      <ActionBar
        canStartWave={snapshot.canStartWave}
        canDrawStrategyCards={snapshot.canDrawStrategyCards}
        shouldPulseStartWave={shouldPulseStartWave}
        isFinished={isFinished}
        isSelectingCards={isSelectingCards}
        paused={snapshot.paused}
        strategyCardDrawCooldownRemaining={snapshot.strategyCardDrawCooldownRemaining}
        skillPack={snapshot.skillPack}
        onDrawStrategyCards={() => gameBridge.dispatch({ type: 'drawStrategyCards' })}
        onStartWave={() => gameBridge.dispatch({ type: 'startWave' })}
        onPauseToggle={() => gameBridge.dispatch({ type: 'setPaused', paused: !snapshot.paused })}
        onReset={() => gameBridge.dispatch({ type: 'resetRun' })}
        onExitMap={onExitMap}
        onUseSkill={(cardId) => gameBridge.dispatch({ type: 'useSkillCard', cardId })}
      />

      {isSelectingCards && (
        <CardChoicePanel
          recommendations={snapshot.recommendations}
          onSelect={(cardId) => gameBridge.dispatch({ type: 'selectStrategyCard', cardId })}
        />
      )}

      {showDirectorIntel && (
        <div className="status-chip">
          <strong>{snapshot.wavePlanPreview ? '波次预判' : '敌情预判'}</strong>
          <div className="director-preview">
            <div className="director-preview-head">
              <span className={`director-threat ${wavePreview!.threatLevel}`}>
                {getThreatLevelLabel(wavePreview!.threatLevel)}
              </span>
              <span className="director-preview-title">{wavePreview!.title}</span>
            </div>
            <span className="director-preview-subtitle">{wavePreview!.subtitle}</span>
            <div className="director-preview-tags">
              {wavePreview!.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {isFinished ? (
        <RunResultModal snapshot={snapshot} latestMapClearReward={latestMapClearReward} onExitMap={onExitMap} />
      ) : null}

{/* DevDebugDock hidden */}
    </div>
  )
}

function RunResultModal({
  snapshot,
  latestMapClearReward,
  onExitMap
}: {
  snapshot: HudSnapshot
  latestMapClearReward?: MapClearReward
  onExitMap: () => void
}) {
  const won = snapshot.phase === 'won'
  const resultRating = getRunResultRating(snapshot)
  const clearReward = getLevelDefinition(snapshot.levelId).clearReward
  const rewardCard = latestMapClearReward?.unlockedCardId ? strategyCardDefinitions[latestMapClearReward.unlockedCardId] : undefined

  return (
    <div className="result-modal-backdrop" role="dialog" aria-modal="true" aria-label={won ? '通关结算' : '战斗失败'}>
      <section className={`result-modal ${snapshot.phase}`}>
        <span className="result-modal-eyebrow">{won ? 'Run Cleared' : 'Run Failed'}</span>
        <strong>{won ? '火山已肃清' : '基地被攻破'}</strong>
        <p>{won ? '学院核心守住了最后一波，战利品已经放入背包。' : '防线没有撑住这次冲击，建议升级技能或重新调整阵容。'}</p>

        {won ? (
          <section className="result-modal-rewards" aria-label="通关掉落">
            <div>
              <span>金币</span>
              <strong>
                +{latestMapClearReward?.gold ?? `${clearReward.gold[0]}-${clearReward.gold[1]}`}
              </strong>
            </div>
            <div>
              <span>技能原石</span>
              <strong>
                +{latestMapClearReward?.skillCrystals ?? `${clearReward.skillCrystals[0]}-${clearReward.skillCrystals[1]}`}
              </strong>
            </div>
            <div>
              <span>额外掉落</span>
              <strong>{rewardCard ? rewardCard.name : latestMapClearReward ? '奖励已入库' : '结算中'}</strong>
            </div>
          </section>
        ) : (
          <div className="result-modal-advice">
            <span>{snapshot.resultReason ? `失败原因：${snapshot.resultReason}` : '失败原因：防线被突破'}</span>
            <span>建议：优先升级常用技能，补足对空和阻挡装置，再调整开局布局。</span>
          </div>
        )}

        <div className="result-modal-score">
          <div>
            <span>战斗评分</span>
            <strong>{resultRating.grade}</strong>
          </div>
          <em>{resultRating.description}</em>
        </div>

        <button className="result-exit-button" type="button" onClick={onExitMap}>
          返回主界面
        </button>
      </section>
    </div>
  )
}

function getThreatLevelLabel(level: NonNullable<HudSnapshot['directorPreview']>['threatLevel']) {
  switch (level) {
    case 'low':
      return '低压'
    case 'medium':
      return '中压'
    case 'high':
      return '高压'
    case 'critical':
      return '重压'
    default:
      return '预警'
  }
}

function getRunResultRating(snapshot: HudSnapshot) {
  if (snapshot.phase === 'lost') {
    return {
      grade: 'C',
      description: `已推进到第 ${snapshot.wave}/${snapshot.totalWaves} 波，补强技能和阵容后再挑战。`
    }
  }

  const baseHpRatio = snapshot.baseMaxHp > 0 ? snapshot.baseHp / snapshot.baseMaxHp : 0
  const upgradedDefenseBonus = Math.min(0.12, snapshot.fusionCount * 0.03)
  const skillUsageBonus = snapshot.skillPack.some((slot) => slot.used) ? 0.04 : 0
  const score = Math.min(1, baseHpRatio * 0.84 + upgradedDefenseBonus + skillUsageBonus)

  if (score >= 0.9) {
    return {
      grade: 'S',
      description: '核心几乎无损，阵容压制力极强。'
    }
  }

  if (score >= 0.72) {
    return {
      grade: 'A',
      description: '防线稳固，资源和输出节奏良好。'
    }
  }

  if (score >= 0.52) {
    return {
      grade: 'B',
      description: '成功守住火山前线，但仍有薄弱行可优化。'
    }
  }

  return {
    grade: 'C',
    description: '勉强通关，建议补强阻挡和对空能力。'
  }
}
