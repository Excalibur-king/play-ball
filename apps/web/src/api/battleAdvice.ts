import { BattleAdviceRequestSchema, type BattleAdviceRequest } from '@tower-rogue/shared'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787'

export async function streamBattleAdvice(
  request: BattleAdviceRequest,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/advice/draw-cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(BattleAdviceRequestSchema.parse(request)),
    signal
  })

  if (!response.ok || !response.body) {
    throw new Error(`Battle advice API responded with ${response.status}`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()

    if (done) {
      break
    }

    onChunk(decoder.decode(value, { stream: true }))
  }
}
