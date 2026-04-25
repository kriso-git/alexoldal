import { useState, useEffect, useCallback, useRef } from 'react'
import { superadminApi, songsApi, customEmojiApi, uploadFile, profileApi } from './api.js'
import { toast } from './effects.js'
import { formatDateHu, timeAgoHu } from './data.js'

const ROLE_COLORS = { superadmin: 'var(--magenta)', admin: 'var(--accent)', user: 'var(--text-dim)' }
const ROLE_LABELS = { superadmin: '⚡ Superadmin', admin: '🛡 Admin', user: '👤 Guest' }

function StatCard({ label, value, color }) {
  return (
    <div className="ban-stat" style={{ flex: 1, minWidth: 100 }}>
      <div className="ban-stat-label">{label}</div>
      <div className="ban-stat-value" style={{ fontSize: 26, color: color || 'var(--accent)' }}>{value ?? '—'}</div>
    </div>
  )
}

// ── Users tab ─────────────────────────────────────────────────────────────────
function UsersTab({ currentUserId }) {
  const [users, setUsers] = useState(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [resetId, setResetId] = useState(null)
  const [newPw, setNewPw] = useState('')
  const [banId, setBanId] = useState(null)
  const [banMinutes, setBanMinutes] = useState('')
  const [showPw, setShowPw] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try { setUsers(await superadminApi.getUsers()) }
    catch (e) { toast(e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const setRole = async (id, role) => {
    if (role === 'superadmin' && !confirm('Biztosan superadmin jogot adsz ennek a felhasználónak?')) return
    try {
      await superadminApi.setRole(id, role)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u))
      toast(`Szerep: ${role}`)
    } catch (e) { toast(e.message, 'err') }
  }

  const toggleCanPost = async (id, val) => {
    try {
      await superadminApi.setPermissions(id, { can_post: val })
      setUsers(prev => prev.map(u => u.id === id ? { ...u, can_post: val } : u))
      toast(val ? 'Posztolási jog megadva' : 'Posztolási jog elvéve')
    } catch (e) { toast(e.message, 'err') }
  }

  const doBan = async (id, banned) => {
    const minutes = banMinutes ? parseInt(banMinutes) : null
    if (banned && minutes && (isNaN(minutes) || minutes < 1)) return toast('Érvénytelen időtartam', 'err')
    try {
      await superadminApi.setBan(id, banned, banned ? minutes : undefined)
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_banned: banned } : u))
      toast(banned ? (minutes ? `Tiltva ${minutes} percre` : 'Véglegesen tiltva') : 'Tiltás feloldva')
      setBanId(null); setBanMinutes('')
    } catch (e) { toast(e.message, 'err') }
  }

  const deleteUser = async (id, username) => {
    if (!confirm(`Biztosan törlöd @${username} fiókját?`)) return
    try {
      await superadminApi.deleteUser(id)
      setUsers(prev => prev.filter(u => u.id !== id))
      toast('Felhasználó törölve')
    } catch (e) { toast(e.message, 'err') }
  }

  const doResetPw = async (id) => {
    if (!newPw || newPw.length < 8) return toast('Min. 8 karakter', 'err')
    try {
      await superadminApi.resetPassword(id, newPw)
      toast('Jelszó visszaállítva')
      setResetId(null); setNewPw('')
    } catch (e) { toast(e.message, 'err') }
  }

  const visible = (users || []).filter(u =>
    !search || u.username.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <input className="form-input" placeholder="Keresés felhasználónév alapján..."
        value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 320 }} />

      {loading && <div style={{ color: 'var(--text-faint)', fontSize: 12, letterSpacing: '0.1em' }}>[ betöltés... ]</div>}

      {visible.map(u => (
        <div key={u.id} style={{
          padding: '12px 16px',
          border: `1px solid ${u.is_banned ? 'rgba(255,46,90,0.3)' : 'var(--border)'}`,
          background: u.is_banned ? 'rgba(255,46,90,0.04)' : 'var(--bg-1)',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: ROLE_COLORS[u.role] || 'var(--text)' }}>
                @{u.username}
              </span>
              <span style={{ fontSize: 10, letterSpacing: '0.15em', padding: '2px 6px', border: `1px solid ${ROLE_COLORS[u.role]}`, color: ROLE_COLORS[u.role] }}>
                {u.role.toUpperCase()}
              </span>
              {u.is_banned && <span style={{ fontSize: 10, letterSpacing: '0.15em', padding: '2px 6px', border: '1px solid var(--danger)', color: 'var(--danger)' }}>BANNED</span>}
              {u.id === currentUserId && <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>(te)</span>}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
              Regisztrált: {formatDateHu(u.created_at)}
              {u.last_login && ` · Utolsó belépés: ${timeAgoHu(u.last_login)}`}
            </div>
          </div>

          {u.id !== currentUserId && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Role selector */}
              {u.role !== 'superadmin' && (
                <select
                  className="form-input"
                  value={u.role}
                  onChange={e => setRole(u.id, e.target.value)}
                  style={{ fontSize: 10, padding: '3px 8px', minWidth: 110 }}
                >
                  <option value="user">👤 Guest</option>
                  <option value="admin">🛡 Admin</option>
                  <option value="superadmin">⚡ Superadmin</option>
                </select>
              )}
              {u.role === 'superadmin' && u.id !== currentUserId && (
                <select
                  className="form-input"
                  value="superadmin"
                  onChange={e => setRole(u.id, e.target.value)}
                  style={{ fontSize: 10, padding: '3px 8px', minWidth: 110 }}
                >
                  <option value="user">👤 Guest</option>
                  <option value="admin">🛡 Admin</option>
                  <option value="superadmin">⚡ Superadmin</option>
                </select>
              )}

              {/* can_post permission — only for non-admin users */}
              {u.role === 'user' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, cursor: 'pointer', color: u.can_post ? 'var(--accent)' : 'var(--text-dim)', userSelect: 'none' }}>
                  <input
                    type="checkbox"
                    checked={!!u.can_post}
                    onChange={e => toggleCanPost(u.id, e.target.checked)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  Posztolhat
                </label>
              )}

              {/* Ban button */}
              {u.role !== 'superadmin' && (
                <button
                  className={`btn ${u.is_banned ? '' : 'btn-danger'}`}
                  style={{ fontSize: 10, padding: '4px 10px' }}
                  onClick={() => u.is_banned ? doBan(u.id, false) : setBanId(banId === u.id ? null : u.id)}
                >
                  {u.is_banned ? '✓ Tiltás feloldása' : '✕ Tiltás'}
                </button>
              )}

              <button className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 10px' }}
                onClick={() => setResetId(resetId === u.id ? null : u.id)}>
                🔑 Jelszó
              </button>
              <button className="btn btn-danger" style={{ fontSize: 10, padding: '4px 10px' }}
                onClick={() => deleteUser(u.id, u.username)}>
                🗑 Töröl
              </button>
            </div>
          )}

          {/* Time-limited ban UI */}
          {banId === u.id && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginTop: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>Tiltás időtartama:</span>
              <input className="form-input" type="number" min="1" placeholder="percek (üres = végleges)"
                value={banMinutes} onChange={e => setBanMinutes(e.target.value)}
                style={{ width: 180, fontSize: 10, padding: '3px 8px' }} />
              <button className="btn btn-danger" style={{ fontSize: 10, padding: '4px 10px' }}
                onClick={() => doBan(u.id, true)}>
                {banMinutes ? `Tiltás ${banMinutes} percre` : 'Végleges tiltás'}
              </button>
              <button className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 10px' }}
                onClick={() => { setBanId(null); setBanMinutes('') }}>✕</button>
            </div>
          )}

          {/* Password reset UI */}
          {resetId === u.id && (
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <input className="form-input" type={showPw ? 'text' : 'password'} placeholder="Új jelszó (min. 8 karakter)"
                value={newPw} onChange={e => setNewPw(e.target.value)} style={{ flex: 1 }} autoFocus />
              <button className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 10px' }}
                onClick={() => setShowPw(v => !v)} title={showPw ? 'Elrejt' : 'Mutat'}>
                {showPw ? '🙈' : '👁'}
              </button>
              <button className="btn" style={{ fontSize: 10, padding: '4px 14px' }} onClick={() => doResetPw(u.id)}>Mentés</button>
              <button className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 10px' }}
                onClick={() => { setResetId(null); setNewPw(''); setShowPw(false) }}>✕</button>
            </div>
          )}
        </div>
      ))}

      {!loading && visible.length === 0 && (
        <div style={{ color: 'var(--text-faint)', fontSize: 12, letterSpacing: '0.1em', padding: 20, textAlign: 'center' }}>
          [ nincs találat ]
        </div>
      )}
    </div>
  )
}

// ── Audit labels ──────────────────────────────────────────────────────────────
const ALL_ACTIONS = [
  { id: 'login',           label: 'Belépés' },
  { id: 'login_fail',      label: 'Sikertelen belépés' },
  { id: 'logout',          label: 'Kilépés' },
  { id: 'register',        label: 'Regisztráció' },
  { id: 'create_post',     label: 'Poszt létrehozva' },
  { id: 'delete_post',     label: 'Poszt törölve' },
  { id: 'reorder_posts',   label: 'Posztok átrendezve' },
  { id: 'add_comment',     label: 'Komment hozzáadva' },
  { id: 'reply_comment',   label: 'Komment válasz' },
  { id: 'delete_comment',  label: 'Komment törölve' },
  { id: 'react_post',      label: 'Poszt reakció' },
  { id: 'unreact_post',    label: 'Poszt reakció visszavonva' },
  { id: 'react_comment',   label: 'Komment reakció' },
  { id: 'unreact_comment', label: 'Komment reakció visszavonva' },
  { id: 'set_user_role',   label: 'Szerepkör módosítva' },
  { id: 'ban_user',        label: 'Felhasználó tiltva' },
  { id: 'unban_user',      label: 'Tiltás feloldva' },
  { id: 'delete_user',     label: 'Felhasználó törölve' },
  { id: 'reset_password',  label: 'Jelszó visszaállítva' },
  { id: 'upload_song',     label: 'Zene feltöltve' },
  { id: 'delete_song',     label: 'Zene törölve' },
]

const ACTION_LABEL = Object.fromEntries(ALL_ACTIONS.map(a => [a.id, a.label]))

const ACTION_COLORS = {
  login: 'var(--accent)', login_fail: 'var(--danger)', logout: 'var(--text-dim)',
  register: 'var(--cyan)', create_post: 'var(--accent)', delete_post: 'var(--danger)',
  add_comment: 'var(--cyan)', reply_comment: 'var(--cyan)',
  delete_comment: 'var(--warn)', reorder_posts: 'var(--text-dim)',
  react_post: 'var(--accent)', unreact_post: 'var(--text-dim)',
  react_comment: 'var(--accent)', unreact_comment: 'var(--text-dim)',
  set_user_role: 'var(--magenta)', ban_user: 'var(--danger)',
  unban_user: 'var(--accent)', delete_user: 'var(--danger)', reset_password: 'var(--warn)',
  upload_song: 'var(--cyan)', delete_song: 'var(--warn)',
}

// ── Audit log tab ─────────────────────────────────────────────────────────────
function AuditTab() {
  const [data, setData] = useState(null)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionFilter, setActionFilter] = useState('')
  const [usernameFilter, setUsernameFilter] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)

  const load = useCallback(async (p, action, username) => {
    setLoading(true)
    try {
      setData(await superadminApi.getAuditLog(p, action, username))
      setLastRefresh(Date.now())
    }
    catch (e) { toast(e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(page, actionFilter, usernameFilter) }, [page, actionFilter, usernameFilter, load])

  const handleActionFilter = (v) => { setActionFilter(v); setPage(0) }
  const handleUsernameFilter = (v) => { setUsernameFilter(v); setPage(0) }

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => load(page, actionFilter, usernameFilter), 10000)
    return () => clearInterval(id)
  }, [autoRefresh, page, actionFilter, usernameFilter, load])

  const totalPages = Math.max(1, Math.ceil((data?.total || 0) / (data?.limit || 50)))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="form-input" value={actionFilter}
          onChange={e => handleActionFilter(e.target.value)}
          style={{ fontSize: 11, padding: '4px 8px', minWidth: 200 }}>
          <option value="">— Minden esemény —</option>
          {ALL_ACTIONS.map(a => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
        <input className="form-input" placeholder="Felhasználónév szűrő..."
          value={usernameFilter} onChange={e => handleUsernameFilter(e.target.value)}
          style={{ fontSize: 11, padding: '4px 8px', minWidth: 180 }} />
        <button className={`btn ${autoRefresh ? '' : 'btn-ghost'}`}
          style={{ fontSize: 10, padding: '4px 12px' }} onClick={() => setAutoRefresh(v => !v)}>
          {autoRefresh ? '⬤ LIVE' : '○ Auto-refresh'}
        </button>
        <button className="btn btn-ghost" style={{ fontSize: 10, padding: '4px 10px' }}
          onClick={() => load(page, actionFilter, usernameFilter)} disabled={loading}>↺</button>
        {lastRefresh && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', marginLeft: 'auto' }}>
            {autoRefresh && <span style={{ color: 'var(--accent)', marginRight: 6 }}>●</span>}
            {new Date(lastRefresh).toLocaleTimeString('hu-HU')}
          </span>
        )}
      </div>

      {loading && <div style={{ color: 'var(--text-faint)', fontSize: 12, letterSpacing: '0.1em' }}>[ betöltés... ]</div>}

      {(data?.rows || []).map(row => {
        let detailStr = ''
        if (row.details) {
          try { detailStr = JSON.stringify(JSON.parse(row.details)) }
          catch { detailStr = String(row.details) }
        }
        return (
          <div key={row.id} style={{
            padding: '7px 12px', border: '1px solid var(--border)',
            background: 'var(--bg-1)', display: 'grid',
            gridTemplateColumns: '180px 120px 1fr auto', gap: '0 10px', alignItems: 'center',
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: ACTION_COLORS[row.action] || 'var(--text)', letterSpacing: '0.04em' }}>
              {ACTION_LABEL[row.action] || row.action}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)' }}>
              @{row.actor_username || '—'}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {row.target_id && <span style={{ color: 'var(--text-faint)', marginRight: 6 }}>→ {row.target_type}:{row.target_id}</span>}
              {detailStr}
              {row.ip && <span style={{ color: 'var(--text-faint)', marginLeft: 8 }}>ip:{row.ip}</span>}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', whiteSpace: 'nowrap', textAlign: 'right' }}>
              {formatDateHu(row.created_at)}
            </span>
          </div>
        )
      })}

      {!loading && data?.rows?.length === 0 && (
        <div style={{ color: 'var(--text-faint)', fontSize: 12, textAlign: 'center', padding: 20 }}>[ nincs találat ]</div>
      )}

      {data && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', paddingTop: 8 }}>
          <button className="btn btn-ghost" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0 || loading}>‹ Előző</button>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>
            {page + 1} / {totalPages} · összesen: {data.total}
          </span>
          <button className="btn btn-ghost" onClick={() => setPage(p => p + 1)} disabled={page + 1 >= totalPages || loading}>Következő ›</button>
        </div>
      )}
    </div>
  )
}

// ── Stats tab ─────────────────────────────────────────────────────────────────
function StatsTab() {
  const [stats, setStats] = useState(null)
  useEffect(() => {
    superadminApi.getStats().then(setStats).catch(e => toast(e.message, 'err'))
  }, [])
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      <StatCard label="FELHASZNÁLÓK" value={stats?.users} />
      <StatCard label="ADMINOK" value={stats?.admins} color="var(--magenta)" />
      <StatCard label="TILTOTTAK" value={stats?.banned} color="var(--danger)" />
      <StatCard label="POSZTOK" value={stats?.posts} />
      <StatCard label="KOMMENTEK" value={stats?.comments} color="var(--cyan)" />
      <StatCard label="REAKCIÓK" value={stats?.reactions} color="var(--warn)" />
    </div>
  )
}

// ── Music tab ─────────────────────────────────────────────────────────────────
function MusicTab() {
  const [songs, setSongs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [editName, setEditName] = useState('')
  const [renamingId, setRenamingId] = useState(null)
  const [renamingVal, setRenamingVal] = useState('')
  const fileInputRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setSongs(await songsApi.list()) }
    catch (e) { toast(e.message, 'err') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const doUpload = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const name = editName.trim() || file.name.replace(/\.[^.]+$/, '')
      const song = await songsApi.upload(file, name)
      setSongs(prev => [...prev, { ...song, url: song.url }])
      toast(`"${name}" feltöltve`)
      setEditName('')
    } catch (e) { toast(e.message, 'err') }
    finally { setUploading(false) }
  }

  const deleteSong = async (id, name) => {
    if (!confirm(`Törlöd: "${name}"?`)) return
    try {
      await songsApi.delete(id)
      setSongs(prev => prev.filter(s => s.id !== id))
      toast('Zene törölve')
    } catch (e) { toast(e.message, 'err') }
  }

  const startRename = (s) => { setRenamingId(s.id); setRenamingVal(s.name) }
  const cancelRename = () => { setRenamingId(null); setRenamingVal('') }
  const saveRename = async (id) => {
    const name = renamingVal.trim()
    if (!name) return
    try {
      await songsApi.rename(id, name)
      setSongs(prev => prev.map(s => s.id === id ? { ...s, name } : s))
      toast('Név mentve')
      cancelRename()
    } catch (e) { toast(e.message, 'err') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
        Ezek a zenék szólnak az oldal alsó playerében. Max 50 MB / fájl. Támogatott: mp3, ogg, wav, flac.
      </div>

      {/* Upload area */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input className="form-input" placeholder="Zene neve (opc.)" value={editName}
          onChange={e => setEditName(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
        <button className="btn" style={{ fontSize: 11, padding: '6px 14px' }}
          onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? '⏳ Feltöltés...' : '⬆ Zene feltöltése'}
        </button>
        <input ref={fileInputRef} type="file" accept="audio/*" style={{ display: 'none' }}
          onChange={e => doUpload(e.target.files[0])} />
      </div>

      {/* Drag-drop zone */}
      <div
        onDrop={e => { e.preventDefault(); setDragOver(false); doUpload(e.dataTransfer.files[0]) }}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
          background: dragOver ? 'rgba(200,255,0,0.04)' : 'transparent',
          padding: '18px', textAlign: 'center', fontSize: 11,
          color: dragOver ? 'var(--accent)' : 'var(--text-faint)',
          letterSpacing: '0.1em', cursor: 'pointer', transition: 'all 0.15s',
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        🎵 Húzd ide a zenefájlt vagy klikkelj a böngészéshez
      </div>

      {loading && <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>[ betöltés... ]</div>}

      {songs.map((s, i) => (
        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', border: '1px solid var(--border)', background: 'var(--bg-1)', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-faint)', minWidth: 24 }}>
            {String(i + 1).padStart(2, '0')}
          </span>

          {renamingId === s.id ? (
            <>
              <input
                className="form-input"
                value={renamingVal}
                onChange={e => setRenamingVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveRename(s.id); if (e.key === 'Escape') cancelRename() }}
                style={{ flex: 1, fontSize: 12, padding: '3px 8px', minWidth: 140 }}
                autoFocus
              />
              <button className="btn" style={{ fontSize: 10, padding: '3px 10px' }} onClick={() => saveRename(s.id)}>✓</button>
              <button className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 8px' }} onClick={cancelRename}>✕</button>
            </>
          ) : (
            <>
              <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{s.name}</span>
              <button className="btn btn-ghost" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => startRename(s)}
                title="Átnevezés">✏</button>
            </>
          )}

          <audio controls src={s.url} style={{ height: 28, flex: 1, maxWidth: 260 }} />
          <button className="btn btn-danger" style={{ fontSize: 10, padding: '3px 8px' }}
            onClick={() => deleteSong(s.id, s.name)}>🗑</button>
        </div>
      ))}

      {!loading && songs.length === 0 && (
        <div style={{ color: 'var(--text-faint)', fontSize: 12, textAlign: 'center', padding: 20 }}>
          [ nincs zene — tölts fel egyet ]
        </div>
      )}
    </div>
  )
}

async function optimizeEmoji(file) {
  if (file.type === 'image/gif') return file
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      const MAX = 128
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width >= height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(objectUrl)
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.png'), { type: 'image/png' })),
        'image/png'
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file) }
    img.src = objectUrl
  })
}

// ── Emojik tab ────────────────────────────────────────────────────────────────
function EmojisTab() {
  const [emojis, setEmojis] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [newName, setNewName] = useState('')
  const fileInputRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setEmojis(await customEmojiApi.list()) }
    catch { setEmojis([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const doUpload = async (file) => {
    if (!file) return
    const name = newName.trim() || file.name.replace(/\.[^.]+$/, '')
    setUploading(true)
    try {
      const optimized = await optimizeEmoji(file)
      const { url } = await uploadFile(optimized)
      const emoji = await customEmojiApi.add(name, url)
      setEmojis(prev => [...prev, emoji])
      toast(`"${name}" emoji feltöltve`)
      setNewName('')
    } catch (e) { toast(e.message || 'Hiba', 'err') }
    finally { setUploading(false) }
  }

  const doDelete = async (id, name) => {
    if (!confirm(`Törlöd: "${name}"?`)) return
    try {
      await customEmojiApi.delete(id)
      setEmojis(prev => prev.filter(e => e.id !== id))
      toast('Emoji törölve')
    } catch (e) { toast(e.message || 'Hiba', 'err') }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
        Egyedi emojik, amelyek megjelennek a komment reakció-választóban. Támogatott: png, gif, jpg, webp.
      </div>

      <div className="emoji-upload-row">
        <input
          className="form-input"
          placeholder="Emoji neve (pl. pepehappy)"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          style={{ flex: 1, minWidth: 160 }}
        />
        <button
          className="btn"
          style={{ fontSize: 11, padding: '6px 14px' }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? '⏳ Feltöltés...' : '⬆ Emoji feltöltése'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.gif"
          style={{ display: 'none' }}
          onChange={e => doUpload(e.target.files?.[0])}
        />
      </div>

      {loading && <div style={{ color: 'var(--text-faint)', fontSize: 12 }}>[ betöltés... ]</div>}

      {!loading && emojis.length === 0 && (
        <div style={{ color: 'var(--text-faint)', fontSize: 12, textAlign: 'center', padding: 24 }}>
          [ nincs egyedi emoji — tölts fel egyet ]
        </div>
      )}

      {emojis.length > 0 && (
        <div className="emoji-grid">
          {emojis.map(e => (
            <div key={e.id} className="emoji-card">
              <img src={e.url} alt={e.name} />
              <div className="emoji-card-name">:{e.name}:</div>
              <button className="emoji-card-del" onClick={() => doDelete(e.id, e.name)}>🗑 törlés</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── My Account tab ────────────────────────────────────────────────────────────
function MyAccountTab({ session }) {
  const [newUsername, setNewUsername] = useState(session?.username || '')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [savingUsername, setSavingUsername] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const handleSaveUsername = async (e) => {
    e.preventDefault()
    const trimmed = newUsername.trim()
    if (!trimmed || trimmed === session?.username) { toast('Nincs változtatás'); return }
    setSavingUsername(true)
    try {
      await profileApi.update(session.username, { username: trimmed })
      toast('Felhasználónév frissítve — kérjük lépj be újra')
    } catch (err) { toast(err.message, 'err') }
    finally { setSavingUsername(false) }
  }

  const handleSavePassword = async (e) => {
    e.preventDefault()
    if (!newPassword) return
    if (newPassword !== newPasswordConfirm) { toast('A jelszavak nem egyeznek', 'err'); return }
    if (newPassword.length < 8) { toast('Min. 8 karakter', 'err'); return }
    setSavingPassword(true)
    try {
      await profileApi.update(session.username, { password: newPassword })
      setNewPassword(''); setNewPasswordConfirm('')
      toast('Jelszó frissítve')
    } catch (err) { toast(err.message, 'err') }
    finally { setSavingPassword(false) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 480 }}>
      <div style={{ fontSize: 11, color: 'var(--text-dim)', letterSpacing: '0.1em' }}>
        Saját superadmin fiók adatainak módosítása.
      </div>

      <div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
          Felhasználónév
        </div>
        <form onSubmit={handleSaveUsername} style={{ display: 'flex', gap: 8 }}>
          <input
            className="form-input"
            value={newUsername}
            onChange={e => setNewUsername(e.target.value)}
            placeholder="Felhasználónév"
            minLength={3}
            maxLength={32}
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn" disabled={savingUsername}>
            {savingUsername ? 'Mentés...' : 'Mentés'}
          </button>
        </form>
      </div>

      <div>
        <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>
          Jelszó változtatása
        </div>
        <form onSubmit={handleSavePassword} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input
            className="form-input"
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Új jelszó (min. 8 karakter)"
            minLength={8}
          />
          {newPassword && (
            <input
              className="form-input"
              type="password"
              value={newPasswordConfirm}
              onChange={e => setNewPasswordConfirm(e.target.value)}
              placeholder="Jelszó megerősítése"
            />
          )}
          <button type="submit" className="btn" disabled={savingPassword || !newPassword} style={{ alignSelf: 'flex-start' }}>
            {savingPassword ? 'Mentés...' : 'Jelszó mentése'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ── Main SuperAdmin ───────────────────────────────────────────────────────────
export default function SuperAdmin({ onClose, session, onLogout }) {
  const [tab, setTab] = useState('users')
  const TABS = [
    { id: 'users', label: '👥 Felhasználók' },
    { id: 'audit', label: '📋 Audit log' },
    { id: 'music', label: '🎵 Zene' },
    { id: 'emojis', label: '🎨 Emojik' },
    { id: 'stats', label: '📊 Statisztika' },
    { id: 'myaccount', label: '👤 Saját fiók' },
  ]

  return (
    <div style={{ position: 'relative', zIndex: 2, maxWidth: 1100, margin: '0 auto', padding: '32px 48px 80px', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border-strong)' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--magenta)', textShadow: '0 0 20px rgba(255,0,170,0.5)', letterSpacing: '0.05em' }}>
            SUPERADMIN PANEL
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)', marginTop: 4, letterSpacing: '0.15em' }}>
            @{session?.username} · teljes jogosultság
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={onClose}>← Vissza</button>
          <button className="btn btn-danger" onClick={onLogout}>Kilépés</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '10px 20px', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em',
            color: tab === t.id ? 'var(--magenta)' : 'var(--text-dim)',
            background: 'none', border: 'none',
            borderBottom: tab === t.id ? '2px solid var(--magenta)' : '2px solid transparent',
            cursor: 'pointer', transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'users' && <UsersTab currentUserId={session?.id} />}
        {tab === 'audit' && <AuditTab />}
        {tab === 'music' && <MusicTab />}
        {tab === 'emojis' && <EmojisTab />}
        {tab === 'stats' && <StatsTab />}
        {tab === 'myaccount' && <MyAccountTab session={session} />}
      </div>
    </div>
  )
}
