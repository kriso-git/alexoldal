import { useState, useEffect, useRef } from 'react'
import { daysSince, BAN_EPOCH_ISO } from '../data.js'

const LS_KEY = 'befosas_counter'

function getBudapestDateStr() {
  return new Intl.DateTimeFormat('hu-HU', {
    timeZone: 'Europe/Budapest',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
}

function loadCount() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return 0
    const { date, count } = JSON.parse(raw)
    return date === getBudapestDateStr() ? count : 0
  } catch { return 0 }
}

function saveCount(n) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ date: getBudapestDateStr(), count: n }))
  } catch {}
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
  const [count, setCount] = useState(() => loadCount())
  const countRef = useRef(loadCount())

  useEffect(() => {
    let timeoutId

    const tick = () => {
      const today = getBudapestDateStr()
      let stored = { date: today, count: countRef.current }
      try {
        const raw = localStorage.getItem(LS_KEY)
        if (raw) stored = JSON.parse(raw)
      } catch {}

      const currentCount = stored.date === today ? stored.count : 0
      const inc = Math.random() < 0.5 ? 1 : 2
      const next = currentCount + inc
      countRef.current = next
      saveCount(next)
      setCount(next)

      // 1 perc – 30 perc között random
      const nextDelay = 60_000 + Math.random() * 1_740_000
      timeoutId = setTimeout(tick, nextDelay)
    }

    // első tick is 1–30 perc után
    timeoutId = setTimeout(tick, 60_000 + Math.random() * 1_740_000)
    return () => clearTimeout(timeoutId)
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
        marginTop: 8,
        padding: '6px 8px',
        background: 'rgba(var(--accent-rgb), 0.06)',
        border: '1px solid rgba(var(--accent-rgb), 0.3)',
        borderRadius: 4,
        fontSize: 9,
        lineHeight: 1.7,
        letterSpacing: '0.05em',
        color: 'var(--text-dim)',
      }}>
        🚽 Random befosások Magyarországon:<br />
        <FlipNumber value={count} />
      </div>
    </div>
  )
}
