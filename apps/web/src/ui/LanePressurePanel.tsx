import type { HudSnapshot } from '@tower-rogue/game-core'

type LanePressurePanelProps = {
  lanes: HudSnapshot['lanePressure']
}

export function LanePressurePanel({ lanes }: LanePressurePanelProps) {
  if (lanes.length === 0) {
    return null
  }

  const topLane = [...lanes].sort((a, b) => b.pressureScore - a.pressureScore)[0]

  return (
    <div className="lane-pressure-panel">
      <div className="lane-pressure-title">
        <strong>路线压力</strong>
        {topLane ? <span>最高压：第 {topLane.lane + 1} 路</span> : null}
      </div>
      <div className="lane-pressure-list">
        {lanes.map((lane) => {
          const pressurePercent = Math.round(lane.pressureScore * 100)

          return (
            <div className={`lane-pressure-row ${getPressureClassName(lane.pressureScore)}`} key={lane.lane}>
              <div className="lane-pressure-row-head">
                <strong>第 {lane.lane + 1} 路</strong>
                <span>{getPressureLabel(lane.pressureScore)}</span>
              </div>
              <div className="lane-pressure-bar">
                <div className="lane-pressure-fill" style={{ width: `${pressurePercent}%` }} />
              </div>
              <div className="lane-pressure-meta">
                <span>压力 {pressurePercent}%</span>
                <span>漏怪 {lane.leaksLastWave}</span>
                <span>拆塔 {lane.destroyedBuildingsLastWave}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getPressureLabel(score: number) {
  if (score >= 0.8) return '濒临崩盘'
  if (score >= 0.6) return '高压'
  if (score >= 0.3) return '紧张'
  return '稳定'
}

function getPressureClassName(score: number) {
  if (score >= 0.8) return 'critical'
  if (score >= 0.6) return 'high'
  if (score >= 0.3) return 'mid'
  return 'safe'
}
