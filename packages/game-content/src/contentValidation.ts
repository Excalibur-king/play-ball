import {
  plantDefinitions,
  plantFusionDefinitions,
  plantTypes,
  waves,
  zombieDefinitions
} from './index'
import type { PlantFusionKey, PlantType, ZombieType } from './index'

export type ContentValidationIssue = {
  path: string
  message: string
}

export function validateCurrentContent(): ContentValidationIssue[] {
  const issues: ContentValidationIssue[] = []
  validatePlants(issues)
  validateFusions(issues)
  validateZombies(issues)
  validateWaves(issues)
  return issues
}

export function assertValidCurrentContent(): void {
  const issues = validateCurrentContent()

  if (issues.length > 0) {
    const summary = issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n')
    throw new Error(`Game content validation failed:\n${summary}`)
  }
}

function validatePlants(issues: ContentValidationIssue[]) {
  const seen = new Set<PlantType>()

  for (const plantType of plantTypes) {
    if (seen.has(plantType)) {
      issues.push({ path: `plantTypes.${plantType}`, message: 'Plant type is duplicated.' })
    }

    seen.add(plantType)
  }

  for (const [plantType, definition] of Object.entries(plantDefinitions) as Array<[PlantType, (typeof plantDefinitions)[PlantType]]>) {
    if (!plantTypes.includes(plantType)) {
      issues.push({ path: `plantDefinitions.${plantType}`, message: 'Plant definition is missing from plantTypes.' })
    }

    if (definition.type !== plantType) {
      issues.push({ path: `plantDefinitions.${plantType}.type`, message: 'Plant definition type must match its record key.' })
    }

    if (definition.cost < 0) {
      issues.push({ path: `plantDefinitions.${plantType}.cost`, message: 'Plant cost cannot be negative.' })
    }

    if (definition.hp < 0) {
      issues.push({ path: `plantDefinitions.${plantType}.hp`, message: 'Plant hp cannot be negative.' })
    }

    if (definition.cooldown < 0) {
      issues.push({ path: `plantDefinitions.${plantType}.cooldown`, message: 'Plant cooldown cannot be negative.' })
    }

    if (definition.role === 'damage') {
      requirePositiveNumber(issues, `plantDefinitions.${plantType}.damage`, definition.damage)
      requirePositiveNumber(issues, `plantDefinitions.${plantType}.fireInterval`, definition.fireInterval)
      requirePositiveNumber(issues, `plantDefinitions.${plantType}.projectileSpeed`, definition.projectileSpeed)
    }

    if (definition.role === 'economy') {
      requirePositiveNumber(issues, `plantDefinitions.${plantType}.sunInterval`, definition.sunInterval)
      requirePositiveNumber(issues, `plantDefinitions.${plantType}.sunAmount`, definition.sunAmount)
    }

    if (definition.role === 'blocker' && definition.hp < 200) {
      issues.push({ path: `plantDefinitions.${plantType}.hp`, message: 'Blocker plants should have enough hp to hold a lane.' })
    }
  }
}

function validateFusions(issues: ContentValidationIssue[]) {
  for (const [fusionKey, definition] of Object.entries(plantFusionDefinitions) as Array<
    [PlantFusionKey, (typeof plantFusionDefinitions)[PlantFusionKey]]
  >) {
    if (definition.key !== fusionKey) {
      issues.push({ path: `plantFusionDefinitions.${fusionKey}.key`, message: 'Fusion key must match its record key.' })
    }

    const [first, second] = definition.components
    const expectedParts = fusionKey.split('+')

    if (expectedParts.length !== 2 || expectedParts[0] !== first || expectedParts[1] !== second) {
      issues.push({ path: `plantFusionDefinitions.${fusionKey}.components`, message: 'Fusion components must match the fusion key.' })
    }

    for (const component of definition.components) {
      if (!plantDefinitions[component]) {
        issues.push({ path: `plantFusionDefinitions.${fusionKey}.components`, message: `Unknown plant component "${component}".` })
      }
    }
  }
}

function validateZombies(issues: ContentValidationIssue[]) {
  for (const [zombieType, definition] of Object.entries(zombieDefinitions) as Array<[ZombieType, (typeof zombieDefinitions)[ZombieType]]>) {
    if (definition.type !== zombieType) {
      issues.push({ path: `zombieDefinitions.${zombieType}.type`, message: 'Zombie definition type must match its record key.' })
    }

    requirePositiveNumber(issues, `zombieDefinitions.${zombieType}.hp`, definition.hp)
    requirePositiveNumber(issues, `zombieDefinitions.${zombieType}.speed`, definition.speed)
    requirePositiveNumber(issues, `zombieDefinitions.${zombieType}.damage`, definition.damage)
    requirePositiveNumber(issues, `zombieDefinitions.${zombieType}.attackInterval`, definition.attackInterval)
  }
}

function validateWaves(issues: ContentValidationIssue[]) {
  if (waves.length === 0) {
    issues.push({ path: 'waves', message: 'At least one wave is required.' })
  }

  waves.forEach((wave, waveIndex) => {
    requirePositiveNumber(issues, `waves.${waveIndex}.totalZombies`, wave.totalZombies)
    requirePositiveNumber(issues, `waves.${waveIndex}.spawnInterval`, wave.spawnInterval)
    requirePositiveNumber(issues, `waves.${waveIndex}.zombieHpMultiplier`, wave.zombieHpMultiplier)

    if (wave.mix.length === 0) {
      issues.push({ path: `waves.${waveIndex}.mix`, message: 'Wave mix cannot be empty.' })
    }

    wave.mix.forEach((entry, mixIndex) => {
      if (!zombieDefinitions[entry.type]) {
        issues.push({ path: `waves.${waveIndex}.mix.${mixIndex}.type`, message: `Unknown zombie type "${entry.type}".` })
      }

      requirePositiveNumber(issues, `waves.${waveIndex}.mix.${mixIndex}.weight`, entry.weight)
    })
  })
}

function requirePositiveNumber(issues: ContentValidationIssue[], path: string, value: number | undefined) {
  if (typeof value !== 'number' || value <= 0) {
    issues.push({ path, message: 'Value must be a positive number.' })
  }
}
