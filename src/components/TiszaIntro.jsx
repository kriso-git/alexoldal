import { useEffect, useRef, useState } from 'react'

export default function TiszaIntro({ onDone }) {
  const [fading, setFading] = useState(false)
  const audioRef = useRef(null)
  const timerRef = useRef(null)
  const doneRef = useRef(false)

  const finish = () => {
    if (doneRef.current) return
    doneRef.current = true
    clearTimeout(timerRef.current)
    try { audioRef.current?.pause() } catch {}
    setFading(true)
    setTimeout(() => onDone?.(), 600)
  }

  useEffect(() => {
    const audio = new Audio('/assets/tiszamegnyerte.mp3')
    audio.volume = 0.8
    audioRef.current = audio
    audio.play().catch(() => {})

    timerRef.current = setTimeout(finish, 5000)
    return () => {
      clearTimeout(timerRef.current)
      try { audio.pause() } catch {}
    }
  }, [])

  return (
    <div
      className={`tisza-overlay${fading ? ' fading' : ''}`}
      onClick={finish}
    >
      <div className="tisza-inner">
        <div className="tisza-logo-wrap">
          <img
            src="/assets/tisza-logo.png"
            alt="TISZA"
            className="tisza-logo-img"
          />
        </div>
        <div className="tisza-label">TISZA</div>
        <div className="tisza-hint">[ kattints a kihagyáshoz ]</div>
      </div>
      <div className="tisza-scanlines" />
    </div>
  )
}
