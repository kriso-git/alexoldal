import { useState, useEffect, useRef } from 'react'
import { daysSince, BAN_EPOCH_ISO } from '../data.js'

function isBudapestMidnight() {
  const parts = new Intl.DateTimeFormat('hu-HU', {
    timeZone: 'Europe/Budapest',
    hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: false,
  }).formatToParts(new Date())
  const get = (t) => parseInt(parts.find(p => p.type === t)?.value ?? '0')
  return get('hour') === 0 && get('minute') === 0 && get('second') < 5
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
    <span
      className={flip ? 'flip-digit flipping' : 'flip-digit'}
      style={{
        display: 'inline-block',
        minWidth: char === ' ' ? 4 : char === '\u00a0' ? 4 : undefined,
      }}
    >
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
  const [count, setCount] = useState(0)
  const countRef = useRef(0)

  useEffect(() => {
    let timeoutId

    const tick = () => {
      if (isBudapestMidnight()) {
        countRef.current = 0
        setCount(0)
      } else {
        const inc = Math.random() < 0.5 ? 1 : 2
        countRef.current += inc
        setCount(countRef.current)
      }
      const nextDelay = 60_000 + Math.random() * 7_140_000
      timeoutId = setTimeout(tick, nextDelay)
    }

    timeoutId = setTimeout(tick, 60_000 + Math.random() * 7_140_000)
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
      <div className="ban-stat-label"><span>NAPJA NINCS BAN</span><span className="ban-dot"></span></div>
      <div className="ban-stat-value">{d.toLocaleString('hu')}</div>
      <div className="ban-stat-sub">1 game ban</div>
      <div className="ban-stat-sub" style={{ marginTop: 6, fontSize: 9, lineHeight: 1.6 }}>
        🚽 Random befosások Magyarországon:<br />
        <FlipNumber value={count} />
      </div>
    </div>
  )
}
