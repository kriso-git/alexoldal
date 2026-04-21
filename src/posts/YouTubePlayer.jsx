import { useEffect, useRef, useState, useCallback } from 'react'
import { ensureYTScript, onYTReady, extractVideoId, fmtTime } from '../utils/ytPlayer.js'

const Q_LABELS = {
  hd1080: '1080p', hd720: '720p',
  large: '480p', medium: '360p', small: '240p', tiny: '144p', auto: 'Auto',
}
const STATIC_QUALITIES = ['hd1080', 'hd720', 'large', 'medium', 'small', 'tiny']

function QualityDropdown({ quality, qualities, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="yt-quality-wrap" ref={ref}>
      <button
        type="button"
        className={`yt-quality-btn${open ? ' open' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Videóminőség"
      >
        <span>{Q_LABELS[quality] || quality}</span>
        <svg className="yt-quality-chevron" width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1.5 2.5L4 5.5L6.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className={`yt-quality-menu${open ? ' open' : ''}`}>
        {qualities.map(q => (
          <button
            key={q}
            type="button"
            className={`yt-quality-option${q === quality ? ' active' : ''}`}
            onClick={() => { onChange(q); setOpen(false) }}
          >
            {Q_LABELS[q] || q}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function YouTubePlayer({ src }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const timerRef = useRef(null)
  const [volume, setVolume] = useState(80)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const [quality, setQuality] = useState('auto')
  const [availableQualities, setAvailableQualities] = useState([])

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
            const apiQuals = e.target.getAvailableQualityLevels?.() || []
            const filtered = apiQuals.filter(q => Q_LABELS[q])
            setAvailableQualities(filtered.length > 0 ? filtered : STATIC_QUALITIES)
            e.target.setPlaybackQuality?.('hd1080')
            setQuality('hd1080')
            setReady(true)
          },
          onStateChange: (e) => {
            const YT = window.YT.PlayerState
            if (e.data === YT.PLAYING) {
              setPlaying(true)
              setQuality(playerRef.current?.getPlaybackQuality?.() || 'auto')
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
          onPlaybackQualityChange: (e) => {
            setQuality(e.data || 'auto')
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
      setAvailableQualities([])
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

  const handleQualityChange = (q) => {
    playerRef.current?.setPlaybackQuality?.(q)
    setQuality(q)
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
        {ready && (
          <QualityDropdown
            quality={quality}
            qualities={availableQualities}
            onChange={handleQualityChange}
          />
        )}
      </div>
    </div>
  )
}
