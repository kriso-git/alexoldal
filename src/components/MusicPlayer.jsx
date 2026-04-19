import { useState, useEffect, useRef } from 'react'
import { songsApi } from '../api.js'

export default function MusicPlayer() {
  const [songs, setSongs] = useState([])
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    songsApi.list().then(setSongs).catch(() => {})
  }, [])

  const track = songs[idx] || null

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !track) return
    audio.src = track.url
    audio.load()
    if (playing) audio.play().catch(() => setPlaying(false))
  }, [track?.url])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) audio.play().catch(() => setPlaying(false))
    else audio.pause()
  }, [playing])

  const next = () => setIdx(i => songs.length ? (i + 1) % songs.length : 0)
  const prev = () => setIdx(i => songs.length ? (i - 1 + songs.length) % songs.length : 0)

  if (!songs.length) return null

  return (
    <div className={`music-player${playing ? '' : ' paused'}`}>
      <audio ref={audioRef} onEnded={next} preload="none" />
      <button className="music-toggle" onClick={prev} title="Előző">«</button>
      <button className="music-toggle" onClick={() => setPlaying(p => !p)} title={playing ? 'Pause' : 'Play'}>
        {playing ? '❚❚' : '▶'}
      </button>
      <div className="music-info">
        <div className="music-label">NOW PLAYING</div>
        <div className="music-track">{track?.name || '—'}</div>
      </div>
      <div className="music-eq" aria-hidden="true">
        <span></span><span></span><span></span><span></span>
      </div>
      <button className="music-toggle" onClick={next} title="Következő">»</button>
    </div>
  )
}
