import { Pause, Play, RotateCcw } from 'lucide-react'

type ActionBarProps = {
  canStartWave: boolean
  isFinished: boolean
  paused: boolean
  onStartWave: () => void
  onPauseToggle: () => void
  onReset: () => void
}

export function ActionBar({ canStartWave, isFinished, paused, onStartWave, onPauseToggle, onReset }: ActionBarProps) {
  return (
    <div className="hud-actions">
      <button className="icon-button primary" disabled={!canStartWave} title="Start wave" onClick={onStartWave}>
        <Play size={18} />
        <span>Start</span>
      </button>
      <button className="icon-button" disabled={isFinished} title={paused ? 'Resume' : 'Pause'} onClick={onPauseToggle}>
        {paused ? <Play size={18} /> : <Pause size={18} />}
        <span>{paused ? 'Resume' : 'Pause'}</span>
      </button>
      <button className="icon-button" title="Reset run" onClick={onReset}>
        <RotateCcw size={18} />
        <span>Reset</span>
      </button>
    </div>
  )
}
