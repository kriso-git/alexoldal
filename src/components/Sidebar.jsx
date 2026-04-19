import { useState, useEffect } from 'react'
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

export default function Sidebar({ session, activeCategory, onCategory, counts, onOpenAuth, onLogout, onSuperadmin }) {
  const isAdmin = session?.role === 'admin' || session?.role === 'superadmin'
  const isSuperadmin = session?.role === 'superadmin'
  const isLive = useTwitchLive('f3xykeewt')

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="logo-3d">
          <div className="logo-3d-cube">
            <div className="face face-front">F3xykee</div>
            <div className="face face-back">F3xykee</div>
            <div className="face face-right">F3xykee</div>
            <div className="face face-left">F3xykee</div>
            <div className="face face-top"></div>
            <div className="face face-bottom"></div>
          </div>
        </div>
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
