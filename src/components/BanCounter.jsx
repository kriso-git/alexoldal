import { useState, useEffect, useRef } from 'react'
import { daysSince, BAN_EPOCH_ISO } from '../data.js'

// Deterministic ICE deportation estimate — same on all devices at the same UTC time.
// Based on reported ~480 ICE removals/day during Trump 2025 admin (CBS, AP, DHS sources).
// Uses 30-min periods with a seeded LCG per UTC-day.
function computeIceToday() {
  const PERIOD_MS = 30 * 60 * 1000 // 48 periods/day
  const DAILY_TARGET = 480 // ~10 per period avg
  const now = Date.now()
  const midnight = new Date(now)
  midnight.setUTCHours(0, 0, 0, 0)
  const dateKey = midnight.toISOString().slice(0, 10)
  const period = Math.floor((now - midnight.getTime()) / PERIOD_MS) // 0-47

  let seed = 0
  for (const c of dateKey) seed = ((seed * 31 + c.charCodeAt(0)) & 0x7fffffff)

  let count = 0
  for (let i = 0; i < period; i++) {
    seed = ((seed * 1664525 + 1013904223) >>> 0)
    count += 8 + (seed % 7) // 8–14 per period → avg ~11, 48 periods ≈ 528/day
  }
  return Math.min(count, DAILY_TARGET + 40)
}

function msUntilNextPeriod() {
  const PERIOD_MS = 30 * 60 * 1000
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
  const [count, setCount] = useState(() => computeIceToday())

  useEffect(() => {
    let intervalId = null
    const timeoutId = setTimeout(() => {
      setCount(computeIceToday())
      intervalId = setInterval(() => setCount(computeIceToday()), 30 * 60 * 1000)
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
        background: 'rgba(220,38,38,0.07)',
        border: '1px solid rgba(220,38,38,0.35)',
        borderRadius: 4, fontSize: 9, lineHeight: 1.7,
        letterSpacing: '0.05em', color: 'var(--text-dim)',
      }}>
        🇺🇸 ICE kitoloncolás ma (becsült):<br />
        <FlipNumber value={count} />
        <span style={{ display: 'block', marginTop: 2, fontSize: 8, opacity: 0.55 }}>
          forrás: DHS/AP/CBS · Trump 2025
        </span>
      </div>
    </div>
  )
}
