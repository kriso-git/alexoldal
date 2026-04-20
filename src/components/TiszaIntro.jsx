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
      const playPromise = audio.play()
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // autoplay blocked — try again on first user gesture
          const retry = () => { audio.play().catch(() => {}); document.removeEventListener('click', retry); document.removeEventListener('keydown', retry) }
          document.addEventListener('click', retry, { once: true })
          document.addEventListener('keydown', retry, { once: true })
        })
      }
    }
    timerRef.current = setTimeout(finish, 5000)
    return () => {
      clearTimeout(timerRef.current)
      try { audioRef.current?.pause() } catch {}
    }
  }, [])

  return (
    <div
      className={`tisza-overlay${fading ? ' fading' : ''}`}
      onClick={finish}
    >
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
        <div className="tisza-hint">[ kattints a kihagyáshoz ]</div>
      </div>
      <div className="tisza-scanlines" />
      <audio ref={audioRef} src="/assets/tiszamegnyerte.mp3" preload="auto" />
    </div>
  )
}
