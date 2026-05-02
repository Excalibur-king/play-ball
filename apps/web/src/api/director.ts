import {
  HiddenDirectorResponseSchema,
  type HiddenDirectorResponse,
  type HiddenDirectorRun
} from '@tower-rogue/shared'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787'

export async function requestHiddenDirector(run: HiddenDirectorRun): Promise<HiddenDirectorResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/director/internal-dialogue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        run,
        lastOutcome: 'wave-cleared'
      })
    })

    if (!response.ok) {
      throw new Error(`Director API responded with ${response.status}`)
    }

    const data = await response.json()
    return HiddenDirectorResponseSchema.parse(data)
  } catch {
    return {
      source: 'backend-mock',
      privateDialogue: [],
      adjustment: {
        spawnIntervalMultiplier: 1,
        zombieHpMultiplier: 1,
        sunDripMultiplier: 1
      }
    }
  }
}
