import { useState, useEffect } from 'react'

export default function AuthModal({ open, tab: initialTab, onClose, onLogin, onRegister }) {
  const [tab, setTab] = useState(initialTab || 'login')
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) { setTab(initialTab || 'login'); setU(''); setP(''); setErr('') }
  }, [open, initialTab])

  if (!open) return null

  const submit = async (e) => {
    e.preventDefault()
    setErr('')
    setLoading(true)
    if (tab === 'login') {
      const result = await onLogin({ username: u.trim(), password: p })
      if (result !== true) setErr(result || 'Hibás adatok.')
    } else {
      if (u.trim().length < 3) { setErr('Felhasználónév min. 3 karakter.'); setLoading(false); return }
      if (p.length < 8) { setErr('Jelszó min. 8 karakter.'); setLoading(false); return }
      const result = await onRegister({ username: u.trim(), password: p })
      if (result !== true) setErr(result || 'Regisztráció sikertelen.')
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay open" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="modal-head">
          <div className="modal-title">{tab === 'login' ? 'BELÉPÉS' : 'REGISZTRÁCIÓ'}</div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          <button className={`modal-tab${tab === 'login' ? ' active' : ''}`} onClick={() => { setTab('login'); setErr('') }}>Belépés</button>
          <button className={`modal-tab${tab === 'register' ? ' active' : ''}`} onClick={() => { setTab('register'); setErr('') }}>Regisztráció</button>
        </div>

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Felhasználónév</label>
            <input className="form-input" value={u} onChange={e => setU(e.target.value)} autoFocus autoComplete="username" disabled={loading} />
          </div>
          <div className="form-group">
            <label className="form-label">Jelszó</label>
            <input className="form-input" type="password" value={p} onChange={e => setP(e.target.value)} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} disabled={loading} />
          </div>

          {err && <div className="form-error">{err}</div>}

          {tab === 'register' && (
            <div className="form-hint" style={{ marginBottom: 8 }}>Jelszó min. 8 karakter. Csak betű, szám, aláhúzás a névben.</div>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>Mégse</button>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? '...' : tab === 'login' ? 'Belépés' : 'Regisztráció'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
