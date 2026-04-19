import { useEffect, useRef, useState } from 'react'
import { ensureYTScript, onYTReady, extractVideoId, fmtTime } from '../utils/ytPlayer.js'

export default function YouTubePlayer({ src }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const timerRef = useRef(null)
  const [volume, setVolume] = useState(80)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    ensureYTScript()
    const videoId = extractVideoId(src)
    if (!videoId) return
    let destroyed = false

    onYTReady(() => {
      if (destroyed || !containerRef.current) return
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: (e) => { e.target.setVolume(volume) },
          onStateChange: (e) => {
            if (e.data === window.YT.PlayerState.PLAYING) {
              timerRef.current = setInterval(() => {
                const p = playerRef.current
                if (!p) return
                setCurrentTime(p.getCurrentTime?.() || 0)
                if (!duration) setDuration(p.getDuration?.() || 0)
              }, 500)
            } else {
              clearInterval(timerRef.current)
              if (e.data !== window.YT.PlayerState.PAUSED) return
              const p = playerRef.current
              if (p) setCurrentTime(p.getCurrentTime?.() || 0)
            }
          },
        },
      })
    })

    return () => {
      destroyed = true
      clearInterval(timerRef.current)
      try { playerRef.current?.destroy?.() } catch {}
      playerRef.current = null
    }
  }, [src])

  const handleVolumeChange = (e) => {
    const v = parseInt(e.target.value)
    setVolume(v)
    playerRef.current?.setVolume?.(v)
  }

  const handleSeek = (e) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const t = ratio * duration
    playerRef.current?.seekTo?.(t, true)
    setCurrentTime(t)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="yt-player-wrap">
      <div ref={containerRef} className="yt-iframe-slot" />
      <div className="yt-controls">
        <span className="yt-time">{fmtTime(currentTime)}</span>
        <div className="yt-progress" onClick={handleSeek} title="Kattints a tekeréshez">
          <div className="yt-progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="yt-time">{fmtTime(duration)}</span>
        <span className="yt-vol-icon">🔊</span>
        <input
          type="range" min="0" max="100" value={volume}
          onChange={handleVolumeChange}
          className="yt-volume-slider"
          title={`Hangerő: ${volume}%`}
        />
      </div>
    </div>
  )
}
