import { useState, useEffect, useRef, useCallback } from 'react'
import { formatDateHu, timeAgoHu } from '../data.js'
import { toast } from '../effects.js'
import { profileApi, profileWallApi, uploadFile, presenceApi } from '../api.js'

function getLevelInfo(xp = 0) {
  // LV n needs n*(n-1)/2 * 100 cumulative XP
  // LV1=0, LV2=100, LV3=300, LV4=600, LV5=1000...
  let level = 1
  while (xp >= level * (level + 1) / 2 * 100) level++
  const prev = (level - 1) * level / 2 * 100
  const next = level * (level + 1) / 2 * 100
  return {
    level,
    progress: xp - prev,
    required: next - prev,
    percent: Math.min(100, Math.floor((xp - prev) / (next - prev) * 100)),
  }
}

export default function ProfilePage({ username, session, onBack, onProfile, onSessionUpdate }) {
  const [profile, setProfile] = useState(null)
  const [wall, setWall] = useState([])
  const [loading, setLoading] = useState(true)
  const [wallText, setWallText] = useState('')
  const [wallPosting, setWallPosting] = useState(false)
  const [wallMediaUrl, setWallMediaUrl] = useState(null)
  const [wallMediaUploading, setWallMediaUploading] = useState(false)
  const wallMediaInputRef = useRef(null)
  const [savingUsername, setSavingUsername] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const avatarInputRef = useRef(null)
  const isOwn = session?.username === username
  const isSuperadmin = session?.role === 'superadmin'
  const canEdit = isOwn || isSuperadmin

  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')

  const [profilePresence, setProfilePresence] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)

  const handleSearch = useCallback(async (e) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    setSearching(true)
    try {
      const results = await profileApi.search(q)
      setSearchResults(results)
    } catch {
      toast('Keresési hiba', 'err')
    } finally {
      setSearching(false)
    }
  }, [searchQuery])

  useEffect(() => {
    const refresh = () => presenceApi.getMany([username]).then(data => setProfilePresence(data[username] ?? null))
    refresh()
    const id = setInterval(refresh, 60_000)
    return () => clearInterval(id)
  }, [username])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      profileApi.get(username),
      profileWallApi.list(username),
    ]).then(([p, w]) => {
      setProfile(p)
      setWall(w || [])
      setNewUsername(p.username || '')
    }).catch(() => {
      toast('Profil betöltési hiba', 'err')
    }).finally(() => setLoading(false))
  }, [username])

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast('Csak kép fájl fogadható el', 'err'); return }
    setAvatarUploading(true)
    try {
      const { url } = await uploadFile(file)
      await profileApi.update(username, { avatar_url: url })
      setProfile(p => ({ ...p, avatar_url: url }))
      if (isOwn) onSessionUpdate?.({ avatar_url: url })
      toast('Profilkép frissítve')
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setAvatarUploading(false)
      e.target.value = ''
    }
  }

  const handleSaveUsername = async (e) => {
    e.preventDefault()
    if (!newUsername.trim() || newUsername.trim() === profile.username) {
      toast('Nincs változtatás'); return
    }
    setSavingUsername(true)
    try {
      await profileApi.update(username, { username: newUsername.trim() })
      setProfile(p => ({ ...p, username: newUsername.trim() }))
      if (isOwn) onSessionUpdate?.({ username: newUsername.trim() })
      toast('Felhasználónév frissítve')
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setSavingUsername(false)
    }
  }

  const handleSavePassword = async (e) => {
    e.preventDefault()
    if (!newPassword) return
    if (newPassword !== newPasswordConfirm) {
      toast('A jelszavak nem egyeznek', 'err'); return
    }
    setSavingPassword(true)
    try {
      await profileApi.update(username, { password: newPassword })
      setNewPassword(''); setNewPasswordConfirm('')
      toast('Jelszó frissítve')
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleWallMediaChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast('Csak kép fájl fogadható el', 'err'); return }
    setWallMediaUploading(true)
    try {
      const { url } = await uploadFile(file)
      setWallMediaUrl(url)
    } catch (err) {
      toast(err.message, 'err')
    } finally {
      setWallMediaUploading(false)
      e.target.value = ''
    }
  }

  const handleWallPost = async (e) => {
    e.preventDefault()
    if (!wallText.trim() && !wallMediaUrl) return
    if (!session) { toast('Belépés szükséges', 'err'); return }
    setWallPosting(true)
    try {
      const msg = await profileWallApi.post(username, wallText.trim(), wallMediaUrl)
      setWall(prev => [msg, ...prev])
      setWallText('')
      setWallMediaUrl(null)
      if (msg.user_xp !== undefined) onSessionUpdate?.({ xp: msg.user_xp })
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setWallPosting(false)
    }
  }

  const handleWallDelete = async (id) => {
    try {
      await profileWallApi.delete(username, id)
      setWall(prev => prev.filter(m => m.id !== id))
    } catch (e) {
      toast(e.message, 'err')
    }
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.1em' }}>
      [ betöltés... ]
    </div>
  )

  if (!profile) return (
    <div style={{ textAlign: 'center', padding: 40, color: 'var(--danger)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      [ felhasználó nem található ]
    </div>
  )

  const lvInfo = getLevelInfo(profile.xp || 0)
  const roleColor = profile.role === 'superadmin' ? 'var(--magenta)' : profile.role === 'admin' ? 'var(--accent)' : 'var(--text-dim)'

  return (
    <div className="profile-page">
      <button className="profile-back" onClick={onBack}>← vissza</button>

      <div className="profile-header">
        <div className="profile-avatar-wrap">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={profile.username} className="profile-avatar" />
            : <div className="profile-avatar-placeholder">👤</div>
          }
          {profilePresence && (
            <span className={`presence-dot profile-presence-dot${profilePresence.isOnline ? ' online' : ' offline'}`} />
          )}
          {canEdit && (
            <>
              <button
                className="profile-avatar-edit"
                title="Profilkép módosítása"
                disabled={avatarUploading}
                onClick={() => avatarInputRef.current?.click()}
              >
                {avatarUploading ? '…' : '✎'}
              </button>
              <input
                type="file"
                ref={avatarInputRef}
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
            </>
          )}
        </div>
        <div className="profile-info">
          <div className="profile-username">
            @{profile.username}
            {profile.level > 1 && <span className="level-badge" style={{ fontSize: 12, padding: '2px 7px', marginLeft: 10 }}>LV.{lvInfo.level}</span>}
          </div>
          <div className="profile-role" style={{ color: roleColor }}>
            {profile.role === 'superadmin' ? '⚡ SUPERADMIN' : profile.role === 'admin' ? 'ADMIN' : 'USER'}
          </div>
          {profilePresence && (
            <div className="profile-presence-status">
              <span className={`presence-dot${profilePresence.isOnline ? ' online' : ' offline'}`} style={{ width: 8, height: 8 }} />
              <span>
                {profilePresence.isOnline
                  ? 'Elérhető'
                  : profilePresence.last_seen
                    ? `Utoljára: ${timeAgoHu(new Date(profilePresence.last_seen).getTime())}`
                    : 'Offline'}
              </span>
            </div>
          )}
          <div className="profile-level">LV.{lvInfo.level}</div>
          <div className="profile-xp-text">{profile.xp || 0} XP · még {lvInfo.required - lvInfo.progress} XP a következő szintig</div>
          <div className="profile-xp-bar">
            <div className="profile-xp-bar-fill" style={{ width: `${lvInfo.percent}%` }} />
          </div>
        </div>
      </div>

      {canEdit && (
        <>
          <div className="profile-section">
            <div className="profile-section-title">Felhasználónév</div>
            <div className="profile-section-body">
              <form onSubmit={handleSaveUsername}>
                <div className="profile-field">
                  <input
                    value={newUsername}
                    onChange={e => setNewUsername(e.target.value)}
                    placeholder="Felhasználónév"
                    minLength={3}
                    maxLength={32}
                  />
                </div>
                <button type="submit" className="btn" disabled={savingUsername} style={{ marginTop: 4 }}>
                  {savingUsername ? 'Mentés...' : 'Mentés'}
                </button>
              </form>
            </div>
          </div>
          <div className="profile-section">
            <div className="profile-section-title">Jelszó változtatása</div>
            <div className="profile-section-body">
              <form onSubmit={handleSavePassword}>
                <div className="profile-field">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Új jelszó"
                    minLength={8}
                  />
                </div>
                {newPassword && (
                  <div className="profile-field">
                    <input
                      type="password"
                      value={newPasswordConfirm}
                      onChange={e => setNewPasswordConfirm(e.target.value)}
                      placeholder="Jelszó megerősítése"
                    />
                  </div>
                )}
                <button type="submit" className="btn" disabled={savingPassword || !newPassword} style={{ marginTop: 4 }}>
                  {savingPassword ? 'Mentés...' : 'Mentés'}
                </button>
              </form>
            </div>
          </div>
        </>
      )}

      {isOwn && (
        <div className="profile-section">
          <div className="profile-section-title">Felhasználó keresés</div>
          <div className="profile-section-body">
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 6 }}>
              <input
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchResults(null) }}
                placeholder="Felhasználónév keresése..."
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn" disabled={searching || !searchQuery.trim()}>
                {searching ? '…' : 'Keres'}
              </button>
            </form>
            {searchResults !== null && (
              <div style={{ marginTop: 8 }}>
                {searchResults.length === 0 && (
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', padding: '8px 0' }}>
                    [ nincs találat ]
                  </div>
                )}
                {searchResults.map(u => (
                  <button
                    key={u.username}
                    className="link-btn"
                    onClick={() => onProfile?.(u.username)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '6px 0', borderBottom: '1px solid var(--border)' }}
                  >
                    {u.avatar_url
                      ? <img src={u.avatar_url} alt={u.username} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      : <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-2)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>👤</span>
                    }
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text)' }}>@{u.username}</span>
                    {u.level > 1 && <span className="level-badge" style={{ fontSize: 9, padding: '1px 5px' }}>LV.{u.level}</span>}
                    {u.role !== 'user' && (
                      <span style={{ fontSize: 9, color: u.role === 'superadmin' ? 'var(--magenta)' : 'var(--accent)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
                        {u.role === 'superadmin' ? '⚡' : 'ADMIN'}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="profile-wall">
        <div className="profile-wall-title">Profil fal</div>
        {session ? (
          <form className="wall-form" onSubmit={handleWallPost}>
            <div style={{ display: 'flex', gap: 6, width: '100%' }}>
              <input
                className="wall-input"
                placeholder={`Írj üzenetet @${profile.username} falára...`}
                value={wallText}
                onChange={e => setWallText(e.target.value)}
                maxLength={500}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-ghost"
                title="Kép csatolása"
                disabled={wallMediaUploading}
                onClick={() => wallMediaInputRef.current?.click()}
                style={{ flexShrink: 0, fontSize: 14, padding: '0 10px' }}
              >
                {wallMediaUploading ? '…' : '🖼'}
              </button>
              <input type="file" ref={wallMediaInputRef} accept="image/*" style={{ display: 'none' }} onChange={handleWallMediaChange} />
              <button type="submit" className="btn" disabled={wallPosting || (!wallText.trim() && !wallMediaUrl)} style={{ flexShrink: 0 }}>Küld</button>
            </div>
            {wallMediaUrl && (
              <div style={{ position: 'relative', marginTop: 6 }}>
                <img src={wallMediaUrl} alt="preview" style={{ width: '100%', maxHeight: 200, objectFit: 'contain', background: 'var(--bg-0)', border: '1px solid var(--border)' }} />
                <button type="button" onClick={() => setWallMediaUrl(null)} style={{ position: 'absolute', top: 4, right: 4, background: 'var(--bg-1)', border: '1px solid var(--border)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 11, padding: '2px 6px' }}>✕</button>
              </div>
            )}
          </form>
        ) : (
          <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', marginBottom: 12 }}>
            [ belépés szükséges az üzenetküldéshez ]
          </div>
        )}
        {wall.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', textAlign: 'center', padding: 20 }}>
            [ üres fal — légy az első ]
          </div>
        )}
        {wall.map(msg => {
          const canDelete = session?.username === msg.author || isSuperadmin || session?.username === username
          return (
            <div key={msg.id} className="wall-message">
              <div className="wall-msg-head">
                <button className="wall-msg-author link-btn" onClick={() => onProfile?.(msg.author)}>
                  @{msg.author}
                  {msg.level > 1 && <span className="level-badge" style={{ marginLeft: 5 }}>LV.{msg.level}</span>}
                </button>
                <span className="wall-msg-time">{timeAgoHu(msg.createdAt)} · {formatDateHu(msg.createdAt)}</span>
                {canDelete && (
                  <button className="wall-msg-del" onClick={() => handleWallDelete(msg.id)}>✕</button>
                )}
              </div>
              {msg.text && <div className="wall-msg-text">{msg.text}</div>}
              {msg.media_url && (
                <img src={msg.media_url} alt="" style={{ width: '100%', maxHeight: 400, objectFit: 'contain', background: 'var(--bg-0)', border: '1px solid var(--border)', marginTop: msg.text ? 6 : 0, display: 'block' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
