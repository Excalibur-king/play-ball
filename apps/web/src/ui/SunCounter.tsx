export function SunCounter({ sun }: { sun: number }) {
  return (
    <div className="top-bar-sun">
      <span className="top-bar-sun-icon">☀</span>
      <strong className="top-bar-sun-value">{sun}</strong>
    </div>
  )
}
