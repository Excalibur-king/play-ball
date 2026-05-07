import {
  StrategyAdviceDebugEnvelopeSchema,
  StrategyAdviceRequestSchema,
  StrategyAdviceResponseSchema,
  type StrategyAdviceDebugSnapshot,
  type StrategyAdviceRequest,
  type StrategyAdviceResponse
} from '@tower-rogue/shared'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787'

export async function requestStrategyAdvice(request: StrategyAdviceRequest): Promise<StrategyAdviceResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/strategy/advice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(StrategyAdviceRequestSchema.parse(request))
    })

    if (!response.ok) {
      throw new Error(`Strategy advice API responded with ${response.status}`)
    }

    const data = await response.json()
    return StrategyAdviceResponseSchema.parse(data)
  } catch (error) {
    console.warn('[strategy-advice] request failed:', error)
    return null
  }
}

export async function requestLatestStrategyAdviceDebug(): Promise<StrategyAdviceDebugSnapshot | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/debug/strategy-advice/latest`, {
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`Strategy advice debug API responded with ${response.status}`)
    }

    const data = await response.json()
    return StrategyAdviceDebugEnvelopeSchema.parse(data).latest
  } catch (error) {
    console.warn('[strategy-advice] debug request failed:', error)
    return null
  }
}
