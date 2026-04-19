import { useEffect, useRef, useState } from 'react'
import { fmtTime } from '../utils/ytPlayer.js'

export default function AudioPlayer({ src, label }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(80)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume / 100
    const onTime = () => setCurrentTime(audio.currentTime)
    const onDur = () => setDuration(isFinite(audio.duration) ? audio.duration : 0)
    const onEnd = () => { setPlaying(false); setCurrentTime(0) }
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('durationchange', onDur)
    audio.addEventListener('loadedmetadata', onDur)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('durationchange', onDur)
      audio.removeEventListener('loadedmetadata', onDur)
      audio.removeEventListener('ended', onEnd)
    }
  }, [src])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) { audio.pause(); setPlaying(false) }
    else { audio.play().catch(() => {}); setPlaying(true) }
  }

  const handleSeek = (e) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const t = ratio * duration
    if (audioRef.current) audioRef.current.currentTime = t
    setCurrentTime(t)
  }

  const handleVolume = (e) => {
    const v = parseInt(e.target.value)
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v / 100
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="audio-player-wrap">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button className="audio-play-btn" onClick={toggle} title={playing ? 'Pause' : 'Play'}>
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="audio-body">
        <div className="audio-label">{label || 'AUDIO'}</div>
        <div className="audio-progress" onClick={handleSeek} title="Kattints a tekeréshez">
          <div className="audio-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="audio-times">
          <span>{fmtTime(currentTime)}</span>
          <span>{fmtTime(duration)}</span>
        </div>
      </div>
      <div className="audio-vol-wrap">
        <span className="audio-vol-icon">🔊</span>
        <input
          type="range" min="0" max="100" value={volume}
          onChange={handleVolume}
          className="audio-vol-slider"
          title={`Hangerő: ${volume}%`}
        />
      </div>
    </div>
  )
}
