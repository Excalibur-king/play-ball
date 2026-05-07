import type { StrategyAdviceDebugSnapshot } from '@tower-rogue/shared'
import { useState } from 'react'

type StrategyAdviceDebugPanelProps = {
  debugSnapshot: StrategyAdviceDebugSnapshot | null
  loading: boolean
}

export function StrategyAdviceDebugPanel({ debugSnapshot, loading }: StrategyAdviceDebugPanelProps) {
  const [open, setOpen] = useState(false)
  const status = loading
    ? '加载追踪'
    : !debugSnapshot
      ? '暂无追踪'
      : debugSnapshot.usedFallback
        ? '兜底'
        : debugSnapshot.finalResponse?.source === 'model'
          ? '模型'
          : debugSnapshot.error
            ? '失败'
            : '已捕获'

  return (
    <div className="strategy-debug">
      <button className="strategy-debug-toggle" onClick={() => setOpen((value) => !value)} type="button">
        <strong>策略调试</strong>
        <span>{status}</span>
      </button>

      {open && (
        <div className="strategy-debug-panel">
          <div className="strategy-debug-meta">
            <span>来源：{formatSource(debugSnapshot?.request?.source)}</span>
            <span>波次：{debugSnapshot?.request?.wave ?? '-'}</span>
            <span>模型：{debugSnapshot?.request?.model ?? '-'}</span>
            <span>耗时：{debugSnapshot?.durationMs ? `${Math.round(debugSnapshot.durationMs)} ms` : '-'}</span>
            <span>兜底：{debugSnapshot?.usedFallback ? debugSnapshot.fallbackReason ?? '是' : '否'}</span>
          </div>

          <DebugBlock
            title="路线压力"
            body={formatLanePressure(debugSnapshot?.request?.apiRequest.snapshot.lanePressure)}
          />

          <DebugBlock
            title="系统提示词"
            body={debugSnapshot?.request?.messages.find((message) => message.role === 'system')?.content ?? '未捕获系统提示词。'}
          />
          <DebugBlock title="用户载荷" body={formatJson(debugSnapshot?.request?.promptPayload)} />
          <DebugBlock title="模型原始响应" body={debugSnapshot?.rawResponse?.content ?? '未捕获模型原始响应。'} />
          <DebugBlock title="最终响应" body={formatJson(debugSnapshot?.finalResponse)} />
          <DebugBlock
            title="错误"
            body={debugSnapshot?.error ? `${debugSnapshot.error.name ?? 'Error'}: ${debugSnapshot.error.message}` : '未捕获错误。'}
          />
        </div>
      )}
    </div>
  )
}

function DebugBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="strategy-debug-block">
      <strong>{title}</strong>
      <pre>{body}</pre>
    </div>
  )
}

function formatJson(value: unknown) {
  if (value === null || value === undefined) {
    return '空'
  }

  return JSON.stringify(value, null, 2)
}

function formatSource(source: string | undefined) {
  if (source === 'model') return '模型'
  if (source === 'fallback') return '兜底'
  if (source === 'active-skill') return '主动技能'
  return source ?? '-'
}

function formatLanePressure(
  lanePressure: Array<{
    lane: number
    pressureScore: number
    leaksLastWave: number
    destroyedBuildingsLastWave: number
  }> | undefined
) {
  if (!lanePressure || lanePressure.length === 0) {
    return '未捕获路线压力。'
  }

  return lanePressure
    .map(
      (lane) =>
        `第 ${lane.lane + 1} 路: 压力 ${Math.round(lane.pressureScore * 100)}%, 漏怪 ${lane.leaksLastWave}, 拆塔 ${lane.destroyedBuildingsLastWave}`
    )
    .join('\n')
}
