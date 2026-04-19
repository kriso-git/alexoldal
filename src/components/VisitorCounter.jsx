import { useState, useEffect } from 'react'
import { visitsApi } from '../api.js'
import { toast } from '../effects.js'

export default function VisitorCounter() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    visitsApi.increment().then(({ count }) => {
      setCount(count)
      if (count > 0 && count % 100 === 0) {
        setTimeout(() => toast(`🎉 ${count.toLocaleString('hu-HU')}. látogató! Köszönjük!`), 800)
      }
    }).catch(() => {
      visitsApi.get().then(({ count }) => setCount(count)).catch(() => setCount(0))
    })
  }, [])

  const str = count === null ? '0000000' : String(count).padStart(7, '0')
  return (
    <div className="visitor-counter" title="Látogatószám">
      <span className="label">VISITS</span>
      <span>{str}</span>
    </div>
  )
}
