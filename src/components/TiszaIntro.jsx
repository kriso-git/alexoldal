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
    const audio = audioRef.current
    if (audio) {
      audio.volume = 0.8
      audio.play().catch(() => {
        const tryPlay = () => { audio.play().catch(() => {}) }
        document.addEventListener('click', tryPlay, { once: true })
        document.addEventListener('keydown', tryPlay, { once: true })
      })
    }
    timerRef.current = setTimeout(finish, 3000)
    return () => {
      clearTimeout(timerRef.current)
      try { audioRef.current?.pause() } catch {}
    }
  }, [])

  return (
    <div className={`tisza-overlay${fading ? ' fading' : ''}`}>
      <div className="tisza-inner">
        <div className="tisza-logo-wrap">
          <img className="tisza-logo-img" src="/assets/tisza-logo.png" alt="TISZA" />
        </div>
      </div>
      <div className="tisza-scanlines" />
      <audio ref={audioRef} src="/assets/tiszamegnyerte.mp3" preload="auto" />
    </div>
  )
}
