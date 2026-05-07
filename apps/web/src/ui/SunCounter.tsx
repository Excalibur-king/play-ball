import { useEffect, useRef, useState } from 'react'

export function SunCounter({ sun }: { sun: number }) {
  const [flash, setFlash] = useState(false)
  const prevSun = useRef(sun)

  useEffect(() => {
    if (sun !== prevSun.current) {
      setFlash(true)
      prevSun.current = sun
      const timer = setTimeout(() => setFlash(false), 600)
      return () => clearTimeout(timer)
    }
  }, [sun])

  return (
    <div className={`hud-sun${flash ? ' hud-sun--flash' : ''}`}>
      <span className="hud-sun__ring" aria-hidden="true">
        <span className="hud-sun__core" />
      </span>
      <strong className="hud-sun__value">{sun}</strong>
    </div>
  )
}
