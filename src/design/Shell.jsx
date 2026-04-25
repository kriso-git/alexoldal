// F3XYKEE — Shared design system components
// i18n, TopBar, Nav, Footer, Panel, Chip, Meta, Avatar, DataStream, LiveTicks, NodeMap, Heading
import { useState, useEffect, useMemo } from 'react'

// ─── i18n ──────────────────────────────────────────────────────────────────
const DICT = {
  hu: {
    'nav.idx':'FŐOLDAL', 'nav.prf':'PROFIL', 'nav.ctl':'ADMIN', 'nav.query':'⌕ KERESÉS',
    'top.brand':'F3XYKEE · BLOG', 'top.node':'SZERVER · BUD-01', 'top.cycle':'2026 · 17. HÉT',
    'top.live':'◢ ÉLŐ BLOG FELÜLET · V0.1',
    'foot.uplink':'KAPCSOLAT · STABIL · 128 KB/S', 'foot.index':'OLDAL',
    'tweaks.title':'◢ TWEAKS · OLDAL KINÉZET', 'tweaks.accent':'AKCENT SZÍN', 'tweaks.density':'SŰRŰSÉG',
    'tweaks.scan':'SCANLINE SWEEP', 'tweaks.glitch':'MICRO-GLITCH HOVER', 'tweaks.lang':'NYELV',
    'hero.cycle':'2026 · 17. HÉT', 'hero.uplink':'KAPCSOLAT · STABIL', 'hero.ver':'V0.1.0',
    'hero.t1':'F3XYKEE /', 'hero.t2':'KÖZÖSSÉGI', 'hero.t3':'BLOG',
    'hero.desc':'Saját közösségi tér posztokhoz, profilokhoz és üzenetekhez. Minimál, retro-futurisztikus dizájn — nincs algoritmusos feed, minden időrendi.',
    'hero.btn1':'◢ BELÉPÉS', 'hero.btn2':'⌕ FELFEDEZÉS', 'hero.or':'◣ VAGY OLVASÓI MÓDBAN TOVÁBB ↓',
    'card.tag':'◢ FELHASZNÁLÓ', 'card.title':'PROFIL · AKTÍV',
    'card.status':'ONLINE · VERIFIKÁLT', 'card.session':'UTOLSÓ SYNC 00:00:42',
    'card.users':'FELHASZNÁLÓK', 'card.users_v':'regisztrált',
    'card.online':'online', 'card.posts':'POSZTOK', 'card.posts_v':'kint',
    'card.uplink':'◢ KAPCSOLAT · 24H ÁLLAPOT',
    'post.tag':'◢ POSZT LÉTREHOZÁSA', 'post.title':'ÚJ BEJEGYZÉS',
    'post.auth':'JOGOSULTSÁG · LVL-03+', 'post.open':'◢ NYIT', 'post.close':'◢ BEZÁR',
    'post.kinds':['SZÖVEG','KÉP','YOUTUBE'],
    'post.title_ph':'Bejegyzés címe', 'post.body_ph':'// Mit szeretnél megosztani?',
    'post.tags':'◢ CÍMKÉK ·', 'post.add':'+ HOZZÁAD', 'post.meta':'◢ TULAJDONSÁGOK',
    'post.type':'TÍPUS', 'post.visibility':'LÁTHATÓSÁG', 'post.vis_v':'HÁLÓZAT ▾',
    'post.access':'HOZZÁFÉRÉS', 'post.access_v':'LVL-01+',
    'post.draft':'VÁZLAT', 'post.preview':'ELŐNÉZET', 'post.publish':'◢ KÖZZÉTÉTEL',
    'feed.tag':'SZEKCIÓ · 01', 'feed.title':'POSZT FOLYAM',
    'feed.sub':'Legújabb bejegyzések a közösségből. Időrendi sorrend, nincs algoritmus.',
    'feed.latest':'LEGÚJABB', 'feed.cycle':'HÉT', 'feed.tag_f':'CÍMKE', 'feed.filter':'⌕ SZŰRŐ',
    'feed.readers':'OLVASÓ', 'feed.comments':'KOMMENT', 'feed.likes':'KEDVELÉS',
    'feed.next':'◢ KORÁBBI POSZTOK BETÖLTÉSE',
    'arc.tag':'SZEKCIÓ · 02', 'arc.title':'ARCHÍVUM · HÓNAPOK', 'arc.closed':'LEZÁRVA', 'arc.entries':'poszt',
    'auth.tab_login':'BELÉPÉS', 'auth.tab_reg':'REGISZTRÁCIÓ', 'auth.tab_rec':'JELSZÓ VISSZAÁLLÍTÁS',
    'auth.chip_req':'◢ HITELESÍTÉS KÖTELEZŐ', 'auth.hero_t1':'BELÉPÉS /', 'auth.hero_t2':'F3XYKEE', 'auth.hero_t3':'BLOG',
    'auth.hero_desc':'Közösségi blog a belső körnek. Felhasználónévvel és jelszóval lépsz be, vagy regisztrálsz új fiókot.',
    'auth.login_tag':'◢ BELÉPÉS', 'auth.login_title':'FELHASZNÁLÓ + JELSZÓ',
    'auth.user':'◢ FELHASZNÁLÓNÉV', 'auth.pw':'◢ JELSZÓ', 'auth.pw2':'◢ JELSZÓ MEGERŐSÍTÉSE',
    'auth.remember':'◢ MEGJEGYEZ · 12H', 'auth.cancel':'MÉGSE', 'auth.enter':'◢ BELÉPÉS',
    'auth.reg_tag':'◢ REGISZTRÁCIÓ', 'auth.reg_title':'ÚJ FIÓK LÉTREHOZÁSA', 'auth.reg_submit':'◢ FIÓK LÉTREHOZÁSA',
    'auth.rec_tag':'◢ VISSZAÁLLÍTÁS', 'auth.rec_title':'JELSZÓ ELFELEJTVE',
    'auth.rec_warn':'A visszaállító linket e-mailben küldjük. Ellenőrizd a spam mappát is.',
    'auth.rec_submit':'◢ VISSZAÁLLÍTÁSI KÉRELEM',
    'auth.log_tag':'◢ BELÉPÉSI NAPLÓ', 'auth.log_title':'UTOLSÓ 6 KÍSÉRLET',
    'auth.log_ok':'SIKER', 'auth.log_err':'ELUTASÍTVA',
  },
  en: {
    'nav.idx':'HOME', 'nav.prf':'PROFILE', 'nav.ctl':'ADMIN', 'nav.query':'⌕ SEARCH',
    'top.brand':'F3XYKEE · BLOG', 'top.node':'SERVER · BUD-01', 'top.cycle':'2026 · WEEK 17',
    'top.live':'◢ LIVE BLOG INTERFACE · V0.1',
    'foot.uplink':'CONNECTION · STABLE · 128 KB/S', 'foot.index':'PAGE',
    'tweaks.title':'◢ TWEAKS · SITE APPEARANCE', 'tweaks.accent':'ACCENT COLOR', 'tweaks.density':'DENSITY',
    'tweaks.scan':'SCANLINE SWEEP', 'tweaks.glitch':'MICRO-GLITCH HOVER', 'tweaks.lang':'LANGUAGE',
    'hero.cycle':'2026 · WEEK 17', 'hero.uplink':'CONNECTION · STABLE', 'hero.ver':'V0.1.0',
    'hero.t1':'F3XYKEE /', 'hero.t2':'COMMUNITY', 'hero.t3':'BLOG',
    'hero.desc':'Our own community space for posts, profiles, and messages. Minimal retro-futurist design — no algorithmic feed, everything chronological.',
    'hero.btn1':'◢ SIGN IN', 'hero.btn2':'⌕ EXPLORE', 'hero.or':'◣ OR CONTINUE AS A READER ↓',
    'card.tag':'◢ USER', 'card.title':'PROFILE · ACTIVE',
    'card.status':'ONLINE · VERIFIED', 'card.session':'LAST SYNC 00:00:42',
    'card.users':'USERS', 'card.users_v':'registered',
    'card.online':'online', 'card.posts':'POSTS', 'card.posts_v':'live',
    'card.uplink':'◢ CONNECTION · 24H STATUS',
    'post.tag':'◢ CREATE POST', 'post.title':'NEW POST',
    'post.auth':'PERMISSION · LVL-03+', 'post.open':'◢ OPEN', 'post.close':'◢ CLOSE',
    'post.kinds':['TEXT','IMAGE','YOUTUBE'],
    'post.title_ph':'Post title', 'post.body_ph':'// What do you want to share?',
    'post.tags':'◢ TAGS ·', 'post.add':'+ ADD', 'post.meta':'◢ PROPERTIES',
    'post.type':'TYPE', 'post.visibility':'VISIBILITY', 'post.vis_v':'NETWORK ▾',
    'post.access':'ACCESS', 'post.access_v':'LVL-01+',
    'post.draft':'DRAFT', 'post.preview':'PREVIEW', 'post.publish':'◢ PUBLISH',
    'feed.tag':'SECTION · 01', 'feed.title':'POST STREAM',
    'feed.sub':'Latest posts from the community. Chronological order, no algorithm.',
    'feed.latest':'LATEST', 'feed.cycle':'WEEK', 'feed.tag_f':'TAG', 'feed.filter':'⌕ FILTER',
    'feed.readers':'READERS', 'feed.comments':'COMMENTS', 'feed.likes':'LIKES',
    'feed.next':'◢ LOAD PREVIOUS POSTS',
    'arc.tag':'SECTION · 02', 'arc.title':'ARCHIVE · MONTHS', 'arc.closed':'CLOSED', 'arc.entries':'posts',
    'auth.tab_login':'SIGN IN', 'auth.tab_reg':'REGISTER', 'auth.tab_rec':'PASSWORD RECOVERY',
    'auth.chip_req':'◢ AUTHENTICATION REQUIRED', 'auth.hero_t1':'SIGN IN /', 'auth.hero_t2':'F3XYKEE', 'auth.hero_t3':'BLOG',
    'auth.hero_desc':'Community blog for the inner network. Sign in with your username and password, or register a new account.',
    'auth.login_tag':'◢ SIGN IN', 'auth.login_title':'USERNAME + PASSWORD',
    'auth.user':'◢ USERNAME', 'auth.pw':'◢ PASSWORD', 'auth.pw2':'◢ CONFIRM PASSWORD',
    'auth.remember':'◢ REMEMBER · 12H', 'auth.cancel':'CANCEL', 'auth.enter':'◢ SIGN IN',
    'auth.reg_tag':'◢ REGISTER', 'auth.reg_title':'CREATE NEW ACCOUNT', 'auth.reg_submit':'◢ CREATE ACCOUNT',
    'auth.rec_tag':'◢ RECOVERY', 'auth.rec_title':'FORGOT PASSWORD',
    'auth.rec_warn':'We\'ll send the recovery link via email. Check your spam folder.',
    'auth.rec_submit':'◢ SEND RECOVERY REQUEST',
    'auth.log_tag':'◢ SIGN-IN LOG', 'auth.log_title':'LAST 6 ATTEMPTS',
    'auth.log_ok':'SUCCESS', 'auth.log_err':'DENIED',
  },
  de: {
    'nav.idx':'STARTSEITE', 'nav.prf':'PROFIL', 'nav.ctl':'ADMIN', 'nav.query':'⌕ SUCHEN',
    'top.brand':'F3XYKEE · BLOG', 'top.node':'SERVER · BUD-01', 'top.cycle':'2026 · WOCHE 17',
    'top.live':'◢ LIVE BLOG · V0.1', 'foot.uplink':'VERBINDUNG · STABIL · 128 KB/S', 'foot.index':'SEITE',
    'hero.cycle':'2026 · WOCHE 17', 'hero.uplink':'VERBINDUNG · STABIL', 'hero.ver':'V0.1.0',
    'hero.t1':'F3XYKEE /', 'hero.t2':'GEMEINSCHAFT', 'hero.t3':'BLOG',
    'hero.desc':'Unser eigener Community-Bereich für Beiträge, Profile und Nachrichten.',
    'hero.btn1':'◢ ANMELDEN', 'hero.btn2':'⌕ ERKUNDEN', 'hero.or':'◣ ODER ALS LESER FORTFAHREN ↓',
    'card.users':'BENUTZER', 'card.users_v':'registriert', 'card.online':'online', 'card.posts':'BEITRÄGE', 'card.posts_v':'aktiv',
    'post.kinds':['TEXT','BILD','YOUTUBE'], 'feed.readers':'LESER', 'feed.comments':'KOMMENTARE', 'feed.likes':'LIKES',
    'feed.latest':'NEUESTE', 'feed.cycle':'WOCHE', 'feed.tag_f':'TAG', 'feed.filter':'⌕ FILTER',
    'feed.next':'◢ ÄLTERE BEITRÄGE LADEN', 'arc.closed':'GESCHLOSSEN', 'arc.entries':'Beiträge',
    'auth.tab_login':'ANMELDEN', 'auth.tab_reg':'REGISTRIEREN', 'auth.tab_rec':'PASSWORT ZURÜCKSETZEN',
    'auth.user':'◢ BENUTZERNAME', 'auth.pw':'◢ PASSWORT', 'auth.pw2':'◢ PASSWORT BESTÄTIGEN',
    'auth.enter':'◢ ANMELDEN', 'auth.reg_submit':'◢ KONTO ERSTELLEN',
    'auth.log_ok':'ERFOLG', 'auth.log_err':'ABGELEHNT',
  },
  es: {
    'nav.idx':'INICIO', 'nav.prf':'PERFIL', 'nav.ctl':'ADMIN', 'nav.query':'⌕ BUSCAR',
    'top.brand':'F3XYKEE · BLOG', 'top.node':'SERVIDOR · BUD-01', 'top.cycle':'2026 · SEMANA 17',
    'top.live':'◢ BLOG EN VIVO · V0.1', 'foot.uplink':'CONEXIÓN · ESTABLE · 128 KB/S', 'foot.index':'PÁGINA',
    'hero.cycle':'2026 · SEMANA 17', 'hero.uplink':'CONEXIÓN · ESTABLE', 'hero.ver':'V0.1.0',
    'hero.t1':'F3XYKEE /', 'hero.t2':'COMUNIDAD', 'hero.t3':'BLOG',
    'hero.desc':'Nuestro propio espacio comunitario para publicaciones, perfiles y mensajes.',
    'hero.btn1':'◢ ENTRAR', 'hero.btn2':'⌕ EXPLORAR', 'hero.or':'◣ O CONTINUAR COMO LECTOR ↓',
    'card.users':'USUARIOS', 'card.users_v':'registrados', 'card.online':'en línea', 'card.posts':'PUBLICACIONES', 'card.posts_v':'activas',
    'post.kinds':['TEXTO','IMAGEN','YOUTUBE'], 'feed.readers':'LECTORES', 'feed.comments':'COMENTARIOS', 'feed.likes':'ME GUSTA',
    'feed.latest':'ÚLTIMOS', 'feed.cycle':'SEMANA', 'feed.tag_f':'ETIQUETA', 'feed.filter':'⌕ FILTRAR',
    'feed.next':'◢ CARGAR PUBLICACIONES ANTERIORES', 'arc.closed':'CERRADO', 'arc.entries':'publicaciones',
    'auth.tab_login':'ENTRAR', 'auth.tab_reg':'REGISTRARSE', 'auth.tab_rec':'RECUPERAR CONTRASEÑA',
    'auth.user':'◢ USUARIO', 'auth.pw':'◢ CONTRASEÑA', 'auth.pw2':'◢ CONFIRMAR CONTRASEÑA',
    'auth.enter':'◢ ENTRAR', 'auth.reg_submit':'◢ CREAR CUENTA',
    'auth.log_ok':'ÉXITO', 'auth.log_err':'RECHAZADO',
  },
  fr: {
    'nav.idx':'ACCUEIL', 'nav.prf':'PROFIL', 'nav.ctl':'ADMIN', 'nav.query':'⌕ CHERCHER',
    'top.brand':'F3XYKEE · BLOG', 'top.node':'SERVEUR · BUD-01', 'top.cycle':'2026 · SEMAINE 17',
    'top.live':'◢ BLOG EN DIRECT · V0.1', 'foot.uplink':'CONNEXION · STABLE · 128 KB/S', 'foot.index':'PAGE',
    'hero.cycle':'2026 · SEMAINE 17', 'hero.uplink':'CONNEXION · STABLE', 'hero.ver':'V0.1.0',
    'hero.t1':'F3XYKEE /', 'hero.t2':'COMMUNAUTÉ', 'hero.t3':'BLOG',
    'hero.desc':'Notre propre espace communautaire pour publications, profils et messages.',
    'hero.btn1':'◢ CONNEXION', 'hero.btn2':'⌕ EXPLORER', 'hero.or':'◣ OU CONTINUER EN LECTEUR ↓',
    'card.users':'UTILISATEURS', 'card.users_v':'inscrits', 'card.online':'en ligne', 'card.posts':'PUBLICATIONS', 'card.posts_v':'actives',
    'post.kinds':['TEXTE','IMAGE','YOUTUBE'], 'feed.readers':'LECTEURS', 'feed.comments':'COMMENTAIRES', 'feed.likes':'J\'AIME',
    'feed.latest':'DERNIERS', 'feed.cycle':'SEMAINE', 'feed.tag_f':'ÉTIQUETTE', 'feed.filter':'⌕ FILTRER',
    'feed.next':'◢ CHARGER LES PUBLICATIONS PRÉCÉDENTES', 'arc.closed':'FERMÉ', 'arc.entries':'publications',
    'auth.tab_login':'CONNEXION', 'auth.tab_reg':'S\'INSCRIRE', 'auth.tab_rec':'MOT DE PASSE OUBLIÉ',
    'auth.user':'◢ NOM D\'UTILISATEUR', 'auth.pw':'◢ MOT DE PASSE', 'auth.pw2':'◢ CONFIRMER',
    'auth.enter':'◢ CONNEXION', 'auth.reg_submit':'◢ CRÉER UN COMPTE',
    'auth.log_ok':'SUCCÈS', 'auth.log_err':'REFUSÉ',
  },
  no: {
    'nav.idx':'HJEM', 'nav.prf':'PROFIL', 'nav.ctl':'ADMIN', 'nav.query':'⌕ SØK',
    'top.brand':'F3XYKEE · BLOGG', 'top.node':'SERVER · BUD-01', 'top.cycle':'2026 · UKE 17',
    'top.live':'◢ LIVE BLOGG · V0.1', 'foot.uplink':'TILKOBLING · STABIL · 128 KB/S', 'foot.index':'SIDE',
    'hero.cycle':'2026 · UKE 17', 'hero.uplink':'TILKOBLING · STABIL', 'hero.ver':'V0.1.0',
    'hero.t1':'F3XYKEE /', 'hero.t2':'SAMFUNN', 'hero.t3':'BLOGG',
    'hero.desc':'Vårt eget samfunnsrom for innlegg, profiler og meldinger.',
    'hero.btn1':'◢ LOGG INN', 'hero.btn2':'⌕ UTFORSK', 'hero.or':'◣ ELLER FORTSETT SOM LESER ↓',
    'card.users':'BRUKERE', 'card.users_v':'registrert', 'card.online':'pålogget', 'card.posts':'INNLEGG', 'card.posts_v':'aktive',
    'post.kinds':['TEKST','BILDE','YOUTUBE'], 'feed.readers':'LESERE', 'feed.comments':'KOMMENTARER', 'feed.likes':'LIKER',
    'feed.latest':'SISTE', 'feed.cycle':'UKE', 'feed.tag_f':'MERKELAPP', 'feed.filter':'⌕ FILTRER',
    'feed.next':'◢ LAST INN ELDRE INNLEGG', 'arc.closed':'LUKKET', 'arc.entries':'innlegg',
    'auth.tab_login':'LOGG INN', 'auth.tab_reg':'REGISTRER', 'auth.tab_rec':'GLEMT PASSORD',
    'auth.user':'◢ BRUKERNAVN', 'auth.pw':'◢ PASSORD', 'auth.pw2':'◢ BEKREFT PASSORD',
    'auth.enter':'◢ LOGG INN', 'auth.reg_submit':'◢ OPPRETT KONTO',
    'auth.log_ok':'SUKSESS', 'auth.log_err':'NEKTET',
  },
  sv: {
    'nav.idx':'HEM', 'nav.prf':'PROFIL', 'nav.ctl':'ADMIN', 'nav.query':'⌕ SÖK',
    'top.brand':'F3XYKEE · BLOGG', 'top.node':'SERVER · BUD-01', 'top.cycle':'2026 · VECKA 17',
    'top.live':'◢ LIVE BLOGG · V0.1', 'foot.uplink':'ANSLUTNING · STABIL · 128 KB/S', 'foot.index':'SIDA',
    'hero.cycle':'2026 · VECKA 17', 'hero.uplink':'ANSLUTNING · STABIL', 'hero.ver':'V0.1.0',
    'hero.t1':'F3XYKEE /', 'hero.t2':'GEMENSKAP', 'hero.t3':'BLOGG',
    'hero.desc':'Vårt eget gemenskapsrum för inlägg, profiler och meddelanden.',
    'hero.btn1':'◢ LOGGA IN', 'hero.btn2':'⌕ UTFORSKA', 'hero.or':'◣ ELLER FORTSÄTT SOM LÄSARE ↓',
    'card.users':'ANVÄNDARE', 'card.users_v':'registrerade', 'card.online':'online', 'card.posts':'INLÄGG', 'card.posts_v':'aktiva',
    'post.kinds':['TEXT','BILD','YOUTUBE'], 'feed.readers':'LÄSARE', 'feed.comments':'KOMMENTARER', 'feed.likes':'GILLA',
    'feed.latest':'SENASTE', 'feed.cycle':'VECKA', 'feed.tag_f':'TAGG', 'feed.filter':'⌕ FILTRERA',
    'feed.next':'◢ LADDA ÄLDRE INLÄGG', 'arc.closed':'STÄNGT', 'arc.entries':'inlägg',
    'auth.tab_login':'LOGGA IN', 'auth.tab_reg':'REGISTRERA', 'auth.tab_rec':'GLÖMT LÖSENORD',
    'auth.user':'◢ ANVÄNDARNAMN', 'auth.pw':'◢ LÖSENORD', 'auth.pw2':'◢ BEKRÄFTA LÖSENORD',
    'auth.enter':'◢ LOGGA IN', 'auth.reg_submit':'◢ SKAPA KONTO',
    'auth.log_ok':'LYCKADES', 'auth.log_err':'NEKAD',
  },
}

let _lang = 'hu'
const _listeners = new Set()
try { const s = localStorage.getItem('f3x_lang'); if (s) _lang = s } catch {}

export function getLang() { return _lang }
export function setLang(l) {
  _lang = l
  try { localStorage.setItem('f3x_lang', l) } catch {}
  _listeners.forEach(fn => fn(l))
}
export function t(k) {
  return DICT[_lang]?.[k] ?? DICT.en?.[k] ?? DICT.hu[k] ?? k
}
export function useLang() {
  const [, set] = useState(0)
  useEffect(() => {
    const fn = () => set(x => x + 1)
    _listeners.add(fn)
    return () => _listeners.delete(fn)
  }, [])
  return _lang
}

// ─── TopBar ────────────────────────────────────────────────────────────────
export function TopBar({ user, status = 'ONLINE' }) {
  useLang()
  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const hh = String(clock.getHours()).padStart(2,'0')
  const mm = String(clock.getMinutes()).padStart(2,'0')
  const ss = String(clock.getSeconds()).padStart(2,'0')
  return (
    <div className="topbar">
      <div className="cell brand">{t('top.brand')}</div>
      <div className="cell"><span className="dot"/>{status}</div>
      <div className="cell hide-sm">{t('top.node')}</div>
      <div className="cell hide-sm">{t('top.cycle')}</div>
      <div className="cell grow">{t('top.live')}</div>
      <div className="cell hide-sm">{hh}:{mm}:{ss} UTC</div>
      {user && <div className="cell" style={{color:'var(--accent)'}}>◉ {user}</div>}
    </div>
  )
}

// ─── Nav ────────────────────────────────────────────────────────────────────
export function Nav({ active = 'IDX', onNavigate }) {
  useLang()
  const items = [
    { k: 'IDX', label: t('nav.idx') },
    { k: 'PRF', label: t('nav.prf') },
    { k: 'CTL', label: t('nav.ctl') },
  ]
  return (
    <div className="nav">
      {items.map((it, i) => (
        <div key={it.k} className={'item ' + (active === it.k ? 'active' : '')}
          onClick={() => onNavigate?.(it.k)}>
          <span className="n">{String(i).padStart(2,'0')}</span>{it.label}
        </div>
      ))}
      <div className="spacer"/>
      <div className="item" onClick={() => {}}>{t('nav.query')}</div>
    </div>
  )
}

// ─── Footer ─────────────────────────────────────────────────────────────────
export function Footer({ index = '001 / 004' }) {
  useLang()
  return (
    <div className="footer">
      <div className="cell">◢ LAT 47.4979° N</div>
      <div className="cell">LON 19.0402° E</div>
      <div className="cell">{t('foot.uplink')}</div>
      <div className="spacer"/>
      <div className="cell">{t('foot.index')} {index}</div>
      <div className="cell">F3X · V0.1.0-HUD</div>
      <div className="cell">◣</div>
    </div>
  )
}

// ─── Chip ────────────────────────────────────────────────────────────────────
export function Chip({ children, kind = 'default', dot, style, onClick }) {
  const cls = 'chip' + (kind === 'default' ? '' : ' chip-' + kind)
  return (
    <span className={cls} style={{ cursor: onClick ? 'pointer' : undefined, ...style }} onClick={onClick}>
      {dot && <span className="chip-dot"/>}{children}
    </span>
  )
}

// ─── Meta row ────────────────────────────────────────────────────────────────
export function Meta({ k, v }) {
  return <div className="meta-row"><span className="k">{k}</span><span className="v">{v}</span></div>
}

// ─── Panel ───────────────────────────────────────────────────────────────────
export function Panel({ title, tag, chips, children, style, className = '', hud = true }) {
  return (
    <div className={`panel ${hud ? 'panel-hud' : ''} ${className}`} style={style}>
      {hud && <><span className="hud-br"/><span className="hud-bl"/></>}
      {(title || tag) && (
        <div className="panel-header">
          {tag && <span className="label">{tag}</span>}
          {title && <span>{title}</span>}
          <span style={{flex:1}}/>
          {chips}
        </div>
      )}
      <div className="panel-body">{children}</div>
    </div>
  )
}

// ─── Heading ─────────────────────────────────────────────────────────────────
export function Heading({ tag, title, sub, align = 'left' }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8, alignItems: align==='center'?'center':'flex-start' }}>
      {tag && <span className="sys" style={{color:'var(--accent)'}}>◢ {tag}</span>}
      <h2 className="display" style={{ margin:0, fontSize:36, lineHeight:1.02, color:'var(--ink-0)' }}>{title}</h2>
      {sub && <div className="muted" style={{ maxWidth:640, fontSize:13, lineHeight:1.55 }}>{sub}</div>}
    </div>
  )
}

// ─── Procedural avatar ───────────────────────────────────────────────────────
export function Avatar({ id = 'F3X-000', size = 40 }) {
  const n = id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const shapes = useMemo(() => {
    const arr = []
    let s = n
    for (let i = 0; i < 9; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      arr.push(s % 2)
    }
    return arr
  }, [id])
  return (
    <div className="avatar" style={{ width: size, height: size }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:2, width:size*0.6, height:size*0.6, position:'relative', zIndex:2 }}>
        {shapes.map((v, i) => (
          <div key={i} style={{ width:'100%', aspectRatio:'1', background: v ? 'var(--accent)' : 'transparent', boxShadow: v ? '0 0 3px var(--accent)' : 'none' }}/>
        ))}
      </div>
    </div>
  )
}

// ─── Live tick bar ────────────────────────────────────────────────────────────
export function LiveTicks({ count = 24, height = 28, color = 'var(--accent)' }) {
  const [tick, setTick] = useState(0)
  useEffect(() => { const id = setInterval(() => setTick(x => x + 1), 160); return () => clearInterval(id) }, [])
  const bars = useMemo(() => Array.from({length:count}).map((_,i) => {
    const s = Math.sin((tick + i*0.7) * 0.4) * 0.5 + 0.5
    const n = Math.abs(Math.sin((tick*0.23 + i*1.9))) * 0.4
    return Math.max(0.1, Math.min(1, s*0.7 + n))
  }), [tick, count])
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:2, height, width:'100%' }}>
      {bars.map((h, i) => (
        <div key={i} style={{ flex:1, height:`${h*100}%`, background:color, opacity:0.25+h*0.75, boxShadow:`0 0 4px ${color}` }}/>
      ))}
    </div>
  )
}

// ─── Ambient data stream ──────────────────────────────────────────────────────
export function DataStream({ side = 'left' }) {
  const lines = useMemo(() => {
    const out = []
    const tags = ['TX','RX','SYN','ACK','CRC','KEY','HDR','PKT','NOD','LNK','REL','LOG','DIF','OPS','THR']
    const seed = side === 'left' ? 0x9F2A : 0x7C41
    let x = seed
    for (let i = 0; i < 140; i++) {
      x = (x * 1103515245 + 12345) & 0x7fffffff
      const tag = tags[x % tags.length]
      const h1 = x.toString(16).slice(0,4).toUpperCase().padStart(4,'0')
      const h2 = ((x>>8)&0xffff).toString(16).toUpperCase().padStart(4,'0')
      const cls = (x%13)===0 ? 'hi' : (x%17)===0 ? 'cy' : (x%29)===0 ? 'mg' : ''
      out.push({ t: `${tag}·${h1}${h2}`, cls })
    }
    return out
  }, [side])
  const doubled = [...lines, ...lines]
  return (
    <div className={'datastream ' + side} aria-hidden>
      <div className="datastream-track">
        {doubled.map((l, i) => (
          <div key={i} className={'datastream-line ' + l.cls}>{l.t}</div>
        ))}
      </div>
    </div>
  )
}

// ─── Lang picker ─────────────────────────────────────────────────────────────
export function LangPicker() {
  const lang = useLang()
  const langs = [
    {code:'hu',label:'HU'},{code:'en',label:'EN'},{code:'de',label:'DE'},
    {code:'es',label:'ES'},{code:'fr',label:'FR'},{code:'no',label:'NO'},{code:'sv',label:'SV'},
  ]
  return (
    <div style={{ display:'flex', gap:4, alignItems:'center', flexWrap:'wrap', marginTop:10 }}>
      <span className="sys muted" style={{marginRight:6, fontSize:10, letterSpacing:'0.2em'}}>
        ◢ {lang==='hu' ? 'MEGJELENÍTÉSI NYELV' : 'DISPLAY LANGUAGE'}
      </span>
      {langs.map(l => (
        <Chip key={l.code}
          kind={lang === l.code ? 'accent' : 'default'}
          onClick={() => setLang(l.code)}
          style={{cursor:'pointer'}}>
          {l.label}
        </Chip>
      ))}
    </div>
  )
}

// ─── Tweaks panel ─────────────────────────────────────────────────────────────
const ACCENT_MAP = {
  green:   { c:'#18e968', soft:'rgba(24,233,104,0.14)',  glow:'0 0 8px rgba(24,233,104,0.45)' },
  amber:   { c:'#ffb347', soft:'rgba(255,179,71,0.14)',  glow:'0 0 8px rgba(255,179,71,0.45)' },
  cyan:    { c:'#4df0ff', soft:'rgba(77,240,255,0.14)',  glow:'0 0 8px rgba(77,240,255,0.45)' },
  magenta: { c:'#ff4dbf', soft:'rgba(255,77,191,0.14)',  glow:'0 0 8px rgba(255,77,191,0.45)' },
  mono:    { c:'#e9f2ea', soft:'rgba(233,242,234,0.10)', glow:'0 0 6px rgba(233,242,234,0.35)' },
}

export function applyAccent(key) {
  const a = ACCENT_MAP[key] || ACCENT_MAP.green
  document.documentElement.style.setProperty('--accent', a.c)
  document.documentElement.style.setProperty('--accent-soft', a.soft)
  document.documentElement.style.setProperty('--accent-glow', a.glow)
}

export function TweaksPanel({ open, onClose }) {
  const lang = useLang()
  const [accent, setAccent] = useState('green')
  const [scanlines, setScanlines] = useState(true)

  useEffect(() => {
    applyAccent(accent)
    const sweep = document.getElementById('scan-sweep')
    if (sweep) sweep.style.display = scanlines ? '' : 'none'
  }, [accent, scanlines])

  if (!open) return null
  return (
    <div className="tweaks">
      <div className="th" style={{justifyContent:'space-between'}}>
        <span>{t('tweaks.title')}</span>
        <span style={{cursor:'pointer', color:'var(--ink-2)'}} onClick={onClose}>✕</span>
      </div>
      <div className="tb">
        <label>{t('tweaks.lang')}
          <div style={{display:'flex', gap:6}}>
            {['hu','en'].map(l => (
              <div key={l} onClick={() => setLang(l)} style={{
                flex:1, padding:'6px 8px', border:'1px solid var(--border-1)',
                background: lang===l ? 'var(--accent-soft)' : 'transparent',
                color: lang===l ? 'var(--accent)' : 'var(--ink-2)',
                textAlign:'center', cursor:'pointer', fontFamily:'var(--f-sys)', fontSize:10, letterSpacing:'0.15em'
              }}>{l==='hu' ? 'MAGYAR' : 'ENGLISH'}</div>
            ))}
          </div>
        </label>
        <label>{t('tweaks.accent')}
          <div className="swatches">
            {Object.entries(ACCENT_MAP).map(([k, a]) => (
              <div key={k} className={'sw ' + (accent===k ? 'active' : '')}
                style={{background:a.c, boxShadow:`0 0 8px ${a.c}66`}}
                onClick={() => setAccent(k)} title={k}/>
            ))}
          </div>
        </label>
        <label style={{flexDirection:'row', alignItems:'center', gap:8}}>
          <input type="checkbox" checked={scanlines} onChange={e => setScanlines(e.target.checked)}/>
          {t('tweaks.scan')}
        </label>
      </div>
    </div>
  )
}
