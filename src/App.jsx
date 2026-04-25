import { useState, useEffect, useCallback } from 'react'
import BootScreen from './design/BootScreen.jsx'
import PageHome from './pages/PageHome.jsx'
import PageAuth from './pages/PageAuth.jsx'
import PageProfile from './pages/PageProfile.jsx'
import PageAdmin from './pages/PageAdmin.jsx'
import {
  setAccessToken, clearAccessToken, setUnauthCallback,
  tryRestoreSession, authApi, postsApi, presenceApi,
} from './api.js'
import { toast } from './effects.js'

// Expose access token for admin page API calls
window.__accessToken = ''

export default function App() {
  const [booted, setBooted] = useState(false)
  const [page, setPage] = useState('IDX')    // IDX | AUTH | PRF | CTL
  const [profileUser, setProfileUser] = useState(null)

  const [session, setSession] = useState(null)
  const [posts, setPosts] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [userCount, setUserCount] = useState(0)
  const [onlineCount, setOnlineCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tweaksOpen, setTweaksOpen] = useState(false)

  // ── Bootstrap ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setUnauthCallback(() => {
      setSession(null)
      window.__accessToken = ''
      toast('Lejárt a munkamenet. Kérjük, lépj be újra.', 'err')
      setPage('AUTH')
    })

    const init = async () => {
      const result = await tryRestoreSession()
      if (result?.user) {
        setSession(result.user)
        if (result.accessToken) window.__accessToken = result.accessToken
      }
      await loadPosts()
      await loadUsers()
      setLoading(false)
    }
    init()

    // Tweaks panel toggle via postMessage (from design canvas)
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true)
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false)
    }
    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  // ── Presence heartbeat ────────────────────────────────────────────────────
  useEffect(() => {
    if (!session) return
    presenceApi.heartbeat()
    const id = setInterval(() => presenceApi.heartbeat(), 30_000)
    return () => clearInterval(id)
  }, [session?.id])

  // ── Data loading ──────────────────────────────────────────────────────────
  const loadPosts = async () => {
    try {
      const data = await postsApi.list()
      setPosts(data.sort((a, b) => b.createdAt - a.createdAt))
    } catch (e) { console.error('Failed to load posts', e) }
  }

  const loadUsers = async () => {
    try {
      const resp = await fetch('/api/superadmin/users', {
        headers: window.__accessToken ? { 'Authorization': `Bearer ${window.__accessToken}` } : {}
      })
      if (resp.ok) {
        const data = await resp.json()
        const users = data.users || data || []
        setAllUsers(users)
        setUserCount(users.length)
        setOnlineCount(users.filter(u => u.is_online).length || 0)
      }
    } catch {}
  }

  // Re-fetch when session changes
  useEffect(() => {
    if (!loading) { loadPosts(); loadUsers() }
  }, [session?.id])

  // ── Navigation ────────────────────────────────────────────────────────────
  const navigate = useCallback((target, param) => {
    if (target === 'PRF') {
      setProfileUser(param || null)
      setPage('PRF')
    } else if (target === 'CTL') {
      if (session?.role === 'superadmin' || session?.role === 'admin') setPage('CTL')
      else { toast('Nincs jogosultságod', 'err'); setPage('AUTH') }
    } else {
      setPage(target)
    }
  }, [session])

  // ── Auth ──────────────────────────────────────────────────────────────────
  const handleLogin = useCallback(async ({ username, password }) => {
    try {
      const { user, accessToken } = await authApi.login(username, password)
      setAccessToken(accessToken)
      window.__accessToken = accessToken
      setSession(user)
      setPage('IDX')
      toast(`BELÉPTÉL — @${user.username}`)
      return true
    } catch (e) { return e.message }
  }, [])

  const handleRegister = useCallback(async ({ username, password }) => {
    try {
      const { user, accessToken } = await authApi.register(username, password)
      setAccessToken(accessToken)
      window.__accessToken = accessToken
      setSession(user)
      setPage('IDX')
      toast(`REGISZTRÁCIÓ SIKERES — @${user.username}`)
      return true
    } catch (e) { return e.message }
  }, [])

  const handleLogout = useCallback(async () => {
    try { await authApi.logout() } catch {}
    clearAccessToken()
    window.__accessToken = ''
    setSession(null)
    setPage('IDX')
    toast('KILÉPTÉL')
  }, [])

  // ── Posts ─────────────────────────────────────────────────────────────────
  const handlePost = useCallback(async (postData) => {
    try {
      const post = await postsApi.create(postData)
      setPosts(prev => [post, ...prev])
      if (post.user_xp !== undefined) setSession(s => s ? { ...s, xp: post.user_xp } : s)
      toast('POSZT KIADVA')
    } catch (e) { toast(e.message, 'err') }
  }, [])

  const handleDeletePost = useCallback(async (id) => {
    if (!confirm('Biztos törlöd?')) return
    try {
      await postsApi.delete(id)
      setPosts(prev => prev.filter(p => p.id !== id))
      toast('POSZT TÖRÖLVE')
    } catch (e) { toast(e.message, 'err') }
  }, [])

  const handleReact = useCallback(async (postId, key) => {
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const had = p.myReactions?.includes(key)
      const reactions = { ...p.reactions, [key]: Math.max(0, (p.reactions[key]||0) + (had?-1:1)) }
      const myReactions = had ? p.myReactions.filter(k=>k!==key) : [...(p.myReactions||[]), key]
      return { ...p, reactions, myReactions }
    }))
    try {
      const { reactions, myReactions } = await postsApi.react(postId, key)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions, myReactions } : p))
    } catch { await loadPosts() }
  }, [])

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'var(--f-mono)', color:'var(--accent)', fontSize:13, letterSpacing:'0.2em' }}>
        F3XYKEE · INITIALIZING...
      </div>
    )
  }

  return (
    <>
      {!booted && <BootScreen onDone={() => setBooted(true)}/>}

      {page === 'IDX' && (
        <PageHome
          session={session}
          posts={posts}
          onPost={handlePost}
          onDeletePost={handleDeletePost}
          onReactPost={handleReact}
          onNavigate={navigate}
          tweaksOpen={tweaksOpen}
          onTweaksClose={() => setTweaksOpen(false)}
          userCount={userCount}
          onlineCount={onlineCount}
        />
      )}

      {page === 'AUTH' && (
        <PageAuth
          onLogin={handleLogin}
          onRegister={handleRegister}
          onNavigate={navigate}
        />
      )}

      {page === 'PRF' && (
        <PageProfile
          session={session}
          username={profileUser}
          onNavigate={navigate}
          allUsers={allUsers}
        />
      )}

      {page === 'CTL' && (session?.role === 'superadmin' || session?.role === 'admin') && (
        <PageAdmin
          session={session}
          onNavigate={navigate}
          onLogout={handleLogout}
        />
      )}
    </>
  )
}
