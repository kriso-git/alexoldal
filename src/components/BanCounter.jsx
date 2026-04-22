import { useState, useEffect, useRef } from 'react'
import { daysSince, BAN_EPOCH_ISO } from '../data.js'

// Deterministic global befosás count — same value on all devices at the same UTC time.
// Uses a seeded LCG per UTC-day, advancing every 15 minutes.
function computeBefosas() {
  const PERIOD_MS = 15 * 60 * 1000 // 15-minute periods (96/day)
  const now = Date.now()
  const midnight = new Date(now)
  midnight.setUTCHours(0, 0, 0, 0)
  const dateKey = midnight.toISOString().slice(0, 10) // e.g. "2026-04-21"
  const period = Math.floor((now - midnight.getTime()) / PERIOD_MS) // 0–95

  // Seed from date string
  let seed = 0
  for (const c of dateKey) seed = ((seed * 31 + c.charCodeAt(0)) & 0x7fffffff)

  // LCG accumulate increments for each past period
  let count = 0
  for (let i = 0; i < period; i++) {
    seed = ((seed * 1664525 + 1013904223) >>> 0)
    const r = seed % 100
    if (r < 35) count += r < 10 ? 2 : 1  // ~35% chance, avg ~1.28 per hit
  }
  return count
}

function msUntilNextPeriod() {
  const PERIOD_MS = 15 * 60 * 1000
  const midnight = new Date()
  midnight.setUTCHours(0, 0, 0, 0)
  const elapsed = Date.now() - midnight.getTime()
  return PERIOD_MS - (elapsed % PERIOD_MS)
}

function FlipDigit({ char }) {
  const [flip, setFlip] = useState(false)
  const prev = useRef(char)

  useEffect(() => {
    if (char !== prev.current) {
      prev.current = char
      setFlip(true)
      const t = setTimeout(() => setFlip(false), 350)
      return () => clearTimeout(t)
    }
  }, [char])

  return (
    <span className={flip ? 'flip-digit flipping' : 'flip-digit'} style={{ display: 'inline-block' }}>
      {char}
    </span>
  )
}

function FlipNumber({ value }) {
  const str = value.toLocaleString('hu')
  return (
    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--accent)', letterSpacing: '0.05em' }}>
      {str.split('').map((c, i) => <FlipDigit key={i} char={c} />)}
    </span>
  )
}

export default function BanCounter() {
  const [count, setCount] = useState(() => computeBefosas())

  useEffect(() => {
    // Fire at the next period boundary, then every 15 minutes
    let intervalId = null
    const timeoutId = setTimeout(() => {
      setCount(computeBefosas())
      intervalId = setInterval(() => setCount(computeBefosas()), 15 * 60 * 1000)
    }, msUntilNextPeriod())

    return () => { clearTimeout(timeoutId); clearInterval(intervalId) }
  }, [])

  const d = daysSince(BAN_EPOCH_ISO)

  return (
    <div className="ban-stat">
      <style>{`
        @keyframes flipIn {
          0%   { transform: rotateX(90deg); opacity: 0; }
          100% { transform: rotateX(0deg);  opacity: 1; }
        }
        .flip-digit { display: inline-block; }
        .flip-digit.flipping {
          animation: flipIn 0.32s ease-out;
          transform-origin: center bottom;
        }
      `}</style>
      <div className="ban-stat-value">{d.toLocaleString('hu')}</div>
      <div className="ban-stat-label"><span>NAPJA NINCS BAN</span><span className="ban-dot"></span></div>
      <div className="ban-stat-sub">1 game ban</div>
      <div style={{
        marginTop: 8, padding: '6px 8px',
        background: 'rgba(var(--accent-rgb), 0.06)',
        border: '1px solid rgba(var(--accent-rgb), 0.3)',
        borderRadius: 4, fontSize: 9, lineHeight: 1.7,
        letterSpacing: '0.05em', color: 'var(--text-dim)',
      }}>
        🚽 Random befosások Magyarországon:<br />
        <FlipNumber value={count} />
      </div>
    </div>
  )
}
