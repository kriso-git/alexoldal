import { useState, useEffect, useRef } from 'react'
import { CATEGORIES } from '../data.js'
import BanCounter from './BanCounter.jsx'

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

export default function Sidebar({ session, activeCategory, onCategory, counts, onOpenAuth, onLogout, onSuperadmin }) {
  const isAdmin = session?.role === 'admin' || session?.role === 'superadmin'
  const isSuperadmin = session?.role === 'superadmin'
  const isLive = useTwitchLive('f3xykeewt')

  return (
    <aside className="sidebar">
      <div className="brand">
        <DraggableCube />
        <div className="cube-name">Alex &ldquo;F3xykee&rdquo; Halász</div>
        <BanCounter />
        <div className="socials" style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
          <a href="https://steamcommunity.com/id/F3xykee/" target="_blank" rel="noopener noreferrer"
            className="social-btn" style={{ display: 'block', textAlign: 'center', width: '100%' }}>
            STEAM
          </a>
          <a href="https://www.twitch.tv/f3xykeewt" target="_blank" rel="noopener noreferrer"
            className={`social-btn twitch-btn${isLive ? ' live' : ''}`}
            style={{
              display: 'block', textAlign: 'center', width: '100%',
              ...(isLive ? { color: '#bf94ff', borderColor: '#bf94ff', boxShadow: '0 0 14px rgba(191,148,255,0.45)' } : {}),
            }}>
            {isLive ? '● MOST MEGY · TWITCH' : 'TWITCH'}
          </a>
          <a href="https://discord.gg/TB2nVbY8h8" target="_blank" rel="noopener noreferrer"
            className="social-btn" style={{ display: 'block', textAlign: 'center', width: '100%' }}>
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
