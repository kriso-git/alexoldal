import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ensureYTScript, onYTReady, extractVideoId, fmtTime } from '../utils/ytPlayer.js'

const Q_LABELS = {
  hd1080: '1080p', hd720: '720p',
  large: '480p', medium: '360p', small: '240p', tiny: '144p',
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

function PlayerCore({ src, initialTime = 0, isModal, onExpand, onClose, onTimeUpdate }) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const timerRef = useRef(null)
  const [volume, setVolume] = useState(80)
  const [muted, setMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(initialTime)
  const [duration, setDuration] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const [quality, setQuality] = useState('hd1080')
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
          start: Math.floor(initialTime),
        },
        events: {
          onReady: (e) => {
            if (destroyed) return
            e.target.setVolume(80)
            setDuration(e.target.getDuration() || 0)
            const apiQuals = e.target.getAvailableQualityLevels?.() || []
            const filtered = apiQuals.filter(q => Q_LABELS[q])
            setAvailableQualities(filtered.length > 0 ? filtered : STATIC_QUALITIES)
            if (initialTime > 0) {
              e.target.seekTo(initialTime, true)
              e.target.playVideo?.()
            }
            setReady(true)
          },
          onStateChange: (e) => {
            const YT = window.YT.PlayerState
            if (e.data === YT.PLAYING) {
              setPlaying(true)
              setQuality(playerRef.current?.getPlaybackQuality?.() || 'hd1080')
              clearInterval(timerRef.current)
              timerRef.current = setInterval(() => {
                const p = playerRef.current
                if (!p) return
                const t = p.getCurrentTime?.() || 0
                setCurrentTime(t)
                onTimeUpdate?.(t)
                if (!duration) setDuration(p.getDuration?.() || 0)
              }, 500)
            } else {
              setPlaying(e.data === window.YT.PlayerState.BUFFERING)
              clearInterval(timerRef.current)
              if (e.data === window.YT.PlayerState.PAUSED) {
                const t = playerRef.current?.getCurrentTime?.() || 0
                setCurrentTime(t)
                onTimeUpdate?.(t)
              }
            }
          },
          onPlaybackQualityChange: (e) => setQuality(e.data || 'hd1080'),
        },
      })
    })

    return () => {
      destroyed = true
      clearInterval(timerRef.current)
      try { playerRef.current?.destroy?.() } catch {}
      playerRef.current = null
      setReady(false); setPlaying(false); setAvailableQualities([])
    }
  }, [src])

  const togglePlay = useCallback(() => {
    const p = playerRef.current; if (!p) return
    if (playing) p.pauseVideo?.(); else p.playVideo?.()
  }, [playing])

  const toggleMute = useCallback(() => {
    const p = playerRef.current; if (!p) return
    if (muted) { p.unMute?.(); p.setVolume?.(volume); setMuted(false) }
    else { p.mute?.(); setMuted(true) }
  }, [muted, volume])

  const handleVolumeChange = (e) => {
    const v = parseInt(e.target.value)
    setVolume(v)
    playerRef.current?.setVolume?.(v)
    if (muted && v > 0) { playerRef.current?.unMute?.(); setMuted(false) }
  }

  const handleSeek = (e) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const t = ratio * duration
    playerRef.current?.seekTo?.(t, true)
    setCurrentTime(t); onTimeUpdate?.(t)
  }

  // loadVideoById forces a full reload at the requested quality — most reliable approach
  const handleQualityChange = useCallback((q) => {
    const p = playerRef.current; if (!p) return
    const t = p.getCurrentTime?.() || 0
    const vid = extractVideoId(src)
    p.loadVideoById({ videoId: vid, startSeconds: t, suggestedQuality: q })
    setQuality(q)
  }, [src])

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className={`yt-player-wrap${isModal ? ' yt-modal-player' : ''}`}>
      <div className="yt-video-area">
        <div ref={containerRef} className="yt-iframe-slot" />
        {ready && (
          <button className="yt-play-overlay" onClick={togglePlay} title={playing ? 'Szünet' : 'Lejátszás'}>
            {!playing && <span className="yt-play-overlay-icon">▶</span>}
          </button>
        )}
        <button
          className="yt-expand-btn"
          onClick={isModal ? onClose : onExpand}
          title={isModal ? 'Bezárás (Esc)' : 'Nagyítás'}
        >
          {isModal ? '✕' : '⛶'}
        </button>
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
        <button className="yt-mute-btn" onClick={toggleMute} title={muted ? 'Hang visszakapcsol.' : 'Némítás'}>
          {muted ? '🔇' : '🔊'}
        </button>
        <input
          type="range" min="0" max="100"
          value={muted ? 0 : volume}
          onChange={handleVolumeChange}
          className="yt-volume-slider"
          title={`Hangerő: ${volume}%`}
        />
        {ready && (
          <QualityDropdown quality={quality} qualities={availableQualities} onChange={handleQualityChange} />
        )}
      </div>
    </div>
  )
}

export default function YouTubePlayer({ src }) {
  const [expanded, setExpanded] = useState(false)
  const timeRef = useRef(0)
  const handleTimeUpdate = useCallback((t) => { timeRef.current = t }, [])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e) => { if (e.key === 'Escape') setExpanded(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [expanded])

  return (
    <>
      {!expanded && (
        <PlayerCore
          src={src}
          initialTime={timeRef.current}
          onExpand={() => setExpanded(true)}
          onTimeUpdate={handleTimeUpdate}
        />
      )}
      {expanded && createPortal(
        <div
          className="yt-modal-overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setExpanded(false) }}
        >
          <div className="yt-modal-container">
            <PlayerCore
              src={src}
              initialTime={timeRef.current}
              isModal
              onClose={() => setExpanded(false)}
              onTimeUpdate={handleTimeUpdate}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
