import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { CATEGORIES } from './data.js'
import { installKonami, konamiCelebrate, toast } from './effects.js'
import Sidebar from './components/Sidebar.jsx'
import VisitorCounter from './components/VisitorCounter.jsx'
import AuthModal from './components/AuthModal.jsx'
import MusicPlayer from './components/MusicPlayer.jsx'
import TweaksPanel, { ACCENTS } from './components/TweaksPanel.jsx'
import PostCard from './posts/PostCard.jsx'
import Composer from './posts/Composer.jsx'
import SuperAdmin from './SuperAdmin.jsx'
import TiszaIntro from './components/TiszaIntro.jsx'
import ProfilePage from './components/ProfilePage.jsx'
import {
  setAccessToken, clearAccessToken, setUnauthCallback,
  tryRestoreSession, authApi, postsApi, commentsApi,
} from './api.js'


const TWEAK_DEFAULTS = { accent: 'acid', font: 'mono', bg: 'grain', cursor: 'trail', layout: 'feed', crtBoot: true }

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null)       // { id, username, role }
  const [posts, setPosts] = useState([])
  const [postOrder, setPostOrder] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [authOpen, setAuthOpen] = useState(false)
  const [authTab, setAuthTab] = useState('login')
  const [authPreset, setAuthPreset] = useState(null)
  const [tweaksOpen, setTweaksOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [dragId, setDragId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [superadminOpen, setSuperadminOpen] = useState(false)
  const [profileUser, setProfileUser] = useState(null)
  const feedRef = useRef(null)

  const [tweaks, setTweaks] = useState(() => {
    const raw = localStorage.getItem('f3xykee_tweaks_v1')
    return raw ? { ...TWEAK_DEFAULTS, ...JSON.parse(raw) } : TWEAK_DEFAULTS
  })

  // ── Apply tweaks to DOM ───────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('f3xykee_tweaks_v1', JSON.stringify(tweaks))
    const body = document.body
    body.dataset.bg = tweaks.bg || 'scanlines'
    body.dataset.font = tweaks.font || 'mono'
    body.dataset.cursor = tweaks.cursor || 'custom'
    body.classList.toggle('cursor-custom', tweaks.cursor === 'custom')
    body.classList.toggle('cursor-trail', tweaks.cursor === 'trail')
    const accent = ACCENTS.find(a => a.key === (tweaks.accent || 'acid'))
    if (accent) {
      document.documentElement.style.setProperty('--accent', accent.hex)
      document.documentElement.style.setProperty('--accent-rgb', accent.rgb)
      document.documentElement.style.setProperty('--accent-glow', `rgba(${accent.rgb}, 0.55)`)
    }
  }, [tweaks])

  // ── Restore session + load posts on mount ─────────────────────────────────
  useEffect(() => {
    setUnauthCallback(() => {
      setSession(null)
      toast('Lejárt a munkamenet. Kérjük, lépj be újra.', 'err')
    })

    async function init() {
      const result = await tryRestoreSession()
      if (result?.user) setSession(result.user)
      await loadPosts()
      setLoading(false)
    }
    init()

    installKonami(() => { konamiCelebrate(); toast('↑↑↓↓←→←→BA — acid mode') })

    const saveScroll = () => sessionStorage.setItem('f3xykee_scrollY', String(window.scrollY))
    window.addEventListener('beforeunload', saveScroll)

    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true)
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false)
    }
    window.addEventListener('message', handler)
    try { window.parent?.postMessage({ type: '__edit_mode_available' }, window.location.origin) } catch {}
    return () => {
      window.removeEventListener('beforeunload', saveScroll)
      window.removeEventListener('message', handler)
    }
  }, [])

  // Restore scroll position after posts are loaded
  useEffect(() => {
    if (loading) return
    const savedY = sessionStorage.getItem('f3xykee_scrollY')
    if (savedY) {
      sessionStorage.removeItem('f3xykee_scrollY')
      setTimeout(() => window.scrollTo(0, parseInt(savedY)), 150)
    }
  }, [loading])

  // Re-fetch posts when session changes (to get updated myReactions)
  useEffect(() => {
    if (!loading) loadPosts()
  }, [session?.id])

  async function loadPosts() {
    try {
      const data = await postsApi.list()
      // Extract order from returned data (already sorted by backend)
      setPosts(data)
      setPostOrder(data.map(p => p.id))
    } catch (e) {
      console.error('Failed to load posts', e)
    }
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const openAuth = useCallback((mode) => {
    if (mode === 'admin') { setAuthTab('login'); setAuthPreset('admin') }
    else { setAuthTab(mode); setAuthPreset(null) }
    setAuthOpen(true)
  }, [])

  const handleLogin = useCallback(async ({ username, password }) => {
    try {
      const { user, accessToken } = await authApi.login(username, password)
      setAccessToken(accessToken)
      setSession(user)
      setAuthOpen(false)
      toast(`BELÉPTÉL — @${user.username}`)
      if (user.role === 'superadmin') toast('Superadmin munkamenet aktív.')
      return true
    } catch (e) {
      return e.message
    }
  }, [])

  const handleRegister = useCallback(async ({ username, password }) => {
    try {
      const { user, accessToken } = await authApi.register(username, password)
      setAccessToken(accessToken)
      setSession(user)
      setAuthOpen(false)
      toast(`REGISZTRÁCIÓ SIKERES — @${user.username}`)
      return true
    } catch (e) {
      return e.message
    }
  }, [])

  const handleLogout = useCallback(async () => {
    try { await authApi.logout() } catch {}
    clearAccessToken()
    setSession(null)
    toast('KILÉPTÉL')
  }, [])

  // ── Posts ─────────────────────────────────────────────────────────────────
  const addPost = useCallback(async (postData) => {
    try {
      const post = await postsApi.create(postData)
      setPosts(prev => [post, ...prev])
      setPostOrder(prev => [post.id, ...prev])
      toast('POSZT KIADVA')
    } catch (e) {
      toast(e.message, 'err')
    }
  }, [])

  const deletePost = useCallback(async (id) => {
    if (!confirm('Biztos törlöd ezt a posztot?')) return
    try {
      await postsApi.delete(id)
      setPosts(prev => prev.filter(p => p.id !== id))
      setPostOrder(prev => prev.filter(x => x !== id))
      toast('POSZT TÖRÖLVE')
    } catch (e) {
      toast(e.message, 'err')
    }
  }, [])

  const reactPost = useCallback(async (postId, key) => {
    // Optimistic update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p
      const had = p.myReactions?.includes(key)
      const reactions = { ...p.reactions, [key]: Math.max(0, (p.reactions[key] || 0) + (had ? -1 : 1)) }
      const myReactions = had ? p.myReactions.filter(k => k !== key) : [...(p.myReactions || []), key]
      return { ...p, reactions, myReactions }
    }))
    try {
      const { reactions, myReactions } = await postsApi.react(postId, key)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions, myReactions } : p))
    } catch (e) {
      await loadPosts() // rollback on error
      toast(e.message, 'err')
    }
  }, [])

  // ── Comments ──────────────────────────────────────────────────────────────
  const addComment = useCallback(async (postId, text) => {
    try {
      const comment = await commentsApi.add(postId, text)
      setPosts(prev => prev.map(p => p.id === postId
        ? { ...p, commentCount: (p.commentCount || 0) + 1, _newComment: comment }
        : p))
      return comment
    } catch (e) {
      toast(e.message, 'err')
      return null
    }
  }, [])

  const replyComment = useCallback(async (commentId, text) => {
    try {
      return await commentsApi.reply(commentId, text)
    } catch (e) {
      toast(e.message, 'err')
      return null
    }
  }, [])

  const deleteComment = useCallback(async (postId, commentId) => {
    if (!confirm('Komment törlése?')) return false
    try {
      await commentsApi.delete(commentId)
      setPosts(prev => prev.map(p => p.id === postId
        ? { ...p, commentCount: Math.max(0, (p.commentCount || 1) - 1) }
        : p))
      return true
    } catch (e) {
      toast(e.message, 'err')
      return false
    }
  }, [])

  const pinPost = useCallback(async (id, pinned) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, pinned } : p))
    try {
      await postsApi.pin(id, pinned)
      toast(pinned ? '📌 Kitűzve' : 'Kitűző eltávolítva')
    } catch (e) {
      setPosts(prev => prev.map(p => p.id === id ? { ...p, pinned: !pinned } : p))
      toast(e.message, 'err')
    }
  }, [])

  const reactComment = useCallback(async (commentId, emoji) => {
    try {
      return await commentsApi.react(commentId, emoji)
    } catch (e) {
      toast(e.message, 'err')
      return null
    }
  }, [])

  // ── Drag-and-drop reorder ─────────────────────────────────────────────────
  const onDragStart = useCallback((e, id) => {
    setDragId(id)
    e.dataTransfer.effectAllowed = 'move'
    try { e.dataTransfer.setData('text/plain', id) } catch {}
  }, [])

  const onDragOver = useCallback((e, id) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverId(id)
  }, [])

  const onDrop = useCallback(async (e, targetId) => {
    e.preventDefault()
    const from = dragId
    setDragId(null); setDragOverId(null)
    if (!from || from === targetId) return

    setPosts(prev => {
      const arr = [...prev]
      const fi = arr.findIndex(p => p.id === from)
      const ti = arr.findIndex(p => p.id === targetId)
      if (fi < 0 || ti < 0) return prev
      const [item] = arr.splice(fi, 1)
      arr.splice(ti, 0, item)
      return arr
    })
    setPostOrder(prev => {
      const arr = [...prev]
      const fi = arr.indexOf(from), ti = arr.indexOf(targetId)
      if (fi < 0 || ti < 0) return prev
      arr.splice(fi, 1); arr.splice(ti, 0, from)
      return arr
    })

    try {
      await postsApi.reorder(postOrder.map(id => {
        const fi = postOrder.indexOf(from), ti = postOrder.indexOf(targetId)
        const arr = [...postOrder]
        arr.splice(fi, 1); arr.splice(ti, 0, from)
        return arr
      }).flat().filter((v, i, a) => a.indexOf(v) === i))
      toast('SORREND FRISSÍTVE')
    } catch {}
  }, [dragId, postOrder])

  useEffect(() => {
    const cancel = () => { setDragId(null); setDragOverId(null) }
    window.addEventListener('dragend', cancel)
    return () => window.removeEventListener('dragend', cancel)
  }, [])

  // ── Category switch with animation ────────────────────────────────────────
  const handleCategory = useCallback((id) => {
    if (id === activeCategory) return
    setSwitching(true)
    setTimeout(() => {
      setActiveCategory(id)
      setSwitching(false)
      if (feedRef.current) {
        feedRef.current.classList.remove('settling')
        void feedRef.current.offsetWidth
        feedRef.current.classList.add('settling')
      }
    }, 160)
  }, [activeCategory])

  // ── Filtered + ordered posts ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const arr = activeCategory === 'all' ? posts : posts.filter(p => p.category === activeCategory)
    return [...arr.filter(p => p.pinned), ...arr.filter(p => !p.pinned)]
  }, [posts, activeCategory])

  const counts = useMemo(() => {
    const out = { all: posts.length }
    for (const c of CATEGORIES) {
      if (c.id !== 'all') out[c.id] = posts.filter(p => p.category === c.id).length
    }
    return out
  }, [posts])

  const isAdmin = session?.role === 'admin' || session?.role === 'superadmin'
  const isSuperadmin = session?.role === 'superadmin'
  const canPost = isAdmin || !!session?.can_post
  const layoutClass = tweaks.layout === 'grid' ? 'layout-grid' : tweaks.layout === 'timeline' ? 'layout-timeline' : 'layout-feed'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 14, letterSpacing: '0.2em' }}>
      LOADING...
    </div>
  )

  if (superadminOpen && isSuperadmin) {
    return <SuperAdmin onClose={() => setSuperadminOpen(false)} session={session} onLogout={handleLogout} />
  }

  if (profileUser) {
    return (
      <div className="app">
        <Sidebar
          session={session}
          activeCategory={activeCategory}
          onCategory={(id) => { setProfileUser(null); handleCategory(id) }}
          counts={counts}
          onOpenAuth={openAuth}
          onLogout={handleLogout}
          onSuperadmin={isSuperadmin ? () => setSuperadminOpen(true) : null}
          onProfile={setProfileUser}
          userPosts={posts}
        />
        <div className="main">
          <ProfilePage
            username={profileUser}
            session={session}
            onBack={() => setProfileUser(null)}
            onProfile={setProfileUser}
            onSessionUpdate={(updates) => setSession(prev => prev ? { ...prev, ...updates } : prev)}
          />
        </div>
      </div>
    )
  }

  return (
    <>
      <TiszaIntro />
      <div className="app">
        <Sidebar
          session={session}
          activeCategory={activeCategory}
          onCategory={handleCategory}
          counts={counts}
          onOpenAuth={openAuth}
          onLogout={handleLogout}
          onSuperadmin={isSuperadmin ? () => setSuperadminOpen(true) : null}
          onProfile={setProfileUser}
          userPosts={posts}
        />

        <div className="main">
          <div className="top-bar">
            <div className="top-bar-left">
              <div className="breadcrumb">
                <span>~</span><span className="slash">/</span>
                <span>f3xykee</span><span className="slash">/</span>
                <strong>{CATEGORIES.find(c => c.id === activeCategory)?.label || 'feed'}</strong>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <VisitorCounter />
              <button className="btn btn-ghost" onClick={() => setTweaksOpen(o => !o)}>⚙ Tweaks</button>
            </div>
          </div>

          {canPost && (
            <>
              {isAdmin && (
                <div className="admin-bar">
                  <div className="admin-bar-info">
                    <span className="admin-badge">{isSuperadmin ? 'SUPERADMIN' : 'ADMIN'}</span>
                    <span>@{session.username} belépve · teljes jogosultság</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {isSuperadmin && (
                      <button className="btn btn-admin" onClick={() => setSuperadminOpen(true)}>⚡ Panel</button>
                    )}
                    <button className="btn btn-danger" onClick={handleLogout}>Kilépés</button>
                  </div>
                </div>
              )}
              <Composer onPost={addPost} />
            </>
          )}

          <div className={`feed ${layoutClass}${switching ? ' switching' : ''}`} ref={feedRef}>
            {filtered.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-title">// ÜRES_FEED</div>
                <div className="empty-state-sub">nincs poszt ebben a kategóriában — még</div>
              </div>
            )}
            {filtered.map((p, i) => (
              <PostCard
                key={p.id}
                post={p}
                index={i}
                session={session}
                onReact={reactPost}
                onComment={addComment}
                onReplyComment={replyComment}
                onReactComment={reactComment}
                onDeleteComment={deleteComment}
                onDeletePost={deletePost}
                onPin={isSuperadmin ? pinPost : null}
                onOpenAuth={openAuth}
                onProfile={setProfileUser}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                draggingId={dragId}
                dragOverId={dragOverId}
              />
            ))}
          </div>

        </div>
      </div>

      <MusicPlayer />

      <AuthModal
        open={authOpen}
        tab={authPreset === 'admin' ? 'login' : authTab}
        onClose={() => { setAuthOpen(false); setAuthPreset(null) }}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />

      <TweaksPanel
        open={tweaksOpen}
        onClose={() => setTweaksOpen(false)}
        tweaks={tweaks}
        setTweaks={setTweaks}
      />
    </>
  )
}
