import type { HudSnapshot } from '@tower-rogue/game-core'
import type { AiWaveDebugSnapshot, DirectorDebugSnapshot, StrategyAdviceDebugSnapshot } from '@tower-rogue/shared'
import { useMemo, useState } from 'react'
import { AiWaveDebugPanel } from './AiWaveDebugPanel'
import { DirectorDebugPanel } from './DirectorDebugPanel'
import { StrategyAdviceDebugPanel } from './StrategyAdviceDebugPanel'

type DevDebugDockProps = {
  snapshot: HudSnapshot
  aiWaveDebug: AiWaveDebugSnapshot | null
  aiWaveDebugLoading: boolean
  directorDebug: DirectorDebugSnapshot | null
  directorDebugLoading: boolean
  strategyAdviceDebug: StrategyAdviceDebugSnapshot | null
  strategyAdviceDebugLoading: boolean
}

export function DevDebugDock({
  snapshot,
  aiWaveDebug,
  aiWaveDebugLoading,
  directorDebug,
  directorDebugLoading,
  strategyAdviceDebug,
  strategyAdviceDebugLoading
}: DevDebugDockProps) {
  const [open, setOpen] = useState(true)

  const directorModeStatus = useMemo(
    () => getDirectorModeStatus(aiWaveDebug, aiWaveDebugLoading, directorDebug, directorDebugLoading),
    [aiWaveDebug, aiWaveDebugLoading, directorDebug, directorDebugLoading]
  )
  const strategyStatus = useMemo(
    () => getStrategyStatusLabel(strategyAdviceDebug, strategyAdviceDebugLoading),
    [strategyAdviceDebug, strategyAdviceDebugLoading]
  )

  if (!import.meta.env.DEV) {
    return null
  }

  return (
    <aside className={`dev-debug-dock ${open ? 'open' : ''}`}>
      <button className="dev-debug-toggle" onClick={() => setOpen((value) => !value)} type="button">
        <div className="dev-debug-toggle-copy">
          <strong>开发调试</strong>
          <span>
            波次 {snapshot.wave}/{snapshot.totalWaves} · {formatPhase(snapshot.phase)}
          </span>
        </div>
        <div className="dev-debug-toggle-status">
          <span className={`dev-debug-chip ${directorModeStatus.tone}`}>波导 {directorModeStatus.label}</span>
          <span className={`dev-debug-chip ${strategyStatus.tone}`}>卡牌 {strategyStatus.label}</span>
        </div>
      </button>

      {open && (
        <div className="dev-debug-drawer">
          <div className="dev-debug-summary">
            <span>基地 {snapshot.baseHp}</span>
            <span>能量 {snapshot.sun}</span>
            <span>{formatLaneSummary(snapshot)}</span>
            <span>{snapshot.currentWavePhase ? `段落 ${snapshot.currentWavePhase.label}` : '未进入波次段落'}</span>
            <span>{snapshot.wavePlanPreview?.title ?? snapshot.directorPreview?.title ?? '暂无波次预览'}</span>
          </div>

          <AiWaveDebugPanel debugSnapshot={aiWaveDebug} loading={aiWaveDebugLoading} />
          <DirectorDebugPanel debugSnapshot={directorDebug} loading={directorDebugLoading} />
          <StrategyAdviceDebugPanel debugSnapshot={strategyAdviceDebug} loading={strategyAdviceDebugLoading} />
        </div>
      )}
    </aside>
  )
}

function getDirectorModeStatus(
  aiWaveDebug: AiWaveDebugSnapshot | null,
  aiWaveLoading: boolean,
  directorDebug: DirectorDebugSnapshot | null,
  directorLoading: boolean
) {
  if (aiWaveLoading) {
    return { label: '加载中', tone: 'loading' as const }
  }

  if (aiWaveDebug?.finalResponse && !aiWaveDebug.usedFallback) {
    return { label: 'ai-wave', tone: 'ok' as const }
  }

  if (aiWaveDebug?.usedFallback || directorLoading || directorDebug) {
    return { label: 'ai-wave-fallback-to-director', tone: directorDebug ? 'warn' as const : 'loading' as const }
  }

  return { label: 'director-only', tone: 'idle' as const }
}

function getStrategyStatusLabel(debugSnapshot: StrategyAdviceDebugSnapshot | null, loading: boolean) {
  if (loading) {
    return { label: '加载中', tone: 'loading' as const }
  }

  if (!debugSnapshot) {
    return { label: '空闲', tone: 'idle' as const }
  }

  if (debugSnapshot.finalResponse?.source === 'model' && !debugSnapshot.usedFallback) {
    return { label: '模型', tone: 'ok' as const }
  }

  if (debugSnapshot.usedFallback) {
    return { label: '兜底', tone: 'warn' as const }
  }

  if (debugSnapshot.error) {
    return { label: '失败', tone: 'danger' as const }
  }

  return { label: '追踪', tone: 'idle' as const }
}

function formatPhase(phase: HudSnapshot['phase']) {
  switch (phase) {
    case 'ready':
      return '准备'
    case 'playing':
      return '战斗中'
    case 'card_select':
      return '选卡'
    case 'won':
      return '胜利'
    case 'lost':
      return '失败'
    default:
      return phase
  }
}

function formatLaneSummary(snapshot: HudSnapshot) {
  if (snapshot.lanePressure.length === 0) {
    return '暂无路线快照'
  }

  const hottestLane = [...snapshot.lanePressure].sort((a, b) => b.pressureScore - a.pressureScore)[0]

  if (!hottestLane) {
    return '暂无路线快照'
  }

  return `高压路线 ${hottestLane.lane + 1} · ${Math.round(hottestLane.pressureScore * 100)}%`
}
