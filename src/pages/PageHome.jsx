import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { TopBar, Nav, Footer, Chip, Meta, Panel, Heading, Avatar, LiveTicks, DataStream, LangPicker, TweaksPanel, useLang, t } from '../design/Shell.jsx'
import YouTubePlayer from '../posts/YouTubePlayer.jsx'
import { postsApi, commentsApi } from '../api.js'
import { toast } from '../effects.js'

// ─── 3D Cube ─────────────────────────────────────────────────────────────────
function HeroCube() {
  const [rotX, setRotX] = useState(-22)
  const [rotY, setRotY] = useState(35)
  const dragRef = useRef(null)
  const autoRef = useRef(null)

  useEffect(() => {
    autoRef.current = setInterval(() => setRotY(y => y + 0.25), 20)
    return () => clearInterval(autoRef.current)
  }, [])

  useEffect(() => {
    const onMove = (e) => {
      if (!dragRef.current) return
      const dx = e.clientX - dragRef.current.sx
      const dy = e.clientY - dragRef.current.sy
      setRotY(dragRef.current.ry + dx * 0.7)
      setRotX(dragRef.current.rx - dy * 0.7)
    }
    const onUp = () => {
      if (!dragRef.current) return
      dragRef.current = null
      autoRef.current = setInterval(() => setRotY(y => y + 0.25), 20)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  const onMouseDown = (e) => {
    clearInterval(autoRef.current)
    dragRef.current = { sx: e.clientX, sy: e.clientY, rx: rotX, ry: rotY }
    e.preventDefault()
  }

  const S = 88
  const faces = [
    { tr:`rotateY(0deg) translateZ(${S/2}px)`,   label:'F3X' },
    { tr:`rotateY(180deg) translateZ(${S/2}px)`,  label:'YKE' },
    { tr:`rotateY(90deg) translateZ(${S/2}px)`,   label:'◢' },
    { tr:`rotateY(-90deg) translateZ(${S/2}px)`,  label:'◣' },
    { tr:`rotateX(90deg) translateZ(${S/2}px)`,   label:'▲' },
    { tr:`rotateX(-90deg) translateZ(${S/2}px)`,  label:'▼' },
  ]
  return (
    <div onMouseDown={onMouseDown}
      title="Fogd meg és forgasd · Grab to rotate"
      style={{ cursor:'grab', userSelect:'none', width:S, height:S, perspective:300, filter:'drop-shadow(0 0 12px rgba(24,233,104,0.35))', flexShrink:0 }}>
      <div style={{ width:S, height:S, position:'relative', transformStyle:'preserve-3d', transform:`rotateX(${rotX}deg) rotateY(${rotY}deg)` }}>
        {faces.map((f,fi) => (
          <div key={fi} style={{ position:'absolute', width:S, height:S, transform:f.tr,
            border:'1px solid var(--accent)', background:'rgba(24,233,104,0.04)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontFamily:'var(--f-sys)', color:'var(--accent)', fontSize:fi<2?12:18,
            letterSpacing:'0.12em', boxShadow:'inset 0 0 24px rgba(24,233,104,0.08)' }}>
            <div style={{position:'absolute',top:3,left:3,width:8,height:8,borderTop:'1px solid var(--accent)',borderLeft:'1px solid var(--accent)'}}/>
            <div style={{position:'absolute',top:3,right:3,width:8,height:8,borderTop:'1px solid var(--accent)',borderRight:'1px solid var(--accent)'}}/>
            <div style={{position:'absolute',bottom:3,left:3,width:8,height:8,borderBottom:'1px solid var(--accent)',borderLeft:'1px solid var(--accent)'}}/>
            <div style={{position:'absolute',bottom:3,right:3,width:8,height:8,borderBottom:'1px solid var(--accent)',borderRight:'1px solid var(--accent)'}}/>
            <span>{f.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── User status card ─────────────────────────────────────────────────────────
function UserCard({ session, postCount, userCount, onlineCount }) {
  useLang()
  const name = session?.username?.toUpperCase() || 'VENDÉG'
  const id = session ? `F3X-${String(session.id).padStart(3,'0')}` : 'F3X-000'
  return (
    <Panel tag={t('card.tag')} title={t('card.title')} className="panel-raised">
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ display:'grid', gridTemplateColumns:'64px 1fr', gap:12, alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border-1)' }}>
          <div style={{ width:64, height:64, background:'var(--bg-2)', border:'1px solid var(--accent)', position:'relative', boxShadow:'var(--accent-glow)' }}>
            <Avatar id={id} size={64}/>
            {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
              <div key={v+h} style={{ position:'absolute', [v]:-1, [h]:-1, width:8, height:8,
                [`border${v.charAt(0).toUpperCase()+v.slice(1)}`]:'1px solid var(--accent)',
                [`border${h.charAt(0).toUpperCase()+h.slice(1)}`]:'1px solid var(--accent)' }}/>
            ))}
          </div>
          <div>
            <div className="head" style={{ fontSize:22, lineHeight:1 }}>{name}</div>
            <div className="sys muted" style={{ marginTop:4 }}>{id} · {session ? (session.role === 'superadmin' ? 'LVL-05' : session.role === 'admin' ? 'LVL-04' : 'LVL-02') : 'VENDÉG'}</div>
            <div style={{ display:'flex', gap:6, marginTop:8 }}>
              <span className="dot"/><span className="mono" style={{ fontSize:11, color:'var(--accent)' }}>{session ? t('card.status') : 'OFFLINE'}</span>
            </div>
          </div>
        </div>
        <Meta k={t('card.users')} v={`${userCount} ${t('card.users_v')} · ${onlineCount} ${t('card.online')}`}/>
        <Meta k={t('card.posts')} v={`${postCount} ${t('card.posts_v')}`}/>
        <div style={{ borderTop:'1px solid var(--border-1)', paddingTop:10, marginTop:4 }}>
          <div className="sys muted" style={{ marginBottom:6 }}>{t('card.uplink')}</div>
          <div style={{ height:32 }}><LiveTicks count={28} height={32}/></div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginTop:4 }}>
          {[['PING','18ms'],['THRPUT','128kB/s'],['LOSS','0.01%']].map(([k,v]) => (
            <div key={k} className="panel" style={{ padding:'6px 8px', background:'transparent' }}>
              <div className="sys muted" style={{fontSize:9}}>{k}</div>
              <div className="mono" style={{ fontSize:13, color:'var(--accent)' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ session, onNavigate, postCount, userCount, onlineCount }) {
  useLang()
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr auto 380px', gap:28, padding:'40px 0 28px', borderBottom:'1px solid var(--border-1)', alignItems:'start' }}>
      <div>
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <Chip kind="solid" dot>ONLINE</Chip>
          <Chip>{t('hero.cycle')}</Chip>
          <Chip kind="cyan">{t('hero.uplink')}</Chip>
          <Chip kind="dash">{t('hero.ver')}</Chip>
        </div>
        <h1 className="display" style={{ margin:0, fontSize:76, lineHeight:0.92, letterSpacing:'-0.02em', color:'var(--ink-0)' }}>
          {t('hero.t1')}<br/>
          <span style={{ color:'var(--accent)', textShadow:'0 0 12px rgba(24,233,104,0.35)' }}>{t('hero.t2')}</span><br/>
          {t('hero.t3')}
        </h1>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24, marginTop:28, maxWidth:680 }}>
          <div className="muted" style={{ fontSize:13, lineHeight:1.55 }}>{t('hero.desc')}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', gap:8 }}>
              {session
                ? <button className="btn btn-primary" onClick={() => onNavigate?.('PRF')}>◉ {session.username.toUpperCase()}</button>
                : <button className="btn btn-primary" onClick={() => onNavigate?.('AUTH')}>{t('hero.btn1')}</button>
              }
              <button className="btn" onClick={() => document.querySelector('#feed')?.scrollIntoView({behavior:'smooth'})}>{t('hero.btn2')}</button>
            </div>
            <div className="sys muted">{t('hero.or')}</div>
          </div>
        </div>
        <LangPicker/>
      </div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', paddingTop:60 }}>
        <HeroCube/>
      </div>
      <UserCard session={session} postCount={postCount} userCount={userCount} onlineCount={onlineCount}/>
    </div>
  )
}

// ─── Post composer ────────────────────────────────────────────────────────────
function PostComposer({ session, onPost }) {
  useLang()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState(0)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [ytUrl, setYtUrl] = useState('')
  const [imgFile, setImgFile] = useState(null)
  const [tags, setTags] = useState([])
  const [newTag, setNewTag] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef(null)

  const canPost = session?.role === 'admin' || session?.role === 'superadmin' || session?.can_post
  if (!canPost) return null

  const KINDS = t('post.kinds')

  const handleSubmit = async () => {
    if (!title.trim()) return toast('Adj meg egy címet', 'err')
    setSubmitting(true)
    try {
      let content = body
      let embed_url = null
      let type = ['text','image','youtube'][kind]
      if (kind === 2) { embed_url = ytUrl; content = body }
      const data = { title, content, type, embed_url, tags: tags.join(',') }
      if (kind === 1 && imgFile) {
        const fd = new FormData(); fd.append('file', imgFile)
        const resp = await fetch('/api/upload', { method:'POST', body:fd })
        const j = await resp.json()
        if (j.url) data.image_url = j.url
      }
      await onPost?.(data)
      setTitle(''); setBody(''); setYtUrl(''); setImgFile(null); setTags([]); setOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Panel tag={t('post.tag')} title={t('post.title')}
      chips={<>
        <Chip kind="accent" dot>{t('post.auth')}</Chip>
        <span onClick={() => setOpen(o => !o)} style={{ cursor:'pointer', color:'var(--ink-2)', fontFamily:'var(--f-sys)', fontSize:10, letterSpacing:'0.15em', padding:'2px 6px', border:'1px solid var(--border-1)' }}>
          {open ? t('post.close') : t('post.open')}
        </span>
      </>}
      style={{ marginBottom:28 }}>
      {open && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 240px', gap:16 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div style={{ display:'flex', gap:8 }}>
              {KINDS.map((k, i) => (
                <Chip key={k} kind={kind===i?'accent':'default'}
                  onClick={() => { setKind(i); setYtUrl('') }}
                  style={{cursor:'pointer'}}>{k}</Chip>
              ))}
            </div>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)}
              placeholder={t('post.title_ph')}
              style={{ fontFamily:'var(--f-head)', fontSize:18, textTransform:'uppercase' }}/>
            {kind === 0 && (
              <textarea className="input" value={body} onChange={e => setBody(e.target.value)}
                rows={5} placeholder={t('post.body_ph')}
                style={{ fontFamily:'var(--f-body)', fontSize:14, resize:'vertical' }}/>
            )}
            {kind === 1 && (
              <div>
                <div className="fig-ph" style={{ height:80, cursor:'pointer' }} onClick={() => fileRef.current?.click()}>
                  <span className="label">{imgFile ? imgFile.name : (t('lang')==='en' ? '◢ CLICK TO UPLOAD IMAGE' : '◢ KÉP FELTÖLTÉSE · kattints')}</span>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e => setImgFile(e.target.files[0])}/>
                <textarea className="input" value={body} onChange={e => setBody(e.target.value)}
                  rows={2} placeholder={t('post.body_ph')}
                  style={{ fontFamily:'var(--f-body)', fontSize:13, resize:'vertical', marginTop:8 }}/>
              </div>
            )}
            {kind === 2 && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div className="sys muted" style={{fontSize:10,letterSpacing:'0.2em'}}>◢ YOUTUBE URL</div>
                <input className="input" value={ytUrl} onChange={e => setYtUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  style={{ fontFamily:'var(--f-mono)', fontSize:13 }}/>
                <textarea className="input" value={body} onChange={e => setBody(e.target.value)}
                  rows={2} placeholder={t('post.body_ph')}
                  style={{ fontFamily:'var(--f-body)', fontSize:13, resize:'vertical' }}/>
              </div>
            )}
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', alignItems:'center', paddingTop:8, borderTop:'1px dashed var(--border-1)' }}>
              <span className="sys muted">{t('post.tags')}</span>
              {tags.map(s => (
                <Chip key={s} kind="cyan" onClick={() => setTags(ts => ts.filter(x => x !== s))} style={{cursor:'pointer'}}>{s} ✕</Chip>
              ))}
              <div style={{ display:'flex', gap:4 }}>
                <input className="input" value={newTag} onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter' && newTag.trim()) { setTags(ts=>[...ts, newTag.trim()]); setNewTag('') }}}
                  placeholder="+ tag" style={{ width:80, padding:'2px 6px', fontSize:11 }}/>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <div className="sys muted">{t('post.meta')}</div>
            <Meta k={t('post.type')} v={KINDS[kind]}/>
            <Meta k={t('post.visibility')} v={t('post.vis_v')}/>
            <Meta k={t('post.access')} v={t('post.access_v')}/>
            <div style={{ display:'flex', gap:8, marginTop:8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>{t('post.draft')}</button>
            </div>
            <button className="btn btn-primary" style={{ justifyContent:'center' }}
              disabled={submitting} onClick={handleSubmit}>
              {submitting ? '...' : t('post.publish')}
            </button>
          </div>
        </div>
      )}
    </Panel>
  )
}

// ─── Comment composer ─────────────────────────────────────────────────────────
function CommentComposer({ postId, session, onSubmit }) {
  const lang = useLang()
  const [text, setText] = useState('')
  const [imgSrc, setImgSrc] = useState(null)
  const fileRef = useRef(null)
  const L = lang === 'en'

  const handleFile = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setImgSrc(ev.target.result)
    reader.readAsDataURL(file)
  }
  const handleSubmit = async () => {
    if (!text.trim() && !imgSrc) return
    await onSubmit?.({ postId, text, imgSrc })
    setText(''); setImgSrc(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ padding:'8px 18px 10px', borderTop:'1px solid var(--border-0)', background:'rgba(0,0,0,0.12)' }}>
      <div style={{ display:'grid', gridTemplateColumns:'26px 1fr', gap:8, alignItems:'start' }}>
        <Avatar id={session ? `F3X-${String(session.id).padStart(3,'0')}` : 'F3X-000'} size={22}/>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <textarea className="input" value={text} onChange={e => setText(e.target.value)} rows={2}
            placeholder={L ? '// Leave a comment…' : '// Hagyj kommentet…'}
            style={{ fontFamily:'var(--f-body)', fontSize:12, resize:'none' }}/>
          {imgSrc && (
            <div style={{ position:'relative', display:'inline-block', maxWidth:140 }}>
              <img src={imgSrc} alt="preview" style={{ maxWidth:140, border:'1px solid var(--accent)', display:'block' }}/>
              <span onClick={() => setImgSrc(null)}
                style={{ position:'absolute', top:2, right:2, cursor:'pointer', background:'rgba(0,0,0,0.75)', color:'var(--accent)', fontSize:9, padding:'1px 4px' }}>✕</span>
            </div>
          )}
          <div style={{ display:'flex', gap:6, alignItems:'center' }}>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFile}/>
            <button className="btn btn-ghost btn-sm" style={{fontSize:10}} onClick={() => fileRef.current?.click()}>
              ◢ {L ? 'ATTACH IMAGE' : 'KÉP CSATOLÁSA'}
            </button>
            <span style={{flex:1}}/>
            <button className="btn btn-primary btn-sm" style={{fontSize:10}} onClick={handleSubmit}>
              ◢ {L ? 'SEND' : 'KÜLD'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Post card ────────────────────────────────────────────────────────────────
const SHOW_N = 2

function PostCard({ post, index, session, onDelete, onReact }) {
  const lang = useLang()
  const L = lang === 'en'
  const [comments, setComments] = useState([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [localComments, setLocalComments] = useState([])

  const allComments = [...comments, ...localComments]
  const visible = expanded ? allComments : allComments.slice(0, SHOW_N)

  const loadComments = useCallback(async () => {
    if (commentsLoaded) return
    try {
      const data = await commentsApi.list(post.id)
      setComments(data)
      setCommentsLoaded(true)
    } catch {}
  }, [post.id, commentsLoaded])

  useEffect(() => { loadComments() }, [])

  const handleComment = async ({ postId, text }) => {
    if (!session) return toast('Belépés szükséges', 'err')
    try {
      const c = await commentsApi.add(postId, text)
      if (c) {
        setLocalComments(prev => [...prev, { ...c, author: session.username }])
        setExpanded(true)
      }
    } catch (e) { toast(e.message, 'err') }
  }

  const handleLike = () => {
    if (!session) return toast('Belépés szükséges', 'err')
    onReact?.(post.id, '❤️')
  }

  const isAdmin = session?.role === 'admin' || session?.role === 'superadmin'
  const canDelete = isAdmin || session?.id === post.user_id

  const kindLabel = post.type === 'youtube' ? (L ? 'VIDEO' : 'VIDEÓ') : post.type === 'image' ? (L ? 'IMAGE' : 'KÉP') : (L ? 'TEXT' : 'SZÖVEG')
  const postDate = post.createdAt ? new Date(post.createdAt * 1000) : new Date()
  const timeStr = String(postDate.getHours()).padStart(2,'0') + ':' + String(postDate.getMinutes()).padStart(2,'0')
  const likes = post.reactions?.['❤️'] || 0

  return (
    <div className="panel" style={{ padding:0, marginBottom:14, background:'var(--panel)', cursor:'default' }}>
      <div style={{ display:'grid', gridTemplateColumns:'120px 1fr 260px' }}>
        {/* gutter */}
        <div style={{ padding:'14px 12px', borderRight:'1px solid var(--border-1)', display:'flex', flexDirection:'column', gap:6, background:'rgba(0,0,0,0.2)' }}>
          <Chip kind={post.pinned ? 'solid' : 'accent'}>#{post.id}</Chip>
          <div className="mono muted" style={{ fontSize:10, lineHeight:1.5 }}>
            {timeStr} UTC<br/>◢ {post.author?.toUpperCase() || '—'}
          </div>
          <div style={{flex:1}}/>
          {canDelete && (
            <span className="sys" style={{ fontSize:9, color:'var(--red)', cursor:'pointer' }}
              onClick={() => onDelete?.(post.id)}>✕ DEL</span>
          )}
        </div>

        {/* content */}
        <div style={{ padding:'16px 18px', display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
            <Chip kind="accent">{kindLabel}</Chip>
            {post.tags?.split(',').filter(Boolean).map(s => (
              <Chip key={s} kind="dash">{s.trim()}</Chip>
            ))}
            <Chip kind="cyan">◢ {post.author?.toUpperCase() || '—'}</Chip>
            {post.pinned && <Chip kind="solid" dot>{L?'PINNED':'KITŰZÖTT'}</Chip>}
          </div>
          <h3 className="head" style={{ margin:0, fontSize:22, lineHeight:1.1, color:'var(--ink-0)' }}>
            {post.title}
          </h3>
          {post.content && (
            <p style={{ margin:0, color:'var(--ink-1)', maxWidth:720, fontSize:13, lineHeight:1.6 }}>
              {post.content}
            </p>
          )}

          {/* YouTube embed */}
          {post.type === 'youtube' && post.embed_url && (
            <div style={{ marginTop:4, maxWidth:520 }}>
              <YouTubePlayer src={post.embed_url}/>
            </div>
          )}

          {/* Image */}
          {post.type === 'image' && post.image_url && (
            <img src={post.image_url} alt={post.title}
              style={{ maxWidth:520, border:'1px solid var(--border-1)', display:'block', marginTop:4 }}/>
          )}

          {/* Stats */}
          <div style={{ display:'flex', gap:18, alignItems:'center', paddingTop:8, borderTop:'1px dashed var(--border-1)', marginTop:4 }}>
            <span className="sys muted">▸ {allComments.length || post.commentCount || 0} {t('feed.comments')}</span>
            <span className="sys muted" style={{ cursor:'pointer' }} onClick={handleLike}>⟡ {likes} {t('feed.likes')}</span>
          </div>
        </div>

        {/* aside */}
        <div style={{ borderLeft:'1px solid var(--border-1)', padding:'14px 12px', display:'flex', flexDirection:'column', gap:10, background:'rgba(0,0,0,0.15)' }}>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            <div className="sys muted">◢ HASH</div>
            <div className="mono" style={{ fontSize:10, color:'var(--cyan)' }}>
              {post.id.toString(16).padStart(2,'0')}·{(post.user_id||0).toString(16).padStart(2,'0')}·ff·c4
            </div>
            <div className="sys muted" style={{ marginTop:6 }}>◢ {L?'ENGAGEMENT':'OLVASOTTSÁG'}</div>
            <div className="bar-track">
              <div className="bar-fill" style={{ width:`${Math.min(100, 30 + likes * 3 + (post.commentCount||0)*5)}%` }}/>
            </div>
          </div>
          <div style={{flex:1}}/>
          <div className="sys muted" style={{ borderTop:'1px solid var(--border-1)', paddingTop:8, display:'flex', justifyContent:'space-between' }}>
            <span>◢ IDX {String(post.id).padStart(4,'0')}</span>
            <span>◣ V.1</span>
          </div>
        </div>
      </div>

      {/* Comments section */}
      {(allComments.length > 0 || post.commentCount > 0) && (
        <div style={{ borderTop:'1px solid var(--border-1)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 18px', background:'rgba(0,0,0,0.18)', borderBottom:'1px solid var(--border-0)' }}>
            <span className="sys muted" style={{fontSize:10}}>▸ {allComments.length || post.commentCount || 0} {t('feed.comments')}</span>
            <div style={{flex:1}}/>
          </div>
          <div style={{ padding:'8px 18px 10px', display:'flex', flexDirection:'column', gap:4, background:'rgba(0,0,0,0.1)' }}>
            {visible.map((c, ci) => (
              <div key={c.id || ci} style={{ display:'grid', gridTemplateColumns:'26px 1fr', gap:8, padding:'5px 0', borderBottom: ci < visible.length-1 ? '1px solid var(--border-0)':'none' }}>
                <Avatar id={`F3X-${String(c.user_id||0).padStart(3,'0')}`} size={22}/>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
                    <span className="head" style={{fontSize:11}}>{(c.author||c.username||'USER').toUpperCase()}</span>
                    <span className="sys muted" style={{fontSize:9}}>
                      {c.createdAt ? new Date(c.createdAt*1000).toLocaleTimeString('hu',{hour:'2-digit',minute:'2-digit'}) : c.time || ''} UTC
                    </span>
                  </div>
                  <div style={{ color:'var(--ink-1)', fontSize:12, lineHeight:1.5 }}>{c.text || c.content}</div>
                </div>
              </div>
            ))}
            {!expanded && allComments.length > SHOW_N && (
              <button onClick={() => setExpanded(true)} className="btn btn-ghost btn-sm" style={{ alignSelf:'flex-start', marginTop:4, fontSize:10 }}>
                ▸ +{allComments.length - SHOW_N} {L ? 'more comments' : 'további komment'}
              </button>
            )}
            {expanded && allComments.length > SHOW_N && (
              <button onClick={() => setExpanded(false)} className="btn btn-ghost btn-sm" style={{ alignSelf:'flex-start', marginTop:4, fontSize:10 }}>
                ▲ {L ? 'LESS' : 'KEVESEBB'}
              </button>
            )}
          </div>
          {session && (
            <CommentComposer postId={post.id} session={session} onSubmit={handleComment}/>
          )}
        </div>
      )}
      {session && !post.commentCount && allComments.length === 0 && (
        <CommentComposer postId={post.id} session={session} onSubmit={handleComment}/>
      )}
    </div>
  )
}

// ─── Page Home ────────────────────────────────────────────────────────────────
export default function PageHome({ session, posts, onPost, onDeletePost, onReactPost, onNavigate, tweaksOpen, onTweaksClose, userCount = 0, onlineCount = 0 }) {
  const lang = useLang()

  return (
    <div className="page">
      <div className="scanline-sweep" id="scan-sweep"/>
      <DataStream side="left"/>
      <DataStream side="right"/>
      <TopBar user={session ? session.username.toUpperCase() : null}/>
      <Nav active="IDX" onNavigate={onNavigate}/>

      <div className="shell">
        <Hero session={session} onNavigate={onNavigate} postCount={posts.length} userCount={userCount} onlineCount={onlineCount}/>

        <div style={{ padding:'28px 0 0' }} id="feed">
          <PostComposer session={session} onPost={onPost}/>
          <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:18 }}>
            <Heading tag={t('feed.tag')} title={t('feed.title')} sub={t('feed.sub')}/>
            <div style={{ display:'flex', gap:6 }}>
              <Chip kind="accent">{t('feed.latest')}</Chip>
              <Chip>{t('feed.tag_f')}</Chip>
              <Chip kind="dash">{t('feed.filter')}</Chip>
            </div>
          </div>

          <div>
            {posts.length === 0 && (
              <div className="panel" style={{ padding:32, textAlign:'center', color:'var(--ink-3)', fontFamily:'var(--f-sys)', letterSpacing:'0.2em' }}>
                // ÜRES FEED — MÉG NINCS POSZT
              </div>
            )}
            {posts.map((p, i) => (
              <PostCard key={p.id} post={p} index={i} session={session}
                onDelete={onDeletePost} onReact={onReactPost}/>
            ))}
          </div>

          <div className="panel" style={{ padding:14, textAlign:'center', borderStyle:'dashed', marginTop:10, color:'var(--ink-2)', fontFamily:'var(--f-sys)', fontSize:11, letterSpacing:'0.2em' }}>
            {t('feed.next')}
          </div>
        </div>
      </div>

      <Footer index="001 / 004"/>

      {/* Courage dancing dog */}
      <img
        src="https://media1.tenor.com/m/9jgh1v5I1_cAAAAd/courage-the-cowardly-dog-dancing.gif"
        alt="Courage"
        style={{ position:'fixed', bottom:0, right:24, height:200, width:'auto', mixBlendMode:'screen', opacity:0.85, pointerEvents:'none', zIndex:400, imageRendering:'pixelated' }}
        onError={e => { e.target.style.display='none' }}
      />

      <TweaksPanel open={tweaksOpen} onClose={onTweaksClose}/>
    </div>
  )
}
