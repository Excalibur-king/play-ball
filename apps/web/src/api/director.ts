import {
  AiWaveDebugEnvelopeSchema,
  AiWavePlanResponseSchema,
  RealtimeAiWavePlanRequestSchema,
  type AiWaveDebugSnapshot,
  type RealtimeAiWavePlanRequest,
  type RealtimeAiWavePlanResponse,
  DirectorDebugEnvelopeSchema,
  DirectorParamsRequestSchema,
  DirectorParamsResponseSchema,
  type DirectorDebugSnapshot,
  type DirectorParamsRequest,
  type DirectorParamsResponse
} from '@tower-rogue/shared'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787'

export async function requestRealtimeAiWavePlan(request: RealtimeAiWavePlanRequest): Promise<RealtimeAiWavePlanResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/director/realtime-wave-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(RealtimeAiWavePlanRequestSchema.parse(request))
    })

    if (!response.ok) {
      throw new Error(`Realtime AI wave plan API responded with ${response.status}`)
    }

    const data = await response.json()
    return AiWavePlanResponseSchema.parse(data)
  } catch {
    return null
  }
}

export async function requestDirectorParams(request: DirectorParamsRequest): Promise<DirectorParamsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/director/next-wave-params`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(DirectorParamsRequestSchema.parse(request))
    })

    if (!response.ok) {
      throw new Error(`Director params API responded with ${response.status}`)
    }

    const data = await response.json()
    return DirectorParamsResponseSchema.parse(data)
  } catch {
    return null
  }
}

export async function requestLatestAiWaveDebug(): Promise<AiWaveDebugSnapshot | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/debug/ai-wave/latest`, {
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`AI wave debug API responded with ${response.status}`)
    }

    const data = await response.json()
    return AiWaveDebugEnvelopeSchema.parse(data).latest
  } catch {
    return null
  }
}

export async function requestLatestDirectorDebug(): Promise<DirectorDebugSnapshot | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/debug/director/latest`, {
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Director debug API responded with ${response.status}`)
    }

    const data = await response.json()
    return DirectorDebugEnvelopeSchema.parse(data).latest
  } catch {
    return null
  }
}
