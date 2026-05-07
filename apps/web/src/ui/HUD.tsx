import { getLevelDefinition, type HudSnapshot, type SeedSlot } from '@tower-rogue/game-core'
import type { AiWaveDebugSnapshot } from '@tower-rogue/shared'
import { strategyCardDefinitions } from '@tower-rogue/game-content'
import { useEffect, useRef, useState } from 'react'
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
  const aiWaveDebug = useGameUiStore((state) => state.aiWaveDebug)
  const aiWaveDebugLoading = useGameUiStore((state) => state.aiWaveDebugLoading)
  const battleAdvice = useGameUiStore((state) => state.battleAdvice)
  const battleAdviceLoading = useGameUiStore((state) => state.battleAdviceLoading)
  const aiDirectorAnnounce = useGameUiStore((state) => state.aiDirectorAnnounce)
  const clearAiDirectorAnnounce = useGameUiStore((state) => state.clearAiDirectorAnnounce)

  if (!snapshot) {
    return null
  }

  return (
    <HUDContent
      snapshot={snapshot}
      latestMapClearReward={latestMapClearReward}
      onExitMap={onExitMap}
      aiWaveDebug={aiWaveDebug}
      aiWaveDebugLoading={aiWaveDebugLoading}
      battleAdvice={battleAdvice}
      battleAdviceLoading={battleAdviceLoading}
      aiDirectorAnnounce={aiDirectorAnnounce}
      onClearAiDirectorAnnounce={clearAiDirectorAnnounce}
    />
  )
}

// HUDContent is split from the store-bound wrapper so it can be tested or
// storybooked later with a plain HudSnapshot fixture.
function HUDContent({
  snapshot,
  latestMapClearReward,
  onExitMap,
  aiWaveDebug,
  aiWaveDebugLoading,
  battleAdvice,
  battleAdviceLoading,
  aiDirectorAnnounce,
  onClearAiDirectorAnnounce
}: {
  snapshot: HudSnapshot
  latestMapClearReward?: MapClearReward
  onExitMap: () => void
  aiWaveDebug: AiWaveDebugSnapshot | null
  aiWaveDebugLoading: boolean
  battleAdvice: string
  battleAdviceLoading: boolean
  aiDirectorAnnounce: { message: string; timestamp: number } | null
  onClearAiDirectorAnnounce: () => void
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
  const showAiPlacementDebug = !isFinished && snapshot.levelId === 'volcano_frontier'

  return (
    <div className="hud-layer">
      {topCountdown ? <div className="top-countdown">{topCountdown}</div> : null}

      {/* Top info bar: energy → base HP → wave/enemies */}
      <div className="top-bar">
        <div className="top-bar__left">
          <SunCounter sun={snapshot.sun} />
          <BaseHealthPanel baseHp={snapshot.baseHp} baseMaxHp={snapshot.baseMaxHp} baseShield={snapshot.baseShield} />
        </div>
        <MatchStats
          wave={snapshot.wave}
          totalWaves={snapshot.totalWaves}
          fusionCount={snapshot.fusionCount}
          zombieCount={snapshot.zombieCount}
          dangerousZombieCount={snapshot.dangerousZombieCount}
          flyingEnemyCount={snapshot.flyingEnemyCount}
        />
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
          battleAdvice={battleAdvice}
          battleAdviceLoading={battleAdviceLoading}
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

      {showAiPlacementDebug && (
        <AiPlacementDebugOverlay debug={aiWaveDebug} loading={aiWaveDebugLoading} />
      )}

      {aiDirectorAnnounce && (
        <AiDirectorAnnounceToast
          key={aiDirectorAnnounce.timestamp}
          message={aiDirectorAnnounce.message}
          onDone={onClearAiDirectorAnnounce}
        />
      )}

      {isFinished ? (
        <RunResultModal snapshot={snapshot} latestMapClearReward={latestMapClearReward} onExitMap={onExitMap} />
      ) : null}

{/* DevDebugDock hidden */}
    </div>
  )
}

type RevealStage = 'banner' | 'stats' | 'ready'

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
  const rewardCard = latestMapClearReward?.unlockedCardId
    ? strategyCardDefinitions[latestMapClearReward.unlockedCardId]
    : undefined

  const [stage, setStage] = useState<RevealStage>('banner')

  useEffect(() => {
    const t1 = setTimeout(() => setStage('stats'), 1200)
    const t2 = setTimeout(() => setStage('ready'), 2200)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const gradeStars = resultRating.grade === 'S' ? 3 : resultRating.grade === 'A' ? 3 : resultRating.grade === 'B' ? 2 : 1

  return (
    <div
      className={`result-backdrop ${won ? 'won' : 'lost'}`}
      role="dialog"
      aria-modal="true"
      aria-label={won ? '通关结算' : '战斗失败'}
    >
      <div className="result-vignette" />

      <section className={`result-panel ${won ? 'won' : 'lost'} stage-${stage}`}>
        <img
          className="result-panel-bg"
          src={won ? '/assets/ui/result_victory_panel.png' : '/assets/ui/result_defeat_panel.png'}
          alt=""
          draggable={false}
        />

        <div className="result-panel-content">
          {/* Banner */}
          <div className="result-banner">
            <h2 className="result-title">{won ? '火山已肃清' : '基地被攻破'}</h2>
            <span className="result-subtitle">
              {won ? '学院核心守住了最后一波' : '防线没有撑住这次冲击'}
            </span>
          </div>

          {/* Grade ring */}
          <div className="result-grade-ring">
            <span className={`result-grade grade-${resultRating.grade.toLowerCase()}`}>
              {resultRating.grade}
            </span>
            <div className="result-stars">
              {(['star-1', 'star-2', 'star-3'] as const).map((id, i) => (
                <span key={id} className={`result-star ${i < gradeStars ? 'lit' : 'dim'}`}>★</span>
              ))}
            </div>
          </div>

          {/* Stats / Rewards */}
          <div className={`result-body ${stage === 'banner' ? 'hidden' : ''}`}>
            {won ? (
              <div className="result-rewards">
                <div className="result-reward-item" style={{ animationDelay: '0s' }}>
                  <span className="result-reward-icon">🪙</span>
                  <div className="result-reward-detail">
                    <span className="result-reward-label">金币</span>
                    <strong className="result-reward-value">
                      +{latestMapClearReward?.gold ?? `${clearReward.gold[0]}–${clearReward.gold[1]}`}
                    </strong>
                  </div>
                </div>
                <div className="result-reward-item" style={{ animationDelay: '0.12s' }}>
                  <span className="result-reward-icon">💎</span>
                  <div className="result-reward-detail">
                    <span className="result-reward-label">技能原石</span>
                    <strong className="result-reward-value">
                      +{latestMapClearReward?.skillCrystals ?? `${clearReward.skillCrystals[0]}–${clearReward.skillCrystals[1]}`}
                    </strong>
                  </div>
                </div>
                {rewardCard && (
                  <div className="result-reward-item bonus" style={{ animationDelay: '0.24s' }}>
                    <span className="result-reward-icon">🃏</span>
                    <div className="result-reward-detail">
                      <span className="result-reward-label">额外掉落</span>
                      <strong className="result-reward-value">{rewardCard.name}</strong>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="result-defeat-info">
                <p className="result-defeat-reason">
                  {snapshot.resultReason ?? '防线被突破'}
                </p>
                <div className="result-defeat-progress">
                  <span>已推进波次</span>
                  <div className="result-defeat-bar">
                    <div
                      className="result-defeat-fill"
                      style={{ width: `${Math.round((snapshot.wave / snapshot.totalWaves) * 100)}%` }}
                    />
                  </div>
                  <strong>{snapshot.wave}/{snapshot.totalWaves}</strong>
                </div>
                <p className="result-defeat-tip">升级常用技能，补足对空和阻挡装置，再调整阵容。</p>
              </div>
            )}

            <p className="result-rating-desc">{resultRating.description}</p>
          </div>

          {/* CTA */}
          <button
            className={`result-cta ${stage === 'ready' ? 'visible' : ''}`}
            type="button"
            onClick={onExitMap}
            disabled={stage !== 'ready'}
          >
            返回主界面
          </button>
        </div>
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

function AiPlacementDebugOverlay({ debug, loading }: { debug: AiWaveDebugSnapshot | null; loading: boolean }) {
  const [open, setOpen] = useState(true)
  const [flash, setFlash] = useState(false)
  const prevUpdatedAt = useRef<string | null>(null)

  useEffect(() => {
    if (!debug || loading) return
    const isSuccess = debug.finalResponse && !debug.usedFallback
    if (!isSuccess) return
    if (prevUpdatedAt.current === debug.updatedAt) return
    prevUpdatedAt.current = debug.updatedAt
    setFlash(true)
    const timer = setTimeout(() => setFlash(false), 3000)
    return () => clearTimeout(timer)
  }, [debug, loading])

  const durationText = loading
    ? '请求中'
    : debug?.durationMs != null
      ? `${(debug.durationMs / 1000).toFixed(2)} 秒`
      : '-'

  const statusLabel = loading
    ? '请求中'
    : !debug
      ? '等待中'
      : debug.usedFallback
        ? '兜底'
        : debug.finalResponse
          ? 'AI计划'
          : debug.error
            ? '失败'
            : '等待中'

  return (
    <div className={`ai-director-debug${flash ? ' flash' : ''}`}>
      <button className="ai-director-debug-toggle" onClick={() => setOpen((v) => !v)} type="button">
        <strong>AI 布阵调试</strong>
        <span>{durationText} · {statusLabel}</span>
      </button>

      {open && debug && (
        <div className="ai-director-debug-body">
          <div className="ai-director-debug-meta">
            <span>耗时：{durationText}</span>
            <span>波次：{debug.request?.wave ?? '-'}</span>
            <span>模型：{debug.request?.model ?? '-'}</span>
            <span>结果：{statusLabel}</span>
          </div>

          {debug.compileResult && (
            <div className="ai-director-debug-result">
              <strong>布阵结果</strong>
              <p>{debug.compileResult.pressureGoal}</p>
              <span>{debug.compileResult.nextWaveHint}</span>
            </div>
          )}

          {debug.compileResult && debug.compileResult.groups.length > 0 && (
            <div className="ai-director-debug-plan">
              {debug.compileResult.groups.map((group, i) => (
                <span key={`${group.enemyId}-${group.route}-${group.startSecond}`}>
                  段{Math.floor(i / 10 + 1)}.{(i % 10) + 1} {formatRoute(group.route)}
                  {formatEnemyRole(group.enemyId)}：{group.enemyId} 预算{group.count} · {formatRoute(group.route)} · {formatInterval(group.interval)} · {group.startSecond.toFixed(1)}s
                </span>
              ))}
            </div>
          )}

          {!debug.compileResult && debug.finalResponse && (
            <div className="ai-director-debug-result">
              <strong>布阵结果</strong>
              <p>{debug.finalResponse.pressureGoal}</p>
              <span>{debug.finalResponse.nextWaveHint}</span>
            </div>
          )}

          {!debug.compileResult && debug.finalResponse && debug.finalResponse.phases.length > 0 && (
            <div className="ai-director-debug-plan">
              {debug.finalResponse.phases.map((phase) => (
                <span key={phase.directives.map((d) => `${d.kind === 'role' ? d.role : d.enemyId}-${d.route}`).join('_')}>
                  {phase.directives.map((d) =>
                    `${d.kind === 'role' ? d.role : d.enemyId} ${formatRoute(d.route)} x${d.kind === 'role' ? d.budgetUnits : d.count} ${d.cadence}`
                  ).join(' / ')}
                </span>
              ))}
            </div>
          )}

          {debug.usedFallback && debug.fallbackReason && (
            <div className="ai-director-debug-meta">
              <span>回退：{debug.fallbackReason}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function formatRoute(route: string) {
  if (route.startsWith('row-')) return `第${route.replace('row-', '')}行`
  switch (route) {
    case 'left': return '左路'
    case 'center': return '中路'
    case 'right': return '右路'
    case 'mixed': return '混合'
    default: return route
  }
}

function formatEnemyRole(enemyId: string) {
  if (enemyId.includes('runner') || enemyId.includes('spark')) return '快速'
  if (enemyId.includes('smasher') || enemyId.includes('basalt')) return '重装'
  if (enemyId.includes('wing') || enemyId.includes('ash')) return '飞行'
  if (enemyId.includes('beast') || enemyId.includes('core')) return 'BOSS'
  return '快怪'
}

function formatInterval(interval: number) {
  if (interval <= 0.8) return 'dense'
  if (interval <= 1.5) return 'steady'
  return 'sparse'
}

const AI_ANNOUNCE_DURATION_MS = 4000

function AiDirectorAnnounceToast({
  message,
  onDone
}: {
  message: string
  onDone: () => void
}) {
  const [exiting, setExiting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setExiting(true)
      timerRef.current = setTimeout(onDone, 400)
    }, AI_ANNOUNCE_DURATION_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [onDone])

  return (
    <div className={`ai-director-announce${exiting ? ' exiting' : ''}`} role="status" aria-live="polite">
      <span className="ai-director-announce-icon">⚡</span>
      <span className="ai-director-announce-text">{message}</span>
    </div>
  )
}
