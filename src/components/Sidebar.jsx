import { useState, useEffect, useRef } from 'react'
import { CATEGORIES } from '../data.js'
import BanCounter from './BanCounter.jsx'

function getLevelInfo(xp = 0) {
  let level = 1
  while (xp >= level * (level + 1) / 2 * 100) level++
  const prev = (level - 1) * level / 2 * 100
  const next = level * (level + 1) / 2 * 100
  return {
    level,
    percent: Math.min(100, Math.floor((xp - prev) / (next - prev) * 100)),
    next: next - prev,
    progress: xp - prev,
  }
}

function useTwitchLive(channel) {
  const [isLive, setIsLive] = useState(false)
  useEffect(() => {
    const check = async () => {
      try {
        const r = await fetch(`https://decapi.me/twitch/uptime/${channel}`)
        const text = await r.text()
        setIsLive(!text.toLowerCase().includes('offline') && !text.toLowerCase().includes('error') && text.trim().length > 0)
      } catch { setIsLive(false) }
    }
    check()
    const id = setInterval(check, 60000)
    return () => clearInterval(id)
  }, [channel])
  return isLive
}

function DraggableCube() {
  const cubeRef = useRef(null)
  const s = useRef({
    rotX: 15, rotY: 0,
    xSpeed: 0.08,
    isDragging: false,
    dragStart: null,
    raf: null,
    lastTime: null,
  })

  useEffect(() => {
    const el = cubeRef.current
    if (!el) return
    const st = s.current

    const frame = (time) => {
      if (!st.isDragging) {
        const dt = st.lastTime ? Math.min(time - st.lastTime, 50) : 16
        st.lastTime = time
        const scale = dt / 16
        st.rotY += 0.25 * scale
        st.rotX += st.xSpeed * scale
        if (st.rotX > 38)  { st.rotX = 38;  st.xSpeed = -Math.abs(st.xSpeed) }
        if (st.rotX < -38) { st.rotX = -38; st.xSpeed =  Math.abs(st.xSpeed) }
      }
      el.style.transform = `rotateX(${st.rotX}deg) rotateY(${st.rotY}deg)`
      st.raf = requestAnimationFrame(frame)
    }
    st.raf = requestAnimationFrame(frame)

    const getXY = (e) => e.touches
      ? [e.touches[0].clientX, e.touches[0].clientY]
      : [e.clientX, e.clientY]

    const onDown = (e) => {
      const [cx, cy] = getXY(e)
      st.isDragging = true
      st.lastTime = null
      st.dragStart = { x: cx, y: cy, rotX: st.rotX, rotY: st.rotY }
      el.style.cursor = 'grabbing'
      e.preventDefault()
    }

    const onMove = (e) => {
      if (!st.isDragging || !st.dragStart) return
      const [cx, cy] = getXY(e)
      st.rotY = st.dragStart.rotY + (cx - st.dragStart.x) * 0.8
      st.rotX = st.dragStart.rotX - (cy - st.dragStart.y) * 0.8
      st.rotX = Math.max(-85, Math.min(85, st.rotX))
      e.preventDefault()
    }

    const onUp = () => {
      if (!st.isDragging) return
      st.isDragging = false
      st.lastTime = null
      el.style.cursor = 'grab'
    }

    el.addEventListener('mousedown', onDown)
    el.addEventListener('touchstart', onDown, { passive: false })
    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchend', onUp)

    return () => {
      cancelAnimationFrame(st.raf)
      el.removeEventListener('mousedown', onDown)
      el.removeEventListener('touchstart', onDown)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  return (
    <div className="logo-3d">
      <div className="logo-3d-cube" ref={cubeRef} style={{ cursor: 'grab' }}>
        <div className="face face-front"><img src="/assets/face1.png" alt="" /></div>
        <div className="face face-back"><img src="/assets/face2.png" alt="" /></div>
        <div className="face face-right"><img src="/assets/face3.png" alt="" /></div>
        <div className="face face-left"><img src="/assets/face4.png" alt="" /></div>
        <div className="face face-top"><img src="/assets/face5.png" alt="" /></div>
        <div className="face face-bottom"><img src="/assets/face6.png" alt="" /></div>
      </div>
    </div>
  )
}

export default function Sidebar({ session, activeCategory, onCategory, counts, onOpenAuth, onLogout, onSuperadmin, onProfile, userPosts }) {
  const isAdmin = session?.role === 'admin' || session?.role === 'superadmin'
  const isSuperadmin = session?.role === 'superadmin'
  const isLive = useTwitchLive('f3xykeewt')
  const [submittedOpen, setSubmittedOpen] = useState(false)

  const lvInfo = getLevelInfo(session?.xp || 0)
  const ownPosts = userPosts?.filter(p => p.author === session?.username) || []

  return (
    <aside className="sidebar">
      <div className="brand">
        <DraggableCube />
        <div className="cube-name">Alex &ldquo;F3xykee&rdquo; Halász</div>
        <BanCounter />
        <div className="socials" style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          <a href="https://www.instagram.com/hlsz.alex1337/" target="_blank" rel="noopener noreferrer"
            className="social-btn instagram-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
            </svg>
            INSTAGRAM
          </a>
          <a href="https://steamcommunity.com/id/F3xykee/" target="_blank" rel="noopener noreferrer"
            className="social-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.029 4.524 4.524s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.606 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.455 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.252 0-2.265-1.014-2.265-2.265z"/>
            </svg>
            STEAM
          </a>
          <a href="https://www.twitch.tv/f3xykeewt" target="_blank" rel="noopener noreferrer"
            className={`social-btn twitch-btn${isLive ? ' live' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%',
              ...(isLive ? { color: '#bf94ff', borderColor: '#bf94ff', boxShadow: '0 0 14px rgba(191,148,255,0.45)' } : {}),
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
            </svg>
            {isLive ? '● MOST MEGY · TWITCH' : 'TWITCH'}
          </a>
          <a href="https://discord.gg/TB2nVbY8h8" target="_blank" rel="noopener noreferrer"
            className="social-btn" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057v.001a.082.082 0 00.031.056 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
            </svg>
            DISCORD
          </a>
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-title">kategóriák</div>
        <div className="category-list">
          {CATEGORIES.map(c => (
            <button
              key={c.id}
              className={`cat-btn${activeCategory === c.id ? ' active' : ''}`}
              onClick={() => onCategory(c.id)}
            >
              <span>{activeCategory === c.id ? '▸ ' : ''}{c.label}</span>
              <span className="cat-count">{counts[c.id] ?? 0}</span>
            </button>
          ))}
        </div>

        {session && (
          <>
            <div className="user-tab" onClick={() => onProfile?.(session.username)} role="button" tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && onProfile?.(session.username)}>
              <div className="user-tab-row">
                {session.avatar_url
                  ? <img src={session.avatar_url} alt={session.username} className="user-avatar" />
                  : <div className="user-avatar-placeholder">👤</div>
                }
                <div className="user-tab-info">
                  <div className="user-tab-name">@{session.username}</div>
                  <div className="user-tab-level">LV.{lvInfo.level} · {session.xp || 0} XP</div>
                </div>
              </div>
              <div className="xp-bar-wrap">
                <div className="xp-bar-label">
                  <span>XP</span>
                  <span>{lvInfo.progress}/{lvInfo.next}</span>
                </div>
                <div className="xp-bar">
                  <div className="xp-bar-fill" style={{ width: `${lvInfo.percent}%` }} />
                </div>
              </div>
            </div>

            {ownPosts.length > 0 && (
              <div className="submitted-section">
                <button className="submitted-toggle" onClick={() => setSubmittedOpen(o => !o)}>
                  <span>beküldött ({ownPosts.length})</span>
                  <span>{submittedOpen ? '▴' : '▾'}</span>
                </button>
                <div className="submitted-list" style={{ maxHeight: submittedOpen ? ownPosts.length * 28 + 'px' : 0 }}>
                  {ownPosts.slice(0, 10).map(p => (
                    <button key={p.id} className="submitted-item" onClick={() => {
                      const el = document.getElementById(p.id) || document.querySelector(`[data-id="${p.id}"]`)
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}>
                      {p.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="session-box">
        {session ? (
          <>
            <div className={`session-row${isAdmin ? ' admin-row' : ''}`}>
              <span>user</span><strong>{session.username}</strong>
            </div>
            <div className="session-row">
              <span>szerepkör</span>
              <strong style={{ color: isSuperadmin ? 'var(--magenta)' : isAdmin ? 'var(--accent)' : undefined }}>
                {isSuperadmin ? 'SUPERADMIN' : isAdmin ? 'ADMIN' : 'user'}
              </strong>
            </div>
            <div className="session-actions">
              {isSuperadmin && onSuperadmin && (
                <button className="btn btn-admin" onClick={onSuperadmin}>⚡ Panel</button>
              )}
              <button className="btn btn-danger" onClick={onLogout}>Kilépés</button>
            </div>
          </>
        ) : (
          <>
            <div className="session-row"><span>status</span><strong>guest</strong></div>
            <div className="session-actions">
              <button className="btn" onClick={() => onOpenAuth('login')}>Belépés</button>
              <button className="btn btn-ghost" onClick={() => onOpenAuth('register')}>Reg.</button>
            </div>
            <button
              className="btn btn-ghost"
              style={{ marginTop: 6, fontSize: 10, letterSpacing: '0.12em', opacity: 0.6, width: '100%' }}
              onClick={() => onOpenAuth('admin')}
            >
              Admin belépés
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
