import { mkdir, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const packageDir = resolve(scriptDir, '..')
const generatedDir = resolve(packageDir, 'data/generated')
const { contentBundle } = await import('../.content-build/balance/index.js')

const errors = []

function fail(message) {
  errors.push(message)
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function assertNumberRange(label, value, min, max) {
  if (!isFiniteNumber(value) || value < min || value > max) {
    fail(`${label} must be a number between ${min} and ${max}, got ${String(value)}`)
  }
}

function assertPositiveNumber(label, value) {
  if (!isFiniteNumber(value) || value <= 0) {
    fail(`${label} must be a positive number, got ${String(value)}`)
  }
}

function assertUniqueIds(collectionName, items) {
  const seen = new Set()
  for (const item of items) {
    if (!item.id || typeof item.id !== 'string') {
      fail(`${collectionName} item is missing a string id`)
      continue
    }
    if (seen.has(item.id)) {
      fail(`${collectionName} has duplicate id "${item.id}"`)
    }
    seen.add(item.id)
  }
  return seen
}

function assertJsonSafe(name, value) {
  try {
    JSON.stringify(value)
  } catch (error) {
    fail(`${name} is not JSON serializable: ${error instanceof Error ? error.message : String(error)}`)
  }
}

const mapIds = assertUniqueIds('maps', contentBundle.maps)
const buildingIds = assertUniqueIds('buildings', contentBundle.buildings)
const enemyIds = assertUniqueIds('enemies', contentBundle.enemies)
assertUniqueIds('enemyBalanceProfiles', contentBundle.enemyBalanceProfiles)
assertUniqueIds('cards', contentBundle.cards)
assertUniqueIds('waves', contentBundle.waves)
assertUniqueIds('directorRules', contentBundle.directorRules)

assertNumberRange('aiStrategy.modelTuning.temperature', contentBundle.aiStrategy.modelTuning.temperature, 0, 2)
assertPositiveNumber('aiStrategy.modelTuning.maxTokens', contentBundle.aiStrategy.modelTuning.maxTokens)
assertPositiveNumber('gameplay.combatBalance.timeUnitSeconds', contentBundle.gameplay.combatBalance.timeUnitSeconds)
assertPositiveNumber('gameplay.combatBalance.standardTowerDps', contentBundle.gameplay.combatBalance.standardTowerDps)
assertPositiveNumber(
  'gameplay.combatBalance.heavySiegeDpsToTowerDpsRatio',
  contentBundle.gameplay.combatBalance.heavySiegeDpsToTowerDpsRatio
)
for (const role of ['normal', 'fast', 'heavy_attack', 'flying', 'boss']) {
  assertPositiveNumber(
    `gameplay.combatBalance.enemyTtkUnits.${role}`,
    contentBundle.gameplay.combatBalance.enemyTtkUnits[role]
  )
}
for (const key of ['wall', 'meleeTower', 'rangedTower', 'economy', 'laserTower']) {
  assertPositiveNumber(
    `gameplay.combatBalance.buildingTtdUnitsAgainstHeavy.${key}`,
    contentBundle.gameplay.combatBalance.buildingTtdUnitsAgainstHeavy[key]
  )
}
assertPositiveNumber('gameplay.activeStrategyDraw.cost', contentBundle.gameplay.activeStrategyDraw.cost)
assertPositiveNumber('gameplay.activeStrategyDraw.cooldownSeconds', contentBundle.gameplay.activeStrategyDraw.cooldownSeconds)
assertPositiveNumber('gameplay.runLoop.initialReadySeconds', contentBundle.gameplay.runLoop.initialReadySeconds)
assertPositiveNumber('gameplay.runLoop.postCardReadySeconds', contentBundle.gameplay.runLoop.postCardReadySeconds)
assertPositiveNumber('gameplay.runLoop.waveCardSelectSeconds', contentBundle.gameplay.runLoop.waveCardSelectSeconds)

for (const map of contentBundle.maps) {
  assertPositiveNumber(`map "${map.id}" laneCount`, map.laneCount)
  assertPositiveNumber(`map "${map.id}" baseHp`, map.baseHp)
  if (!enemyIds.has(map.bossId)) {
    fail(`map "${map.id}" references missing bossId "${map.bossId}"`)
  }
}

for (const building of contentBundle.buildings) {
  assertPositiveNumber(`building "${building.id}" cost`, building.cost)
  assertPositiveNumber(`building "${building.id}" hp`, building.hp)

  if (building.type === 'energy') {
    assertPositiveNumber(`building "${building.id}" purchasePowerPerTick`, building.purchasePowerPerTick)
    assertPositiveNumber(`building "${building.id}" productionInterval`, building.productionInterval)
  }

  if (building.type === 'attack') {
    assertPositiveNumber(`building "${building.id}" attackPower`, building.attackPower)
    assertPositiveNumber(`building "${building.id}" attackInterval`, building.attackInterval)
    assertPositiveNumber(`building "${building.id}" attackRange`, building.attackRange)

    if ((building.attackKind === 'projectile' || building.attackKind === 'laser') && typeof building.projectileKey !== 'string') {
      fail(`building "${building.id}" must define projectileKey for attackKind "${String(building.attackKind)}"`)
    }

    if (building.attackKind === 'laser') {
      assertPositiveNumber(`building "${building.id}" charges`, building.charges)
    }
  }

  if (building.upgrade) {
    assertPositiveNumber(`building "${building.id}" upgrade.cost`, building.upgrade.cost)
  }
}

for (const enemy of contentBundle.enemies) {
  assertPositiveNumber(`enemy "${enemy.id}" hp`, enemy.hp)
  assertPositiveNumber(`enemy "${enemy.id}" speed`, enemy.speed)
  assertPositiveNumber(`enemy "${enemy.id}" directorCost`, enemy.directorCost)
  assertNumberRange(`enemy "${enemy.id}" buildingDamage`, enemy.buildingDamage, 0, Number.MAX_SAFE_INTEGER)
  assertNumberRange(`enemy "${enemy.id}" attackInterval`, enemy.attackInterval, 0, Number.MAX_SAFE_INTEGER)
  assertPositiveNumber(`enemy "${enemy.id}" baseDamage`, enemy.baseDamage)
  assertPositiveNumber(`enemy "${enemy.id}" firstWave`, enemy.firstWave)
}

for (const profile of contentBundle.enemyBalanceProfiles) {
  validateEnemyBalanceModifier(`enemyBalanceProfile "${profile.id}".globalModifiers`, profile.globalModifiers)

  for (const [role, modifiers] of Object.entries(profile.roleModifiers ?? {})) {
    validateEnemyBalanceModifier(`enemyBalanceProfile "${profile.id}".roleModifiers.${role}`, modifiers)
  }

  for (const [enemyId, modifiers] of Object.entries(profile.enemyModifiers ?? {})) {
    if (!enemyIds.has(enemyId)) {
      fail(`enemyBalanceProfile "${profile.id}" references missing enemy "${enemyId}"`)
    }

    validateEnemyBalanceModifier(`enemyBalanceProfile "${profile.id}".enemyModifiers.${enemyId}`, modifiers)
  }
}

for (const card of contentBundle.cards) {
  for (const [tag, value] of Object.entries(card.solves)) {
    assertNumberRange(`card "${card.id}" solves.${tag}`, value, 0, 1)
  }
  const possibleBuildingTargets = [card.effect.target, card.effect.buildingId].filter((value) => typeof value === 'string')
  for (const target of possibleBuildingTargets) {
    const allowedNonBuildingTargets = new Set([
      'all_buildings',
      'all_attack_buildings',
      'all_enemies',
      'highest_pressure_route',
      'survival',
      'base'
    ])

    if (!buildingIds.has(target) && !allowedNonBuildingTargets.has(target)) {
      fail(`card "${card.id}" references missing building target "${target}"`)
    }
  }
}

for (const wave of contentBundle.waves) {
  if (!mapIds.has(wave.mapId)) {
    fail(`wave "${wave.id}" references missing mapId "${wave.mapId}"`)
  }
  assertPositiveNumber(`wave "${wave.id}" index`, wave.index)
  assertPositiveNumber(`wave "${wave.id}" durationSeconds`, wave.durationSeconds)
  assertNumberRange(`wave "${wave.id}" directorReserveBudget`, wave.directorReserveBudget, 0, Number.MAX_SAFE_INTEGER)

  if (wave.bossId && !enemyIds.has(wave.bossId)) {
    fail(`wave "${wave.id}" references missing bossId "${wave.bossId}"`)
  }

  for (const [groupIndex, group] of wave.enemyGroups.entries()) {
    const label = `wave "${wave.id}" enemyGroups[${groupIndex}]`
    if (!enemyIds.has(group.enemyId)) {
      fail(`${label} references missing enemyId "${group.enemyId}"`)
    }
    assertPositiveNumber(`${label}.count`, group.count)
    assertNumberRange(`${label}.startSecond`, group.startSecond, 0, wave.durationSeconds)
    assertPositiveNumber(`${label}.interval`, group.interval)
  }
}

assertJsonSafe('contentBundle', contentBundle)

if (errors.length > 0) {
  console.error('Content export failed:')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

const generatedAt = new Date().toISOString()
const files = {
  'maps.json': contentBundle.maps,
  'buildings.json': contentBundle.buildings,
  'enemies.json': contentBundle.enemies,
  'enemyBalanceProfiles.json': contentBundle.enemyBalanceProfiles,
  'cards.json': contentBundle.cards,
  'waves.json': contentBundle.waves,
  'directorRules.json': contentBundle.directorRules,
  'aiStrategy.json': contentBundle.aiStrategy,
  'gameplay.json': contentBundle.gameplay,
  'content.json': {
    generatedAt,
    ...contentBundle
  },
  'manifest.json': {
    generatedAt,
    version: contentBundle.version,
    counts: {
      maps: contentBundle.maps.length,
      buildings: contentBundle.buildings.length,
      enemies: contentBundle.enemies.length,
      enemyBalanceProfiles: contentBundle.enemyBalanceProfiles.length,
      cards: contentBundle.cards.length,
      waves: contentBundle.waves.length,
      directorRules: contentBundle.directorRules.length,
      aiStrategy: 1,
      gameplay: 1
    }
  }
}

await rm(generatedDir, { recursive: true, force: true })
await mkdir(generatedDir, { recursive: true })

for (const [fileName, data] of Object.entries(files)) {
  await writeFile(resolve(generatedDir, fileName), `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

console.log(`Exported ${Object.keys(files).length} content files to ${generatedDir}`)

function validateEnemyBalanceModifier(label, modifiers) {
  if (!modifiers) {
    return
  }

  if (modifiers.hpMultiplier !== undefined) assertNumberRange(`${label}.hpMultiplier`, modifiers.hpMultiplier, 0.1, 5)
  if (modifiers.speedMultiplier !== undefined) assertNumberRange(`${label}.speedMultiplier`, modifiers.speedMultiplier, 0.1, 5)
  if (modifiers.buildingDamageMultiplier !== undefined) {
    assertNumberRange(`${label}.buildingDamageMultiplier`, modifiers.buildingDamageMultiplier, 0, 5)
  }
  if (modifiers.baseDamageMultiplier !== undefined) {
    assertNumberRange(`${label}.baseDamageMultiplier`, modifiers.baseDamageMultiplier, 0.1, 5)
  }
  if (modifiers.attackIntervalMultiplier !== undefined) {
    assertNumberRange(`${label}.attackIntervalMultiplier`, modifiers.attackIntervalMultiplier, 0.1, 5)
  }
  if (modifiers.directorCostMultiplier !== undefined) {
    assertNumberRange(`${label}.directorCostMultiplier`, modifiers.directorCostMultiplier, 0.1, 5)
  }
  if (modifiers.firstWaveOffset !== undefined && !isFiniteNumber(modifiers.firstWaveOffset)) {
    fail(`${label}.firstWaveOffset must be a finite number, got ${String(modifiers.firstWaveOffset)}`)
  }
}
