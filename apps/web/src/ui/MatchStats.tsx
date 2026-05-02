type MatchStatsProps = {
  baseHp: number
  wave: number
  totalWaves: number
  fusionCount: number
  zombieCount: number
  dangerousZombieCount: number
}

export function MatchStats({ baseHp, wave, totalWaves, fusionCount, zombieCount, dangerousZombieCount }: MatchStatsProps) {
  return (
    <div className="match-stats">
      <span>Lawn {baseHp}</span>
      <span>
        Wave {wave}/{totalWaves}
      </span>
      <span>Fusion {fusionCount}</span>
      <span>Zombies {zombieCount}</span>
      {dangerousZombieCount > 0 && <span className="danger-stat">Danger {dangerousZombieCount}</span>}
    </div>
  )
}
