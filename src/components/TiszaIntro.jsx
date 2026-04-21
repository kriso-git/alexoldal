import { useRef, useState } from 'react'

export default function TiszaIntro() {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)

  const handleClick = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio('/assets/tiszamegnyerte.mp3')
      audioRef.current.volume = 0.75
      audioRef.current.onended = () => setPlaying(false)
    }
    const a = audioRef.current
    if (playing) {
      a.pause()
      a.currentTime = 0
      setPlaying(false)
    } else {
      a.play().then(() => setPlaying(true)).catch(() => {})
    }
  }

  return (
    <button
      className={`tisza-egg${playing ? ' tisza-egg-playing' : ''}`}
      onClick={handleClick}
      title="🇭🇺"
      aria-label="Easter egg"
    >
      <img src="/assets/tisza-logo.png" alt="" className="tisza-egg-img" />
    </button>
  )
}
