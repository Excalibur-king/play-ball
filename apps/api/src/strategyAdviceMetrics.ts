import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const apiRoot = resolve(currentDir, '..')
const defaultMetricsDir = resolve(apiRoot, '.logs', 'strategy-advice')

export type SerializedValueSize = {
  chars: number
  bytes: number
}

export type StrategyAdviceMetric = {
  traceId: string
  recordedAt: string
  provider: 'deepseek'
  model: string
  baseUrl: string
  source: string
  wave: number
  timeoutMs: number
  durationMs: number
  status: 'success' | 'error'
  failureStage?: 'preflight' | 'provider' | 'parse'
  battleContext: {
    problemTagCount: number
    chosenCardTagCount: number
    candidateCounts: {
      emergency: number
      synergy: number
      pivot: number
    }
  }
  requestSize: {
    promptPayload: SerializedValueSize
    messages: SerializedValueSize
    completionRequest: SerializedValueSize
  }
  responseSize: {
    content: SerializedValueSize | null
    completion: SerializedValueSize | null
  }
  usage: {
    promptTokens: number | null
    completionTokens: number | null
    totalTokens: number | null
    reasoningTokens: number | null
  } | null
  error: {
    name?: string
    message: string
    statusCode?: number
    code?: string
  } | null
}

export function getStrategyAdviceMetricsDir() {
  const configuredDir = process.env.STRATEGY_ADVICE_METRICS_DIR?.trim()
  return configuredDir ? resolve(apiRoot, configuredDir) : defaultMetricsDir
}

export function measureSerializedValue(value: unknown): SerializedValueSize {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value)
  return {
    chars: serialized.length,
    bytes: Buffer.byteLength(serialized, 'utf8')
  }
}

export function recordStrategyAdviceMetric(metric: StrategyAdviceMetric) {
  void persistStrategyAdviceMetric(metric)
}

async function persistStrategyAdviceMetric(metric: StrategyAdviceMetric) {
  try {
    const metricsDir = getStrategyAdviceMetricsDir()
    const day = metric.recordedAt.slice(0, 10)
    const dailyLogPath = resolve(metricsDir, `strategy-advice-${day}.jsonl`)
    const latestLogPath = resolve(metricsDir, 'latest.json')

    await mkdir(metricsDir, { recursive: true })
    await Promise.all([
      appendFile(dailyLogPath, `${JSON.stringify(metric)}\n`, 'utf8'),
      writeFile(latestLogPath, `${JSON.stringify(metric, null, 2)}\n`, 'utf8')
    ])
  } catch (error) {
    console.warn(
      '[strategy-advice-metrics] failed to persist metric',
      error instanceof Error ? error.message : String(error)
    )
  }
}
