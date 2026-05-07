type MatchStatsProps = {
  wave: number
  totalWaves: number
  fusionCount: number
  zombieCount: number
  dangerousZombieCount: number
  flyingEnemyCount: number
}

export function MatchStats({
  wave,
  totalWaves,
  zombieCount,
  flyingEnemyCount
}: MatchStatsProps) {
  return (
    <div className="top-bar-stats">
      <span className="top-bar-chip">波次 {wave}/{totalWaves}</span>
      <span className="top-bar-chip">敌{zombieCount}</span>
      {flyingEnemyCount > 0 && <span className="top-bar-chip danger">飞行{flyingEnemyCount}</span>}
    </div>
  )
}

type BaseHealthPanelProps = {
  baseHp: number
  baseMaxHp: number
  baseShield: number
}

export function BaseHealthPanel({ baseHp, baseMaxHp, baseShield }: BaseHealthPanelProps) {
  const safeBaseMaxHp = Math.max(1, baseMaxHp)
  const baseHpPercent = Math.max(0, Math.min(100, (baseHp / safeBaseMaxHp) * 100))
  const baseHpStatus = baseHpPercent <= 30 ? 'danger' : baseHpPercent <= 60 ? 'warning' : 'healthy'

  return (
    <section className={`top-bar-base-hp ${baseHpStatus}`} aria-label="基地血量">
      <span className="top-bar-chip">基地{baseHp}{baseShield > 0 ? `+${baseShield}` : ''}</span>
      <span className="top-bar-hp-bar" aria-hidden="true">
        <span className="top-bar-hp-fill" style={{ width: `${baseHpPercent}%` }} />
      </span>
    </section>
  )
}
