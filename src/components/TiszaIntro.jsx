import { useEffect, useRef, useState } from 'react'

export default function TiszaIntro({ onDone }) {
  const [fading, setFading] = useState(false)
  const timerRef = useRef(null)
  const doneRef = useRef(false)

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    clearTimeout(timerRef.current)
    setFading(true)
    setTimeout(() => onDone?.(), 600)
  }

  useEffect(() => {
    const audio = new Audio('/assets/tiszamegnyerte.mp3')
    audio.volume = 0.8
    audio.play().catch(() => {
      const tryPlay = () => { audio.play().catch(() => {}) }
      document.addEventListener('click', tryPlay, { once: true })
      document.addEventListener('keydown', tryPlay, { once: true })
      document.addEventListener('touchstart', tryPlay, { once: true })
    })

    timerRef.current = setTimeout(finish, 3000)
    return () => { clearTimeout(timerRef.current) }
  }, [])

  return (
    <div className={`tisza-overlay${fading ? ' fading' : ''}`}>
      <div className="tisza-inner">
        <div className="tisza-scene">
          <div className="tisza-box">
            <div className="tisza-face tisza-face-front">
              <img src="/assets/tisza-logo.png" alt="TISZA" />
            </div>
            <div className="tisza-face tisza-face-back">
              <img src="/assets/tisza-logo.png" alt="TISZA" style={{ transform: 'scaleX(-1)' }} />
            </div>
            <div className="tisza-face tisza-face-right" />
            <div className="tisza-face tisza-face-left" />
            <div className="tisza-face tisza-face-top" />
            <div className="tisza-face tisza-face-bottom" />
          </div>
        </div>
      </div>
      <div className="tisza-scanlines" />
    </div>
  )
}
