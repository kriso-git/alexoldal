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
  if (_ready && window.YT?.Player) { cb(); return }
  _queue.push(cb)
}

if (typeof window !== 'undefined') {
  const prev = window.onYouTubeIframeAPIReady
  window.onYouTubeIframeAPIReady = () => {
    if (prev) prev()
    _ready = true
    _queue.splice(0).forEach(fn => fn())
  }
}

export function extractVideoId(embedUrl) {
  if (!embedUrl) return null
  const m = embedUrl.match(/\/embed\/([^?&#/]+)/)
  return m?.[1] || null
}

export function fmtTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}
