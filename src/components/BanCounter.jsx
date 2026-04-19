import { useState, useEffect } from 'react'
import { daysSince, secondsLiveComponent, BAN_EPOCH_ISO } from '../data.js'

export default function BanCounter() {
  const [, setNow] = useState(Date.now())
  useEffect(() => {
    let id = null
    const start = () => { if (!id) id = setInterval(() => setNow(Date.now()), 1000) }
    const stop = () => { if (id) { clearInterval(id); id = null } }
    start()
    const onVis = () => document.hidden ? stop() : start()
    document.addEventListener("visibilitychange", onVis)
    return () => { stop(); document.removeEventListener("visibilitychange", onVis) }
  }, [])
  const d = daysSince(BAN_EPOCH_ISO)
  const { h, m, s } = secondsLiveComponent(BAN_EPOCH_ISO)
  const hhmmss = `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
  return (
    <div className="ban-stat">
      <div className="ban-stat-label"><span>NAPJA NINCS BAN</span><span className="ban-dot"></span></div>
      <div className="ban-stat-value">{d.toLocaleString("hu")}</div>
      <div className="ban-stat-sub">1 game ban · {hhmmss} óra élő</div>
    </div>
  )
}
