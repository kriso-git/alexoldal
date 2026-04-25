import { useState } from 'react'
import { TopBar, Footer, Chip, Panel, useLang, t } from '../design/Shell.jsx'
import { Avatar } from '../design/Shell.jsx'

export default function PageAuth({ onLogin, onRegister, onNavigate }) {
  const lang = useLang()
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const L = lang === 'en'

  const handleLogin = async () => {
    if (!username.trim() || !password) return setError(L ? 'Fill in all fields' : 'Töltsd ki az összes mezőt')
    setLoading(true); setError('')
    const result = await onLogin?.({ username: username.trim(), password })
    if (result !== true) setError(result || (L ? 'Login failed' : 'Belépési hiba'))
    setLoading(false)
  }

  const handleRegister = async () => {
    if (!username.trim() || !password) return setError(L ? 'Fill in all fields' : 'Töltsd ki az összes mezőt')
    if (password !== password2) return setError(L ? 'Passwords do not match' : 'A jelszavak nem egyeznek')
    setLoading(true); setError('')
    const result = await onRegister?.({ username: username.trim(), password })
    if (result !== true) setError(result || (L ? 'Registration failed' : 'Regisztrációs hiba'))
    setLoading(false)
  }

  const recentLog = [
    ['00:14:02','—',  'ok'],
    ['00:08:41','—',  'err'],
    ['00:04:22','—',  'ok'],
    ['00:01:09','—',  'ok'],
    ['23:57:40','—',  'err'],
    ['23:44:11','—',  'ok'],
  ]

  return (
    <div className="page" style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <TopBar user={null}/>

      <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', borderTop:'1px solid var(--border-1)' }}>
        {/* LEFT — hero */}
        <div style={{ position:'relative', padding:'64px 56px', borderRight:'1px solid var(--border-1)', background:'radial-gradient(ellipse at 30% 40%, rgba(24,233,104,0.08), transparent 60%)' }}>
          <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
            <svg viewBox="0 0 600 800" style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.35 }}>
              {Array.from({length:60}).map((_,j) => {
                const x=(j*73)%580+10, y=(j*97)%780+10, hi=j%11===0
                return <circle key={j} cx={x} cy={y} r={hi?2.4:1.1} fill={hi?'var(--accent)':'var(--ink-3)'} style={hi?{filter:'drop-shadow(0 0 3px var(--accent))'}:undefined}/>
              })}
              {Array.from({length:30}).map((_,j) => {
                const x1=(j*73)%580+10, y1=(j*97)%780+10, x2=((j+4)*73)%580+10, y2=((j+4)*97)%780+10
                return <line key={j} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--border-1)" strokeWidth="0.4"/>
              })}
            </svg>
          </div>
          <div style={{ position:'relative', display:'flex', flexDirection:'column', gap:28, maxWidth:560 }}>
            <div style={{ display:'flex', gap:8 }}>
              <Chip kind="solid" dot>{t('auth.chip_req')}</Chip>
              <Chip kind="dash">{t('hero.cycle')}</Chip>
              <Chip kind="cyan">{t('hero.uplink')}</Chip>
            </div>
            <h1 className="display" style={{ margin:0, fontSize:80, lineHeight:0.9, letterSpacing:'-0.03em' }}>
              {t('auth.hero_t1')}<br/>
              <span style={{ color:'var(--accent)', textShadow:'0 0 16px rgba(24,233,104,0.4)' }}>{t('auth.hero_t2')}</span><br/>
              {t('auth.hero_t3')}
            </h1>
            <p style={{ margin:0, maxWidth:480, color:'var(--ink-1)', fontSize:15, lineHeight:1.65 }}>
              {t('auth.hero_desc')}
            </p>
            <div className="panel" style={{ padding:'16px 18px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16, maxWidth:480 }}>
              {[['SZERVER','bud-01'],['TLS',L?'signed · v2':'aláírás · v2'],[L?'STATUS':'ÁLLAPOT','OK']].map(([k,v]) => (
                <div key={k}>
                  <div className="sys muted">{k}</div>
                  <div className="mono" style={{ fontSize:13, color:'var(--accent)', marginTop:4 }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => onNavigate?.('IDX')}>
                ← {L ? 'BACK TO HOME' : 'VISSZA A FŐOLDALRA'}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — form */}
        <div style={{ padding:'64px 56px', display:'flex', flexDirection:'column', background:'var(--bg-1)', alignItems:'center', justifyContent:'center' }}>
          <div style={{ width:'100%', maxWidth:460, display:'flex', flexDirection:'column', gap:20 }}>
            <div className="tabs" style={{ border:'1px solid var(--border-1)' }}>
              <div className={'tab ' + (mode==='login'?'active':'')} onClick={() => { setMode('login'); setError('') }}>{t('auth.tab_login')}</div>
              <div className={'tab ' + (mode==='reg'?'active':'')} onClick={() => { setMode('reg'); setError('') }}>{t('auth.tab_reg')}</div>
              <div className={'tab ' + (mode==='rec'?'active':'')} onClick={() => { setMode('rec'); setError('') }}>{t('auth.tab_rec')}</div>
            </div>

            {error && (
              <div className="panel" style={{ padding:10, background:'rgba(255,58,58,0.08)', borderColor:'var(--red)', color:'var(--red)', fontFamily:'var(--f-sys)', fontSize:11 }}>
                ◢ {error}
              </div>
            )}

            {mode === 'login' && (
              <Panel tag={t('auth.login_tag')} title={t('auth.login_title')} className="panel-raised"
                chips={<Chip kind="accent" dot>ÉLŐ</Chip>}>
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <span className="sys muted">{t('auth.user')}</span>
                    <input className="input" value={username} onChange={e => setUsername(e.target.value)}
                      onKeyDown={e => e.key==='Enter' && handleLogin()}
                      placeholder={L?'username':'felhasználónév'} style={{ fontSize:16 }}/>
                  </label>
                  <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <span className="sys muted">{t('auth.pw')}</span>
                    <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                      onKeyDown={e => e.key==='Enter' && handleLogin()}
                      style={{ fontFamily:'var(--f-mono)', letterSpacing:'0.3em' }}/>
                  </label>
                  <div style={{ display:'flex', gap:8, alignItems:'center', paddingTop:12, borderTop:'1px dashed var(--border-1)' }}>
                    <span style={{flex:1}}/>
                    <button className="btn btn-ghost btn-sm" onClick={() => onNavigate?.('IDX')}>{t('auth.cancel')}</button>
                    <button className="btn btn-primary" onClick={handleLogin} disabled={loading}>
                      {loading ? '...' : t('auth.enter')}
                    </button>
                  </div>
                </div>
              </Panel>
            )}

            {mode === 'reg' && (
              <Panel tag={t('auth.reg_tag')} title={t('auth.reg_title')} className="panel-raised">
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <span className="sys muted">{t('auth.user')}</span>
                    <input className="input" value={username} onChange={e => setUsername(e.target.value)}
                      placeholder={L?'e.g. noctis':'pl. noctis'}/>
                  </label>
                  <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <span className="sys muted">{t('auth.pw')}</span>
                    <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••••"/>
                  </label>
                  <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <span className="sys muted">{t('auth.pw2')}</span>
                    <input className="input" type="password" value={password2} onChange={e => setPassword2(e.target.value)}
                      placeholder="••••••••••"/>
                  </label>
                  <div style={{ display:'flex', gap:8, alignItems:'center', paddingTop:12, borderTop:'1px dashed var(--border-1)' }}>
                    <span style={{flex:1}}/>
                    <button className="btn btn-primary" onClick={handleRegister} disabled={loading}>
                      {loading ? '...' : t('auth.reg_submit')}
                    </button>
                  </div>
                </div>
              </Panel>
            )}

            {mode === 'rec' && (
              <Panel tag={t('auth.rec_tag')} title={t('auth.rec_title')} className="panel-raised">
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div className="panel" style={{ padding:12, background:'rgba(255,58,58,0.08)', borderColor:'var(--red)', color:'var(--red)' }}>
                    <div className="sys">◢ {L?'NOTICE':'FIGYELEM'}</div>
                    <div style={{ fontSize:12, marginTop:6, color:'var(--ink-1)' }}>{t('auth.rec_warn')}</div>
                  </div>
                  <label style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    <span className="sys muted">{t('auth.user')}</span>
                    <input className="input" value={username} onChange={e => setUsername(e.target.value)}
                      placeholder={L?'username':'felhasználónév'}/>
                  </label>
                  <div style={{ display:'flex', gap:8, alignItems:'center', paddingTop:12, borderTop:'1px dashed var(--border-1)' }}>
                    <span style={{flex:1}}/>
                    <button className="btn">{t('auth.rec_submit')}</button>
                  </div>
                </div>
              </Panel>
            )}

            <Panel tag={t('auth.log_tag')} title={t('auth.log_title')}>
              <div>
                {recentLog.map((r, i, a) => (
                  <div key={i} style={{ display:'grid', gridTemplateColumns:'80px 1fr auto', gap:10, padding:'8px 0', borderBottom:i<a.length-1?'1px solid var(--border-0)':'none', alignItems:'center' }}>
                    <span className="mono muted" style={{fontSize:11}}>{r[0]}</span>
                    <span className="mono" style={{fontSize:11, color:'var(--ink-1)'}}>{r[1]}</span>
                    <Chip kind={r[2]==='ok'?'accent':'mag'} dot>{r[2]==='ok'?t('auth.log_ok'):t('auth.log_err')}</Chip>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>
      </div>

      <Footer index="003 / 004"/>
    </div>
  )
}
