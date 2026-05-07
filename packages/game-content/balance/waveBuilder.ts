import type { WaveDef, WaveEnemyGroup, WavePhaseDef } from './types.js'

type PhaseWaveGroupInput = Omit<WaveEnemyGroup, 'startSecond'> & {
  startOffset?: number
}

type PhaseWaveOptions = {
  id?: string
  label?: string
  description?: string
  stepSeconds?: number
}

type WavePhase = {
  id?: string
  label?: string
  description?: string
  startSecond: number
  groups: readonly WaveEnemyGroup[]
}

type BuildWaveInput = Omit<WaveDef, 'enemyGroups' | 'phases'> & {
  phases: readonly WavePhase[]
}

export function phaseWave(
  startSecond: number,
  groups: PhaseWaveGroupInput | readonly PhaseWaveGroupInput[],
  options: PhaseWaveOptions = {}
): WavePhase {
  assertNonNegativeFinite('phaseWave.startSecond', startSecond)

  const { id, label, description, stepSeconds = 0 } = options
  assertNonNegativeFinite('phaseWave.stepSeconds', stepSeconds)

  const normalizedGroups = (Array.isArray(groups) ? groups : [groups]).map((group, index) => {
    const { startOffset = 0, ...groupFields } = group
    assertNonNegativeFinite(`phaseWave.groups[${index}].startOffset`, startOffset)

    return {
      ...groupFields,
      startSecond: roundToTenth(startSecond + startOffset + index * stepSeconds)
    }
  })

  return {
    id,
    label,
    description,
    startSecond,
    groups: normalizedGroups
  }
}

export function buildWave(input: BuildWaveInput): WaveDef {
  const { phases, ...wave } = input
  const sortedPhases = [...phases]
    .map((phase, index) => ({ phase, index }))
    .sort((left, right) => left.phase.startSecond - right.phase.startSecond || left.index - right.index)
    .map(({ phase }) => phase)
  const enemyGroups = sortedPhases
    .flatMap((phase) => phase.groups)
    .map((group, index) => ({ group, index }))
    .sort((left, right) => left.group.startSecond - right.group.startSecond || left.index - right.index)
    .map(({ group }) => group)
  const normalizedPhases: WavePhaseDef[] = sortedPhases.map((phase, index) => ({
    id: phase.id ?? `${wave.id}_phase_${String(index + 1).padStart(2, '0')}`,
    label: phase.label ?? `阶段 ${index + 1}`,
    description: phase.description,
    startSecond: roundToTenth(phase.startSecond),
    endSecond: roundToTenth(sortedPhases[index + 1]?.startSecond ?? wave.durationSeconds)
  }))

  return {
    ...wave,
    phases: normalizedPhases,
    enemyGroups
  }
}

function assertNonNegativeFinite(name: string, value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative finite number. Received: ${String(value)}`)
  }
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10
}

export type { BuildWaveInput, PhaseWaveGroupInput, PhaseWaveOptions, WavePhase }
