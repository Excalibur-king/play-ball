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
    <div className="hud-intel">
      {/* Wave badge */}
      <div className="hud-wave">
        <span className="hud-wave__diamond" aria-hidden="true" />
        <span className="hud-wave__label">WAVE</span>
        <span className="hud-wave__current">{wave}</span>
        <span className="hud-wave__slash">/</span>
        <span className="hud-wave__total">{totalWaves}</span>
      </div>

      {/* Enemies */}
      <div className="hud-enemies">
        <span className="hud-threat">
          <span className="hud-threat__ping" aria-hidden="true" />
          <span className="hud-threat__val">{zombieCount}</span>
        </span>
        {flyingEnemyCount > 0 && (
          <span className="hud-threat hud-threat--air">
            <span className="hud-threat__ping" aria-hidden="true" />
            <span className="hud-threat__val">{flyingEnemyCount}</span>
            <span className="hud-threat__badge">AIR</span>
          </span>
        )}
      </div>
    </div>
  )
}

type BaseHealthPanelProps = {
  baseHp: number
  baseMaxHp: number
  baseShield: number
}

export function BaseHealthPanel({ baseHp, baseMaxHp, baseShield }: BaseHealthPanelProps) {
  const safeMax = Math.max(1, baseMaxHp)
  const pct = Math.max(0, Math.min(100, (baseHp / safeMax) * 100))
  const status = pct <= 30 ? 'danger' : pct <= 60 ? 'warning' : 'ok'
  const shieldPct = baseShield > 0
    ? Math.max(0, Math.min(100 - pct, (baseShield / safeMax) * 100))
    : 0

  return (
    <section className={`hud-hp hud-hp--${status}`} aria-label="基地血量">
      <span className="hud-hp__label">BASE</span>
      <div className="hud-hp__bar">
        <span className="hud-hp__fill" style={{ width: `${pct}%` }} />
        {shieldPct > 0 && (
          <span className="hud-hp__shield" style={{ left: `${pct}%`, width: `${shieldPct}%` }} />
        )}
        <span className="hud-hp__shine" aria-hidden="true" />
      </div>
      <span className="hud-hp__num">{baseHp}{baseShield > 0 && <em>+{baseShield}</em>}</span>
    </section>
  )
}
