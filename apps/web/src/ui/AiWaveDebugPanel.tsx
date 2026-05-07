import type { AiWaveDebugSnapshot } from '@tower-rogue/shared'
import { useState } from 'react'

type AiWaveDebugPanelProps = {
  debugSnapshot: AiWaveDebugSnapshot | null
  loading: boolean
}

export function AiWaveDebugPanel({ debugSnapshot, loading }: AiWaveDebugPanelProps) {
  const [open, setOpen] = useState(false)
  const status = loading
    ? '加载追踪'
    : !debugSnapshot
      ? '暂无追踪'
      : debugSnapshot.finalResponse && !debugSnapshot.usedFallback
        ? '模型'
        : debugSnapshot.usedFallback
          ? '回退'
          : debugSnapshot.error
            ? '失败'
            : '已捕获'

  return (
    <div className="strategy-debug">
      <button className="strategy-debug-toggle" onClick={() => setOpen((value) => !value)} type="button">
        <strong>AI 波次调试</strong>
        <span>{status}</span>
      </button>

      {open && (
        <div className="strategy-debug-panel">
          <div className="strategy-debug-meta">
            <span>波次：{debugSnapshot?.request?.wave ?? '-'}</span>
            <span>关卡：{debugSnapshot?.request?.levelId ?? '-'}</span>
            <span>模型：{debugSnapshot?.request?.model ?? '-'}</span>
            <span>耗时：{debugSnapshot?.durationMs ? `${Math.round(debugSnapshot.durationMs)} ms` : '-'}</span>
            <span>结果：{debugSnapshot?.finalResponse ? '计划成功' : '未产出计划'}</span>
            <span>回退：{debugSnapshot?.usedFallback ? debugSnapshot.fallbackReason ?? '是' : '否'}</span>
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
          <DebugBlock title="解析计划" body={formatJson(debugSnapshot?.parsedPlan)} />
          <DebugBlock title="编译结果" body={formatJson(debugSnapshot?.compileResult)} />
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
