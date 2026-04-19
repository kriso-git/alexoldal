import { useEffect, useRef, useState, useCallback } from 'react'
import { ensureYTScript, onYTReady, extractVideoId, fmtTime } from '../utils/ytPlayer.js'

export default function YouTubePlayer({ src }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const timerRef = useRef(null)
  const [volume, setVolume] = useState(80)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ensureYTScript()
    const videoId = extractVideoId(src)
    if (!videoId) return
    let destroyed = false

    onYTReady(() => {
      if (destroyed || !containerRef.current) return
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          rel: 0, modestbranding: 1, controls: 0,
          iv_load_policy: 3, disablekb: 1, fs: 0, showinfo: 0,
          playsinline: 1,
        },
        events: {
          onReady: (e) => {
            if (destroyed) return
            e.target.setVolume(volume)
            setDuration(e.target.getDuration() || 0)
            setReady(true)
          },
          onStateChange: (e) => {
            const YT = window.YT.PlayerState
            if (e.data === YT.PLAYING) {
              setPlaying(true)
              timerRef.current = setInterval(() => {
                const p = playerRef.current
                if (!p) return
                setCurrentTime(p.getCurrentTime?.() || 0)
                if (!duration) setDuration(p.getDuration?.() || 0)
              }, 500)
            } else {
              setPlaying(e.data === window.YT.PlayerState.BUFFERING ? true : false)
              clearInterval(timerRef.current)
              if (e.data === window.YT.PlayerState.PAUSED) {
                setCurrentTime(playerRef.current?.getCurrentTime?.() || 0)
              }
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
      setReady(false)
      setPlaying(false)
      setCurrentTime(0)
    }
  }, [src])

  const togglePlay = useCallback(() => {
    const p = playerRef.current
    if (!p) return
    if (playing) p.pauseVideo?.()
    else p.playVideo?.()
  }, [playing])

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
      <div className="yt-video-area">
        <div ref={containerRef} className="yt-iframe-slot" />
        {ready && (
          <button className="yt-play-overlay" onClick={togglePlay} title={playing ? 'Szünet' : 'Lejátszás'}>
            {!playing && (
              <span className="yt-play-overlay-icon">▶</span>
            )}
          </button>
        )}
      </div>
      <div className="yt-controls">
        <button className="yt-play-btn" onClick={togglePlay} disabled={!ready}>
          {playing ? '❚❚' : '▶'}
        </button>
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
