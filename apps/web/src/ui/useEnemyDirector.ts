import { useEffect, useRef } from 'react'
import type { AiWaveDebugSnapshot, AiWavePlanResponse, RealtimeAiWavePlanRequest } from '@tower-rogue/shared'
import {
  requestLatestAiWaveDebug,
  requestRealtimeAiWavePlan
} from '../api/director'
import { gameBridge } from '../game/bridge/gameBridge'
import { useGameUiStore } from './gameUiStore'

const ENABLE_AI_WAVE_DIRECTOR =
  import.meta.env.VITE_ENABLE_AI_WAVE_DIRECTOR === 'true' || import.meta.env.VITE_ENABLE_AI_WAVE_DIRECTOR === '1'
const REALTIME_AI_DIRECTOR_FIRST_REQUEST_SECONDS = 5
const REALTIME_AI_DIRECTOR_INTERVAL_MS = 8_000
const REALTIME_AI_DIRECTOR_MODEL = 'gpt-5.4-mini'
const REALTIME_AI_DIRECTOR_BASE_URL = 'https://aicode-api2.gz4399.com/api/v1'
const REALTIME_AI_DIRECTOR_INTERVAL_SECONDS = REALTIME_AI_DIRECTOR_INTERVAL_MS / 1000

export function useEnemyDirector() {
  const snapshot = useGameUiStore((state) => state.snapshot)
  const setAiWaveDebug = useGameUiStore((state) => state.setAiWaveDebug)
  const setAiWaveDebugLoading = useGameUiStore((state) => state.setAiWaveDebugLoading)
  const setDirectorDebug = useGameUiStore((state) => state.setDirectorDebug)
  const setDirectorDebugLoading = useGameUiStore((state) => state.setDirectorDebugLoading)
  const latestRealtimeRequestId = useRef(0)
  const realtimeRequestInFlight = useRef(false)
  const realtimeDirectorClock = useRef(0)
  const lastRealtimeClockUpdateMs = useRef<number | null>(null)
  const nextRealtimeRequestAllowedAt = useRef(REALTIME_AI_DIRECTOR_FIRST_REQUEST_SECONDS)
  const lastRealtimeRequestKey = useRef<string>('idle')

  useEffect(() => {
    if (!snapshot) {
      latestRealtimeRequestId.current += 1
      realtimeRequestInFlight.current = false
      lastRealtimeRequestKey.current = 'idle'
      lastRealtimeClockUpdateMs.current = null
      setAiWaveDebugLoading(false)
      setDirectorDebugLoading(false)
      return
    }

    if (snapshot.levelId !== 'volcano_frontier' || snapshot.phase !== 'playing' || snapshot.paused) {
      lastRealtimeClockUpdateMs.current = null
      return
    }

    const nowMs = performance.now()
    const elapsedSeconds =
      lastRealtimeClockUpdateMs.current === null ? 0 : (nowMs - lastRealtimeClockUpdateMs.current) / 1000
    lastRealtimeClockUpdateMs.current = nowMs
    realtimeDirectorClock.current += elapsedSeconds
  }, [setAiWaveDebugLoading, setDirectorDebugLoading, snapshot])

  useEffect(() => {
    if (!snapshot || snapshot.levelId !== 'volcano_frontier' || snapshot.phase !== 'playing') {
      latestRealtimeRequestId.current += 1
      realtimeRequestInFlight.current = false
      lastRealtimeRequestKey.current = 'idle'
      setAiWaveDebugLoading(false)
      return
    }

    if (snapshot.paused) {
      return
    }

    const realtimeRequestKey = [
      snapshot.levelId,
      snapshot.wave,
      Math.floor(realtimeDirectorClock.current / REALTIME_AI_DIRECTOR_INTERVAL_SECONDS),
      snapshot.baseHp,
      snapshot.purchasePower,
      snapshot.plantCount,
      snapshot.zombieCount,
      snapshot.battleSnapshot.problemTags.join(',')
    ].join('|')

    if (
      realtimeRequestInFlight.current ||
      realtimeDirectorClock.current < nextRealtimeRequestAllowedAt.current ||
      lastRealtimeRequestKey.current === realtimeRequestKey
    ) {
      return
    }

    const requestId = latestRealtimeRequestId.current + 1
    latestRealtimeRequestId.current = requestId
    realtimeRequestInFlight.current = true
    lastRealtimeRequestKey.current = realtimeRequestKey
    setAiWaveDebugLoading(true)

    void (async () => {
      const requestStartedAt = performance.now()
      const realtimeRequest: RealtimeAiWavePlanRequest = {
        levelId: snapshot.levelId,
        snapshot: snapshot.battleSnapshot,
        currentWaveElapsed: snapshot.currentWaveElapsed,
        lastDirectorReasonTag: null,
        recentDirectorHistory: []
      }
      const plan = await requestRealtimeAiWavePlan(realtimeRequest)
      const durationMs = performance.now() - requestStartedAt

      if (requestId !== latestRealtimeRequestId.current) {
        return
      }

      if (plan) {
        gameBridge.dispatch({
          type: 'hydrateRealtimeAiWavePlan',
          wave: snapshot.wave,
          plan
        })
      } else {
        gameBridge.dispatch({
          type: 'applyRealtimeDirectorFallback',
          wave: snapshot.wave
        })
      }

      const aiWaveDebugSnapshot = await requestLatestAiWaveDebug()

      if (requestId !== latestRealtimeRequestId.current) {
        return
      }

      setAiWaveDebug(
        aiWaveDebugSnapshot ??
          createLocalRealtimeAiWaveDebug({
            request: realtimeRequest,
            plan,
            durationMs,
            fallbackReason: plan ? null : 'AI 实时布阵接口未返回计划，已执行本地兜底布阵。'
          })
      )
      setAiWaveDebugLoading(false)
      realtimeRequestInFlight.current = false
      nextRealtimeRequestAllowedAt.current = realtimeDirectorClock.current + REALTIME_AI_DIRECTOR_INTERVAL_SECONDS
    })().catch(() => {
      if (requestId !== latestRealtimeRequestId.current) {
        return
      }

      gameBridge.dispatch({
        type: 'applyRealtimeDirectorFallback',
        wave: snapshot.wave
      })
      setAiWaveDebug(
        createLocalRealtimeAiWaveDebug({
          request: {
            levelId: snapshot.levelId,
            snapshot: snapshot.battleSnapshot,
            currentWaveElapsed: snapshot.currentWaveElapsed,
            lastDirectorReasonTag: null,
            recentDirectorHistory: []
          },
          plan: null,
          durationMs: null,
          fallbackReason: 'AI 实时布阵请求异常，已执行本地兜底布阵。'
        })
      )
      setAiWaveDebugLoading(false)
      realtimeRequestInFlight.current = false
      nextRealtimeRequestAllowedAt.current = realtimeDirectorClock.current + REALTIME_AI_DIRECTOR_INTERVAL_SECONDS
    })
  }, [
    setAiWaveDebug,
    setAiWaveDebugLoading,
    snapshot
  ])
}

function createLocalRealtimeAiWaveDebug(input: {
  request: RealtimeAiWavePlanRequest
  plan: AiWavePlanResponse
  durationMs: number | null
  fallbackReason: string | null
}): AiWaveDebugSnapshot {
  const updatedAt = new Date().toISOString()

  return {
    updatedAt,
    request: {
      createdAt: updatedAt,
      model: REALTIME_AI_DIRECTOR_MODEL,
      baseUrl: REALTIME_AI_DIRECTOR_BASE_URL,
      timeoutMs: 15_000,
      levelId: input.request.levelId,
      wave: input.request.snapshot.wave,
      apiRequest: {
        levelId: input.request.levelId,
        snapshot: input.request.snapshot,
        lastDirectorReasonTag: input.request.lastDirectorReasonTag,
        recentDirectorHistory: input.request.recentDirectorHistory
      },
      promptPayload: {
        mode: 'realtime-local-debug',
        currentWaveElapsed: input.request.currentWaveElapsed,
        fallbackReason: input.fallbackReason
      },
      messages: [
        {
          role: 'system',
          content: '前端本地调试快照：后端 debug 接口不可用时，用于显示 AI 实时布阵状态。'
        },
        {
          role: 'user',
          content: JSON.stringify(input.request)
        }
      ]
    },
    rawResponse: null,
    parsedPlan: input.plan,
    compileResult: null,
    finalResponse: input.plan,
    error: null,
    durationMs: input.durationMs,
    usedFallback: !input.plan,
    fallbackReason: input.fallbackReason
  }
}
