import { SunMedium } from 'lucide-react'

export function SunCounter({ sun }: { sun: number }) {
  return (
    <div className="sun-counter">
      <SunMedium size={22} />
      <strong>{sun}</strong>
    </div>
  )
}
