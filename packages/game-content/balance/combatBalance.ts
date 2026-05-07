import type { CombatBalanceDef } from './types.js'

export const combatBalance = {
  // One balance unit is the target time for a normal enemy to survive against
  // one standard sustained-damage tower. Raise this to slow the whole combat
  // pace down; lower it to make enemies and buildings die faster globally.
  timeUnitSeconds: 4,

  // Baseline sustained single-target tower output. Most enemy HP and tower
  // attackPower values are derived from this number, so it is the main knob
  // for global player-side damage.
  standardTowerDps: 24,

  // Heavy attackers define the building-damage benchmark. Raising this makes
  // enemies break buildings faster without changing enemy HP.
  heavySiegeDpsToTowerDpsRatio: 1.55,

  // Global movement pace knob. The current 5x9 board has a much shorter
  // approach path than the older prototype, so enemy travel must be slowed
  // globally to keep reaction windows and lane recovery readable.
  enemySpeedMultiplier: 0.75,

  // TTK means "time to kill": how many balance units each enemy role should
  // survive against the standard tower. Boss is intentionally tuned as a final
  // wave multi-tower check, so it uses a larger multiplier than regular roles.
  enemyTtkUnits: {
    normal: 1.15,
    fast: 0.82,
    heavy_attack: 2.25,
    flying: 1.05,
    boss: 10.5
  },

  // TTD means "time to die": how many balance units each building class should
  // survive against one heavy attacker. These ratios keep wall, frontline,
  // backline, and economy buildings distinct while sharing one global knob.
  buildingTtdUnitsAgainstHeavy: {
    wall: 2,
    meleeTower: 1.05,
    rangedTower: 0.75,
    economy: 0.58,
    laserTower: 0.48
  }
} as const satisfies CombatBalanceDef

export function enemyHpFromTtkUnits(ttkUnits: number) {
  return roundedPositive(combatBalance.standardTowerDps * combatBalance.timeUnitSeconds * ttkUnits)
}

export function buildingHpFromTtdUnits(ttdUnits: number) {
  return roundedPositive(getHeavySiegeDps() * combatBalance.timeUnitSeconds * ttdUnits)
}

export function attackPowerFromDpsMultiplier(dpsMultiplier: number, attackInterval: number) {
  return roundedPositive(combatBalance.standardTowerDps * dpsMultiplier * attackInterval)
}

export function buildingDamageFromSiegeMultiplier(siegeDpsMultiplier: number, attackInterval: number) {
  return roundedNonNegative(getHeavySiegeDps() * siegeDpsMultiplier * attackInterval)
}

export function enemySpeedFromBase(baseSpeed: number) {
  return roundedDecimal(baseSpeed * combatBalance.enemySpeedMultiplier)
}

export function getHeavySiegeDps() {
  return combatBalance.standardTowerDps * combatBalance.heavySiegeDpsToTowerDpsRatio
}

function roundedPositive(value: number) {
  return Math.max(1, Math.round(value))
}

function roundedNonNegative(value: number) {
  return Math.max(0, Math.round(value))
}

function roundedDecimal(value: number) {
  return Math.max(0.05, Math.round(value * 100) / 100)
}
