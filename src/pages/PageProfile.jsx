import { useState, useRef, useEffect } from 'react'
import { TopBar, Nav, Footer, Chip, Meta, Panel, Heading, Avatar, LiveTicks, useLang, t } from '../design/Shell.jsx'
import { postsApi } from '../api.js'
import { toast } from '../effects.js'

// ─── Friend button ────────────────────────────────────────────────────────────
function FriendBtn({ L, isSelf }) {
  const [state, setState] = useState('none')
  if (isSelf) return null
  if (state === 'none') return (
    <button className="btn btn-ghost" onClick={() => setState('pending')}>
      {L ? '◢ ADD FRIEND' : '◢ BARÁT JELÖLÉS'}
    </button>
  )
  if (state === 'pending') return (
    <div style={{ display:'flex', gap:6 }}>
      <Chip kind="cyan" dot>{L ? 'REQUEST SENT' : 'KÉRÉS ELKÜLDVE'}</Chip>
      <button className="btn btn-ghost btn-sm" style={{fontSize:10}} onClick={() => setState('none')}>
        {L ? 'CANCEL' : 'VISSZAVON'}
      </button>
    </div>
  )
  return (
    <div style={{ display:'flex', gap:6 }}>
      <Chip kind="accent" dot>{L ? '◉ FRIENDS' : '◉ BARÁTOK'}</Chip>
      <button className="btn btn-ghost btn-sm" style={{fontSize:10,color:'var(--red)'}} onClick={() => setState('none')}>
        {L ? 'UNFRIEND' : 'ELTÁVOLÍT'}
      </button>
    </div>
  )
}

// ─── User search ──────────────────────────────────────────────────────────────
function UserSearch({ L, allUsers, onSelectUser }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const results = q.length > 0
    ? allUsers.filter(u => u.username.toLowerCase().includes(q.toLowerCase()) || String(u.id).includes(q))
    : []

  return (
    <Panel tag={L ? '◢ SEARCH' : '◢ KERESÉS'} title={L ? 'FIND USER' : 'FELHASZNÁLÓ KERESÉS'}>
      <div style={{ position:'relative' }}>
        <input className="input" value={q} onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={L ? '⌕ username or ID…' : '⌕ felhasználónév vagy ID…'}
          style={{ fontFamily:'var(--f-mono)', fontSize:12 }}/>
        {open && results.length > 0 && (
          <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, zIndex:50,
            background:'var(--bg-1)', border:'1px solid var(--accent)',
            boxShadow:'0 8px 24px rgba(0,0,0,0.5)', maxHeight:220, overflowY:'auto' }}>
            {results.map((u, i) => (
              <div key={u.id}
                onClick={() => { onSelectUser?.(u.username); setQ(''); setOpen(false) }}
                style={{ display:'grid', gridTemplateColumns:'28px 1fr auto', gap:8, padding:'8px 10px', cursor:'pointer', alignItems:'center', borderBottom:i<results.length-1?'1px solid var(--border-0)':'none', background:'transparent' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(24,233,104,0.07)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <Avatar id={`F3X-${String(u.id).padStart(3,'0')}`} size={24}/>
                <div>
                  <div style={{ fontSize:13, color:'var(--ink-0)' }}>{u.username}</div>
                  <div className="sys muted" style={{fontSize:9}}>F3X-{String(u.id).padStart(3,'0')}</div>
                </div>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:3 }}>
                  <Chip>{u.role === 'superadmin' ? 'LVL-05' : u.role === 'admin' ? 'LVL-04' : 'LVL-02'}</Chip>
                </div>
              </div>
            ))}
          </div>
        )}
        {open && q.length > 0 && results.length === 0 && (
          <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, right:0, background:'var(--bg-1)', border:'1px solid var(--border-1)', padding:'10px 12px', fontFamily:'var(--f-sys)', fontSize:10, color:'var(--ink-3)', letterSpacing:'0.15em' }}>
            {L ? '// NO RESULTS' : '// NINCS TALÁLAT'}
          </div>
        )}
      </div>
      <div className="sys muted" style={{fontSize:10, marginTop:6}}>
        {L ? `${allUsers.length} registered users` : `${allUsers.length} regisztrált felhasználó`}
      </div>
    </Panel>
  )
}

// ─── Page Profile ─────────────────────────────────────────────────────────────
export default function PageProfile({ session, username, onNavigate, allUsers = [] }) {
  const lang = useLang()
  const L = lang === 'en'
  const [profileUser, setProfileUser] = useState(null)
  const [userPosts, setUserPosts] = useState([])
  const [messages, setMessages] = useState([])
  const [msgText, setMsgText] = useState('')
  const [msgImg, setMsgImg] = useState(null)
  const [loading, setLoading] = useState(true)
  const msgFileRef = useRef(null)

  const displayName = username || session?.username
  const isSelf = !username || username === session?.username
  const targetUser = isSelf ? session : (allUsers.find(u => u.username === username) || null)
  const userId = targetUser?.id || session?.id
  const userIdStr = `F3X-${String(userId||0).padStart(3,'0')}`

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const posts = await postsApi.list()
        setUserPosts(posts.filter(p => p.author === displayName || p.username === displayName))
      } catch {}
      setLoading(false)
    }
    load()
  }, [displayName])

  const handleMsgFile = (e) => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setMsgImg(ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleMsgSend = () => {
    if (!msgText.trim() && !msgImg) return
    if (!session) return toast(L ? 'Sign in required' : 'Belépés szükséges', 'err')
    const now = new Date()
    const time = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} · ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    setMessages(prev => [...prev, {
      from: session.username, name: session.username.toUpperCase(),
      time, text: msgText, imgSrc: msgImg, verified: true
    }])
    setMsgText(''); setMsgImg(null)
    if (msgFileRef.current) msgFileRef.current.value = ''
  }

  const role = targetUser?.role === 'superadmin' ? 'LVL-05 · SUPERADMIN' : targetUser?.role === 'admin' ? 'LVL-04 · ADMIN' : 'LVL-02 · FELHASZNÁLÓ'

  return (
    <div className="page">
      <TopBar user={session ? session.username.toUpperCase() : null}/>
      <Nav active="PRF" onNavigate={onNavigate}/>

      <div className="shell">
        {/* HEADER */}
        <div style={{ display:'grid', gridTemplateColumns:'220px 1fr 300px', gap:28, padding:'36px 0 28px', borderBottom:'1px solid var(--border-1)', alignItems:'start' }}>
          <div>
            <div style={{ width:200, height:200, background:'var(--bg-2)', border:'1px solid var(--accent)', position:'relative', boxShadow:'var(--accent-glow)' }}>
              <Avatar id={userIdStr} size={200}/>
              {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
                <div key={v+h} style={{ position:'absolute', [v]:-1, [h]:-1, width:12, height:12,
                  [`border${v.charAt(0).toUpperCase()+v.slice(1)}`]:'1px solid var(--accent)',
                  [`border${h.charAt(0).toUpperCase()+h.slice(1)}`]:'1px solid var(--accent)' }}/>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display:'flex', gap:8, marginBottom:14 }}>
              <Chip kind="solid" dot>{userIdStr}</Chip>
              <Chip kind="accent">{role}</Chip>
              <Chip kind="cyan">ONLINE</Chip>
            </div>
            <h1 className="display" style={{ margin:0, fontSize:64, lineHeight:0.95, letterSpacing:'-0.02em' }}>
              {(displayName || 'VENDÉG').toUpperCase()}
            </h1>
            <p style={{ maxWidth:560, color:'var(--ink-1)', fontSize:14, lineHeight:1.6, marginTop:14 }}>
              {L
                ? 'I post about music, films, books and things I find worth sharing.'
                : 'Zenéről, filmekről, könyvekről és mindenről posztolok amit érdemes megosztani.'}
            </p>
            <div style={{ display:'flex', gap:8, marginTop:18 }}>
              {session && !isSelf && (
                <button className="btn btn-primary"
                  onClick={() => document.querySelector('#profile-composer')?.scrollIntoView({behavior:'smooth'})}>
                  {L ? '◢ LEAVE A MESSAGE' : '◢ ÜZENETET HAGY'}
                </button>
              )}
              {isSelf && <button className="btn">{L ? 'EDIT PROFILE' : 'PROFIL SZERKESZTÉSE'}</button>}
              <FriendBtn L={L} isSelf={isSelf}/>
            </div>
          </div>

          <Panel tag={L?'◢ STATS':'◢ STATISZTIKA'} title={L?'USER METRICS':'FELHASZNÁLÓ METRIKÁK'} className="panel-raised">
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {(L
                ? [['POSTS', String(userPosts.length)],['LIKES','—'],['THREADS','—'],['READERS','—'],['COMMENTS','—'],['MONTHS','—']]
                : [['POSZT', String(userPosts.length)],['KEDVELÉS','—'],['LÁNC','—'],['OLVASÓ','—'],['KOMMENT','—'],['HÓNAP','—']]
              ).map(([k,v]) => (
                <div key={k} className="panel" style={{ padding:'8px 10px', background:'transparent' }}>
                  <div className="sys muted">{k}</div>
                  <div className="head" style={{ fontSize:22, color:'var(--accent)' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ borderTop:'1px solid var(--border-1)', marginTop:12, paddingTop:12 }}>
              <div className="sys muted" style={{marginBottom:6}}>{L?'◢ ACTIVITY · 30 DAYS':'◢ AKTIVITÁS · 30 NAP'}</div>
              <LiveTicks count={30} height={32}/>
            </div>
          </Panel>
        </div>

        {/* MAIN */}
        <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:28, padding:'28px 0' }}>
          <aside style={{ display:'flex', flexDirection:'column', gap:18 }}>
            <UserSearch L={L} allUsers={allUsers} onSelectUser={u => onNavigate?.('PRF', u)}/>

            <Panel tag={L?'◢ IDENTITY':'◢ AZONOSÍTÓ'} title={L?'IDENTITY':'IDENTITÁS'}>
              <Meta k={L?'NAME':'NÉV'} v={(displayName||'—').toUpperCase()}/>
              <Meta k={L?'LEVEL':'SZINT'} v={role}/>
            </Panel>

            <Panel tag={L?'◢ NETWORK':'◢ HÁLÓZAT'} title={L?'CONNECTIONS':'KAPCSOLATOK'}>
              {allUsers.slice(0,3).map((u, i) => (
                <div key={u.id} style={{ display:'grid', gridTemplateColumns:'32px 1fr auto', gap:10, alignItems:'center', padding:'8px 0', borderBottom:i<2?'1px solid var(--border-0)':'none' }}>
                  <Avatar id={`F3X-${String(u.id).padStart(3,'0')}`} size={32}/>
                  <div>
                    <div style={{fontSize:13}}>{u.username}</div>
                    <div className="sys muted">F3X-{String(u.id).padStart(3,'0')}</div>
                  </div>
                  <Chip>{u.role==='admin'||u.role==='superadmin'?'LVL-04':'LVL-02'}</Chip>
                </div>
              ))}
            </Panel>
          </aside>

          <div>
            <div className="tabs">
              <div className="tab active">{L?'BIO':'BIO / ÍRÁSOK'}</div>
              <div className="tab">{L?`POSTS · ${userPosts.length}`:`BEJEGYZÉSEK · ${userPosts.length}`}</div>
              <div style={{flex:1, borderBottom:'1px solid var(--border-1)'}}/>
            </div>

            <div style={{ padding:'22px 0 28px', borderBottom:'1px solid var(--border-1)' }}>
              <div className="sys muted" style={{marginBottom:10}}>{L?'◢ BIOGRAPHY':'◢ BIOGRAFIKUS REKORD'}</div>
              <p style={{ color:'var(--ink-0)', fontSize:15, lineHeight:1.75, maxWidth:780, margin:0 }}>
                {L
                  ? 'Long-time observer on the network. Posts about music, films, books, and whatever else is worth sharing.'
                  : 'Régi megfigyelő a hálózatban. Zenéről, filmekről, könyvekről és mindenről posztol amit érdemesnek talál megosztani.'}
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginTop:18, maxWidth:780 }}>
                {(L
                  ? [['FIELD','MUSIC · FILM'],['CONTACT',`f3xykee://u/${userId}`],['ZONE','UTC+1 · BUD']]
                  : [['SZAKTERÜLET','ZENE · FILM'],['ELÉRHETŐSÉG',`f3xykee://u/${userId}`],['ZÓNA','UTC+1 · BUD']]
                ).map(([k,v]) => (
                  <div key={k} className="panel" style={{padding:'10px 12px'}}>
                    <div className="sys muted">{k}</div>
                    <div className="mono" style={{fontSize:13, color:'var(--accent)'}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Message wall */}
            <div style={{ padding:'22px 0 28px' }} id="profile-composer">
              <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:14 }}>
                <Heading tag={L?'PROFILE POSTS':'PROFIL ÍRÁSOK'} title={L?'◢ LEAVE A MESSAGE':'◢ HAGYJ ÜZENETET'}
                  sub={L?'Messages left by other users on this profile.':'Más felhasználók üzenetei erre a profilra.'}/>
                <Chip kind="accent">{messages.length} {L?'MESSAGES':'ÜZENET'}</Chip>
              </div>

              {session && (
                <div className="panel" style={{ padding:14, marginBottom:14, display:'flex', gap:12 }}>
                  <Avatar id={`F3X-${String(session.id).padStart(3,'0')}`} size={40}/>
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:10 }}>
                    <textarea className="input" rows={2} value={msgText} onChange={e => setMsgText(e.target.value)}
                      placeholder={L ? `// Message to ${(displayName||'').toUpperCase()}` : `// Üzenet ${(displayName||'').toUpperCase()} profilra`}/>
                    {msgImg && (
                      <div style={{ position:'relative', display:'inline-block', maxWidth:160 }}>
                        <img src={msgImg} alt="preview" style={{ maxWidth:160, border:'1px solid var(--accent)', display:'block' }}/>
                        <span onClick={() => setMsgImg(null)} style={{ position:'absolute', top:2, right:2, cursor:'pointer', background:'rgba(0,0,0,0.75)', color:'var(--accent)', fontSize:9, padding:'1px 4px' }}>✕</span>
                      </div>
                    )}
                    <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                      <input ref={msgFileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleMsgFile}/>
                      <button className="btn btn-ghost btn-sm" style={{fontSize:10}} onClick={() => msgFileRef.current?.click()}>
                        ◢ {L?'ATTACH IMAGE':'KÉP CSATOLÁSA'}
                      </button>
                      <span style={{flex:1}}/>
                      <button className="btn btn-primary btn-sm" onClick={handleMsgSend}>
                        {L?'◢ SIGN + SEND':'◢ ALÁÍR + KÜLD'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((e, i) => (
                <div key={i} className="panel" style={{ padding:14, marginBottom:10, display:'grid', gridTemplateColumns:'40px 1fr', gap:12 }}>
                  <Avatar id={`F3X-${String(i+1).padStart(3,'0')}`} size={40}/>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                      <span className="head" style={{fontSize:15}}>{e.name}</span>
                      <span style={{flex:1}}/>
                      {e.verified && <Chip kind="accent" dot>VERIFIED</Chip>}
                      <span className="sys muted">{e.time}</span>
                    </div>
                    <div style={{ color:'var(--ink-0)', fontSize:14, lineHeight:1.6 }}>{e.text}</div>
                    {e.imgSrc && (
                      <img src={e.imgSrc} alt="csatolmány" style={{ maxWidth:260, marginTop:8, border:'1px solid var(--accent)', display:'block' }}/>
                    )}
                    <div style={{ display:'flex', gap:12, marginTop:8, paddingTop:8, borderTop:'1px dashed var(--border-1)' }}>
                      <span className="sys muted">{L?'▸ REPLY':'▸ VÁLASZ'}</span>
                    </div>
                  </div>
                </div>
              ))}

              {messages.length === 0 && (
                <div className="panel" style={{ padding:20, textAlign:'center', color:'var(--ink-3)', fontFamily:'var(--f-sys)', fontSize:11, letterSpacing:'0.2em' }}>
                  {L ? '// NO MESSAGES YET' : '// MÉG NINCS ÜZENET'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer index="002 / 004"/>
    </div>
  )
}
