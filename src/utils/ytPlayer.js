let _ready = false
const _queue = []

export function ensureYTScript() {
  if (typeof window === 'undefined') return
  if (window._ytScriptLoaded) return
  window._ytScriptLoaded = true
  const s = document.createElement('script')
  s.src = 'https://www.youtube.com/iframe_api'
  document.head.appendChild(s)
}

export function onYTReady(cb) {
  if (window.YT?.Player) { cb(); return }
  _queue.push(cb)
}

if (typeof window !== 'undefined') {
  const prev = window.onYouTubeIframeAPIReady
  window.onYouTubeIframeAPIReady = () => {
    if (prev) prev()
    _ready = true
    _queue.splice(0).forEach(fn => { try { fn() } catch {} })
  }
}

export function extractVideoId(url) {
  if (!url) return null
  // Already a bare 11-char video ID
  if (/^[A-Za-z0-9_-]{11}$/.test(url.trim())) return url.trim()
  // /embed/ID
  let m = url.match(/\/embed\/([A-Za-z0-9_-]{11})/)
  if (m) return m[1]
  // ?v=ID or &v=ID
  m = url.match(/[?&]v=([A-Za-z0-9_-]{11})/)
  if (m) return m[1]
  // youtu.be/ID
  m = url.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)
  if (m) return m[1]
  // /shorts/ID
  m = url.match(/\/shorts\/([A-Za-z0-9_-]{11})/)
  if (m) return m[1]
  return null
}

export function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
