import { useState, useEffect } from 'react'

const LINES = [
  '> F3XYKEE TERMINAL · BLOG INTERFACE V0.1',
  '> INITIALIZING SYSTEM...',
  '> LOADING DESIGN TOKENS............... OK',
  '> MOUNTING DATA STREAM PANELS......... OK',
  '> SYNCING POST FEED................... OK',
  '> CHECKING AUTH SESSION............... OK',
  '> SCANNING NETWORK NODES.............. OK',
  '> CALIBRATING HUD OVERLAY............. OK',
  '> GRID OVERLAY ACTIVE................. OK',
  '> ALL SYSTEMS NOMINAL · UPLINK STABLE',
  '',
  '> "I was meant to be new... I was meant to be beautiful."',
]

export default function BootScreen({ onDone }) {
  const [visible, setVisible] = useState([])
  const [fading, setFading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let i = 0
    const id = setInterval(() => {
      setVisible(v => [...v, LINES[i]])
      i++
      if (i >= LINES.length) clearInterval(id)
    }, 90)
    return () => clearInterval(id)
  }, [])

  const dismiss = () => {
    if (fading || done) return
    setFading(true)
    setTimeout(() => {
      setDone(true)
      onDone?.()
    }, 500)
  }

  if (done) return null

  return (
    <div className={'boot-screen' + (fading ? ' fading' : '')} onClick={dismiss}>
      <div className="boot-lines">
        {visible.map((line, i) => (
          <div key={i} className="boot-line"
            style={{ animationDelay: '0ms', color: line.startsWith('> "') ? 'var(--ink-1)' : line.includes('OK') ? 'var(--accent)' : undefined }}>
            {line || ' '}
          </div>
        ))}
      </div>
      {visible.length >= LINES.length && (
        <div className="boot-click">KATTINTS BÁRHOVA · CLICK ANYWHERE TO ENTER</div>
      )}
      <img
        src="https://media1.tenor.com/m/9jgh1v5I1_cAAAAd/courage-the-cowardly-dog-dancing.gif"
        alt="Courage"
        className="boot-courage"
        onError={e => { e.target.style.display = 'none' }}
      />
    </div>
  )
}
