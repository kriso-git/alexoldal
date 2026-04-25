import React, { useState, useEffect } from 'react'
import { TopBar, Nav, Footer, Chip, Panel, Heading, Avatar, useLang, t } from '../design/Shell.jsx'
import { toast } from '../effects.js'

function KPI({ k, v, hint, kind = 'accent' }) {
  const color = kind === 'mag' ? 'var(--magenta)' : kind === 'warn' ? 'var(--amber)' : 'var(--accent)'
  return (
    <div className="panel" style={{ padding:'14px 16px' }}>
      <div className="sys muted">{k}</div>
      <div className="head" style={{ fontSize:34, color, textShadow: kind==='accent' ? 'var(--accent-glow)' : 'none', marginTop:4 }}>{v}</div>
      {hint && <div className="sys muted" style={{marginTop:2}}>{hint}</div>}
    </div>
  )
}

function rowS(ri, len) {
  return { padding:'10px', borderBottom: ri < len-1 ? '1px solid var(--border-0)' : 'none', display:'flex', alignItems:'center' }
}

export default function PageAdmin({ session, onNavigate, onLogout }) {
  const lang = useLang()
  const L = lang === 'en'
  const [openUsers, setOpenUsers] = useState(true)
  const [openLog, setOpenLog] = useState(true)
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ users: 0, posts: 0, online: 0 })
  const [log, setLog] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch('/api/superadmin/users', {
          headers: { 'Authorization': `Bearer ${window.__accessToken || ''}` }
        })
        if (resp.ok) {
          const data = await resp.json()
          setUsers(data.users || data || [])
          setStats(s => ({ ...s, users: (data.users || data || []).length }))
        }
      } catch {}
      try {
        const resp = await fetch('/api/superadmin/stats', {
          headers: { 'Authorization': `Bearer ${window.__accessToken || ''}` }
        })
        if (resp.ok) {
          const data = await resp.json()
          setStats(s => ({ ...s, posts: data.posts || s.posts, online: data.online || s.online }))
        }
      } catch {}
    }
    load()
  }, [])

  const handleBan = async (userId) => {
    if (!confirm(L ? 'Ban this user?' : 'Tiltod ezt a felhasználót?')) return
    try {
      await fetch(`/api/superadmin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${window.__accessToken || ''}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Admin ban', duration: 60*24*7 })
      })
      toast(L ? 'User banned' : 'Felhasználó tiltva')
    } catch (e) { toast(e.message, 'err') }
  }

  const mockLog = L ? [
    ['00:14:02','INFO','—','Post published · latest entry'],
    ['00:12:44','SYS','—','Connection health 0.98 · sample 040'],
    ['00:08:41','SEC','—','Login denied · password mismatch'],
    ['00:04:22','INFO','—','Post published'],
    ['00:00:14','INFO','—','Session started'],
    ['23:57:40','SEC','—','Login denied · username missing'],
    ['23:47:11','INFO','—','Message delivered'],
  ] : [
    ['00:14:02','INFO','—','Poszt közzétéve · legújabb bejegyzés'],
    ['00:12:44','SYS','—','Kapcsolat állapota 0.98 · minta 040'],
    ['00:08:41','SEC','—','Belépés elutasítva · jelszó nem egyezik'],
    ['00:04:22','INFO','—','Poszt közzétéve'],
    ['00:00:14','INFO','—','Munkamenet indítva'],
    ['23:57:40','SEC','—','Belépés elutasítva · felhasználónév hiányzik'],
    ['23:47:11','INFO','—','Üzenet kézbesítve'],
  ]

  const displayUsers = users.length > 0 ? users : []

  return (
    <div className="page">
      <TopBar user={session?.username?.toUpperCase()} status="SUPERADMIN"/>

      <div style={{ background:'rgba(255,77,191,0.06)', borderBottom:'1px solid rgba(255,77,191,0.3)', padding:'6px 56px', fontFamily:'var(--f-sys)', fontSize:10, letterSpacing:'0.2em', color:'var(--magenta)', display:'flex', gap:14, alignItems:'center' }}>
        <span className="dot dot-mag"/>
        {L ? '◢ SUPERADMIN MODE · ALL ACTIONS AUDITED' : '◢ SUPERADMIN MÓD · MINDEN MŰVELET AUDITÁLVA'}
        <span style={{flex:1}}/>
        <button className="btn btn-sm btn-danger" onClick={onLogout} style={{fontSize:9,padding:'3px 8px'}}>
          {L ? 'LOGOUT' : 'KILÉPÉS'}
        </button>
      </div>

      <Nav active="CTL" onNavigate={onNavigate}/>

      <div className="shell" style={{ padding:'24px 56px' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', padding:'16px 0 24px', borderBottom:'1px solid var(--border-1)' }}>
          <Heading
            tag={L ? 'ADMIN · CTL-01' : 'ADMIN · CTL-01'}
            title={L ? 'MODERATION DASHBOARD' : 'MODERÁTORI FELÜLET'}
            sub={L
              ? 'Users, posts, and system health in one view.'
              : 'Felhasználók, posztok és rendszerállapot egy képen.'}/>
          <div style={{ display:'flex', gap:8 }}>
            <Chip kind="accent" dot>{L ? 'ALL SYSTEMS OK' : 'MINDEN RENDBEN'}</Chip>
            <button className="btn btn-sm">{L ? '◢ EXPORT LOG' : '◢ NAPLÓ EXPORT'}</button>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginTop:22 }}>
          <KPI k={L?'POSTS · LIVE':'POSZTOK · KINT'} v={stats.posts || '—'} hint="+12 / 24h"/>
          <KPI k={L?'USERS · ONLINE':'FELHASZNÁLÓK · ONLINE'} v={`${stats.online||'—'} / ${stats.users||'—'}`} hint={L?'admins active':'admin aktív'}/>
          <KPI k={L?'SYSTEM STATUS':'RENDSZER ÁLLAPOT'} v="OK" hint={L?'all clear':'minden rendben'} kind="accent"/>
        </div>

        {/* Users table */}
        <div style={{ marginTop:18 }}>
          <Panel tag={L?'USERS':'FELHASZNÁLÓK'} title={L?`REGISTRY · ${stats.users}`:`REGISZTER · ${stats.users}`}
            chips={<>
              <Chip kind="accent">{L?'LIVE':'ÉLŐ'}</Chip>
              <span onClick={() => setOpenUsers(o=>!o)} style={{ cursor:'pointer', color:'var(--ink-2)', fontFamily:'var(--f-sys)', fontSize:10, letterSpacing:'0.15em', padding:'2px 8px', border:'1px solid var(--border-1)', marginLeft:4 }}>
                {openUsers?'▼':'▶'}
              </span>
            </>}>
            {openUsers && (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'90px 32px 1fr 70px 80px 90px 100px 32px' }}>
                  {(L?['ID','','USERNAME','LEVEL','JOINED','LAST SEEN','STATUS','']:['ID','','NÉV','SZINT','CSATL.','UTOLJÁRA','ÁLLAPOT','']).map(h => (
                    <div key={h} className="sys muted" style={{ padding:'8px 10px', borderBottom:'1px solid var(--border-1)', fontSize:10 }}>{h}</div>
                  ))}
                  {displayUsers.map((u, ri) => {
                    const lvl = u.role==='superadmin'?'LVL-05':u.role==='admin'?'LVL-04':'LVL-02'
                    const status = u.banned ? (L?'BANNED':'TILTVA') : 'ONLINE'
                    const statusKind = u.banned ? 'err' : 'accent'
                    return (
                      <React.Fragment key={u.id}>
                        <div style={rowS(ri,displayUsers.length)}><span className="mono" style={{fontSize:11}}>F3X-{String(u.id).padStart(3,'0')}</span></div>
                        <div style={rowS(ri,displayUsers.length)}><Avatar id={`F3X-${String(u.id).padStart(3,'0')}`} size={22}/></div>
                        <div style={rowS(ri,displayUsers.length)}><span className="head" style={{fontSize:13}}>{u.username}</span></div>
                        <div style={rowS(ri,displayUsers.length)}><Chip>{lvl}</Chip></div>
                        <div style={rowS(ri,displayUsers.length)}><span className="mono muted">{u.created_at ? new Date(u.created_at*1000).getFullYear() : '—'}</span></div>
                        <div style={rowS(ri,displayUsers.length)}><span className="mono muted">—</span></div>
                        <div style={rowS(ri,displayUsers.length)}>
                          <span style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span className={'dot ' + (u.banned ? 'dot-err' : '')}/>
                            <span className="sys" style={{ fontSize:10, color: u.banned ? 'var(--red)' : 'var(--accent)' }}>{status}</span>
                          </span>
                        </div>
                        <div style={rowS(ri,displayUsers.length)}>
                          <span className="sys" style={{ color:'var(--ink-3)', cursor:'pointer', fontSize:9 }}
                            onClick={() => handleBan(u.id)}>⋯</span>
                        </div>
                      </React.Fragment>
                    )
                  })}
                  {displayUsers.length === 0 && (
                    <div style={{ gridColumn:'1/-1', padding:'20px', textAlign:'center', color:'var(--ink-3)', fontFamily:'var(--f-sys)', fontSize:10 }}>
                      // LOADING…
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', gap:8, padding:'12px', borderTop:'1px solid var(--border-1)' }}>
                  <button className="btn btn-sm">{L?'◢ CHANGE LEVEL':'◢ SZINT MÓD.'}</button>
                  <button className="btn btn-sm">{L?'◢ RESET PASSWORD':'◢ JELSZÓ RESET'}</button>
                  <span style={{flex:1}}/>
                  <button className="btn btn-sm" style={{ color:'var(--red)', borderColor:'rgba(255,58,58,0.4)' }}>{L?'◢ BAN':'◢ TILTÁS'}</button>
                  <button className="btn btn-primary btn-sm">{L?'◢ NEW USER':'◢ ÚJ FELHASZNÁLÓ'}</button>
                </div>
              </>
            )}
          </Panel>
        </div>

        {/* Event log */}
        <div style={{ marginTop:22 }}>
          <Panel tag={L?'EVENT LOG':'ESEMÉNYNAPLÓ'} title={L?'LIVE FEED':'ÉLŐ FOLYAM'}
            chips={<>
              <Chip kind="cyan">{L?'CHANGES':'VÁLTOZÁSOK'}</Chip>
              <Chip kind="accent" dot>{L?'LIVE':'ÉLŐ'}</Chip>
              <span onClick={() => setOpenLog(o=>!o)} style={{ cursor:'pointer', color:'var(--ink-2)', fontFamily:'var(--f-sys)', fontSize:10, letterSpacing:'0.15em', padding:'2px 8px', border:'1px solid var(--border-1)', marginLeft:4 }}>
                {openLog?'▼':'▶'}
              </span>
            </>}>
            {openLog && (
              <div style={{ fontFamily:'var(--f-mono)', fontSize:12, lineHeight:1.7 }}>
                {mockLog.map((r, i, a) => {
                  const c = r[1]==='SEC'?'var(--amber)':r[1]==='SYS'?'var(--cyan)':'var(--ink-2)'
                  return (
                    <div key={i} style={{ display:'grid', gridTemplateColumns:'80px 60px 90px 1fr 32px', gap:10, padding:'6px 12px', borderBottom:i<a.length-1?'1px solid var(--border-0)':'none', alignItems:'center' }}>
                      <span style={{color:'var(--ink-3)'}}>{r[0]}</span>
                      <span className="sys" style={{color:c, letterSpacing:'0.15em'}}>{r[1]}</span>
                      <span className="mono" style={{color:'var(--ink-1)'}}>{r[2]}</span>
                      <span style={{color:'var(--ink-1)'}}>{r[3]}</span>
                      <span className="sys" style={{color:'var(--ink-3)',textAlign:'right'}}>↗</span>
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <Footer index="004 / 004"/>
    </div>
  )
}
