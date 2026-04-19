import { useState, useEffect, useRef } from 'react'
import { songsApi } from '../api.js'
import { fmtTime } from '../utils/ytPlayer.js'

export default function MusicPlayer() {
  const [songs, setSongs] = useState([])
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(70)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    songsApi.list().then(setSongs).catch(() => {})
  }, [])

  const track = songs[idx] || null

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !track) return
    audio.volume = volume / 100
    audio.src = track.url
    audio.load()
    setCurrentTime(0); setDuration(0)
    if (playing) audio.play().catch(() => setPlaying(false))
  }, [track?.url])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume / 100
  }, [volume])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) audio.play().catch(() => setPlaying(false))
    else audio.pause()
  }, [playing])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrentTime(audio.currentTime)
    const onDur = () => setDuration(isFinite(audio.duration) ? audio.duration : 0)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('durationchange', onDur)
    audio.addEventListener('loadedmetadata', onDur)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('durationchange', onDur)
      audio.removeEventListener('loadedmetadata', onDur)
    }
  }, [])

  const next = () => setIdx(i => songs.length ? (i + 1) % songs.length : 0)
  const prev = () => setIdx(i => songs.length ? (i - 1 + songs.length) % songs.length : 0)

  const handleSeek = (e) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const t = ratio * duration
    if (audioRef.current) { audioRef.current.currentTime = t; setCurrentTime(t) }
  }

  if (!songs.length) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={`music-player${playing ? '' : ' paused'}${collapsed ? ' collapsed' : ''}`}>
      <audio ref={audioRef} onEnded={next} preload="none" />

      <div className="music-top">
        <button className="music-toggle" onClick={prev} title="Előző">«</button>
        <button className="music-toggle play-btn" onClick={() => setPlaying(p => !p)} title={playing ? 'Pause' : 'Play'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="music-info">
          <div className="music-label">NOW PLAYING</div>
          <div className="music-track">{track?.name || '—'}</div>
        </div>
        <div className="music-eq" aria-hidden="true">
          <span /><span /><span /><span />
        </div>
        <button className="music-toggle" onClick={next} title="Következő">»</button>
        <button
          className="music-toggle"
          onClick={() => setCollapsed(v => !v)}
          title={collapsed ? 'Kibont' : 'Összecsuks'}
          style={{ fontSize: 9, opacity: 0.6 }}
        >
          {collapsed ? '▲' : '▼'}
        </button>
      </div>

      {!collapsed && (
        <div className="music-bottom">
          <div className="music-progress" onClick={handleSeek} title="Kattints a tekeréshez">
            <div className="music-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="music-time-row">
            <span>{fmtTime(currentTime)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
          <div className="music-vol-row">
            <span className="music-vol-icon">🔊</span>
            <input
              type="range" min="0" max="100" value={volume}
              onChange={e => setVolume(parseInt(e.target.value))}
              className="music-vol-slider"
              title={`Hangerő: ${volume}%`}
            />
          </div>
        </div>
      )}
    </div>
  )
}
