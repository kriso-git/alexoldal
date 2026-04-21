// ── Token storage (memory only — never localStorage for access tokens) ────────
let _accessToken = null
let _refreshing = null   // pending refresh promise (avoid double-refresh)
let _onUnauth = null     // callback when auth is fully lost

export function setAccessToken(t) { _accessToken = t }
export function clearAccessToken() { _accessToken = null }
export function setUnauthCallback(fn) { _onUnauth = fn }

const API_BASE = import.meta.env.VITE_API_BASE || ''
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzeXd6d3BhaHhieHZjY3F2YXBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MDMzMzQsImV4cCI6MjA5MjE3OTMzNH0.lFQOC2nCkKFMLDEIk0wToJLNOevAg7yUCKUEkuPOHGk'

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function req(path, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': _accessToken ? `Bearer ${_accessToken}` : `Bearer ${SUPABASE_ANON_KEY}`,
    ...opts.headers,
  }

  const res = await fetch(`${API_BASE}/api${path}`, {
    ...opts,
    headers,
    credentials: 'include',
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
  })

  // Auto-refresh on 401 (token expired)
  if (res.status === 401 && !opts._retry) {
    const refreshed = await _doRefresh()
    if (refreshed) return req(path, { ...opts, _retry: true })
    clearAccessToken()
    _onUnauth?.()
    const err = new Error('Lejárt a munkamenet. Kérjük, lépj be újra.')
    err.status = 401
    throw err
  }

  if (res.status === 204) return null
  const data = await res.json()
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

async function _doRefresh() {
  if (_refreshing) return _refreshing
  _refreshing = (async () => {
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'X-Requested-With': 'XMLHttpRequest', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
      })
      if (!res.ok) return false
      const { accessToken } = await res.json()
      setAccessToken(accessToken)
      return true
    } catch {
      return false
    } finally {
      _refreshing = null
    }
  })()
  return _refreshing
}

// ── Try to restore session on app load ───────────────────────────────────────
export async function tryRestoreSession() {
  const ok = await _doRefresh()
  if (!ok) return null
  try {
    return await req('/auth/me')   // { user }
  } catch {
    return null
  }
}

// ── Response mappers (snake_case → camelCase + timestamp normalisation) ───────
function mapPost(raw) {
  return {
    ...raw,
    createdAt:    raw.created_at    ? new Date(raw.created_at).getTime()    : (raw.createdAt    ?? 0),
    author:       raw.author        ?? raw.author_username ?? raw.username  ?? '',
    mediaType:    raw.media_type    ?? raw.mediaType    ?? 'none',
    mediaSrc:     raw.media_src     ?? raw.mediaSrc     ?? null,
    mediaLabel:   raw.media_label   ?? raw.mediaLabel   ?? null,
    authorRole:   raw.author_role   ?? raw.authorRole   ?? null,
    commentCount: raw.comment_count ?? raw.commentCount ?? 0,
    myReactions:  raw.my_reactions  ?? raw.myReactions  ?? [],
  }
}

function mapComment(raw) {
  return {
    ...raw,
    createdAt:    raw.created_at ? new Date(raw.created_at).getTime() : (raw.createdAt ?? 0),
    authorIsAdmin: raw.author_is_admin
      ?? raw.authorIsAdmin
      ?? (raw.author_role ? raw.author_role !== 'user' : false),
    myReactions:  raw.my_reactions ?? raw.myReactions ?? [],
    replies:      (raw.replies || []).map(mapComment),
  }
}

function mapReactResult(raw) {
  return { reactions: raw.reactions ?? {}, myReactions: raw.my_reactions ?? raw.myReactions ?? [], user_xp: raw.user_xp }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username, password) =>
    req('/auth/login', { method: 'POST', body: { username, password } }),
  register: (username, password) =>
    req('/auth/register', { method: 'POST', body: { username, password } }),
  logout: () =>
    req('/auth/logout', { method: 'POST' }),
}

// ── Posts ─────────────────────────────────────────────────────────────────────
export const postsApi = {
  list: (category) =>
    req(`/posts${category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : ''}`).then(d => d.map(mapPost)),
  create: (data) =>
    req('/posts', { method: 'POST', body: data }).then(mapPost),
  delete: (id) =>
    req(`/posts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  reorder: (order) =>
    req('/posts/order', { method: 'PUT', body: { order } }),
  react: (postId, key) =>
    req(`/posts/${encodeURIComponent(postId)}/react`, { method: 'POST', body: { key } }).then(mapReactResult),
  pin: (id, pinned) =>
    req('/posts/pin', { method: 'PATCH', body: { id, pinned } }),
}

// ── Comments ──────────────────────────────────────────────────────────────────
export const commentsApi = {
  list: (postId) =>
    req(`/comments/posts/${encodeURIComponent(postId)}/comments`).then(d => d.map(mapComment)),
  add: (postId, text) =>
    req(`/comments/posts/${encodeURIComponent(postId)}/comments`, { method: 'POST', body: { text } }).then(mapComment),
  reply: (commentId, text) =>
    req(`/comments/${encodeURIComponent(commentId)}/reply`, { method: 'POST', body: { text } }).then(mapComment),
  delete: (commentId) =>
    req(`/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' }),
  react: (commentId, emoji) =>
    req(`/comments/${encodeURIComponent(commentId)}/react`, { method: 'POST', body: { emoji } }).then(mapReactResult),
}

// ── File upload ───────────────────────────────────────────────────────────────
export async function uploadFile(file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/api/upload`)
    xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY)
    xhr.setRequestHeader('Authorization', _accessToken ? `Bearer ${_accessToken}` : `Bearer ${SUPABASE_ANON_KEY}`)
    if (onProgress) xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round(e.loaded / e.total * 100))
    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText)
      if (xhr.status >= 200 && xhr.status < 300) resolve(data)
      else reject(new Error(data.error || `HTTP ${xhr.status}`))
    }
    xhr.onerror = () => reject(new Error('Feltöltési hiba'))
    xhr.send(form)
  })
}

// ── Songs ─────────────────────────────────────────────────────────────────────
export const songsApi = {
  list: () => req('/songs'),
  upload: (file, name) => {
    const form = new FormData()
    form.append('file', file)
    if (name) form.append('name', name)
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE}/api/superadmin/songs/upload`)
      xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY)
      xhr.setRequestHeader('Authorization', _accessToken ? `Bearer ${_accessToken}` : `Bearer ${SUPABASE_ANON_KEY}`)
      xhr.onload = () => {
        const data = JSON.parse(xhr.responseText)
        xhr.status >= 200 && xhr.status < 300 ? resolve(data) : reject(new Error(data.error || `HTTP ${xhr.status}`))
      }
      xhr.onerror = () => reject(new Error('Feltöltési hiba'))
      xhr.send(form)
    })
  },
  rename: (id, name) => req(`/superadmin/songs/${id}`, { method: 'PATCH', body: { name } }),
  delete: (id) => req(`/superadmin/songs/${id}`, { method: 'DELETE' }),
}

// ── Custom Emojis ─────────────────────────────────────────────────────────────
export const customEmojiApi = {
  list: () => req('/custom-emojis'),
  add: (name, url) => req('/superadmin/custom-emojis', { method: 'POST', body: { name, url } }),
  delete: (id) => req(`/superadmin/custom-emojis/${id}`, { method: 'DELETE' }),
}

// ── Profile ───────────────────────────────────────────────────────────────────
export const profileApi = {
  get: (username) => req(`/profile/${encodeURIComponent(username)}`),
  update: (username, data) => req(`/profile/${encodeURIComponent(username)}`, { method: 'PATCH', body: data }),
  search: (q) => req(`/profile?search=${encodeURIComponent(q)}`),
}

export const profileWallApi = {
  list: (username) => req(`/profile-wall/${encodeURIComponent(username)}`),
  post: (username, text) => req(`/profile-wall/${encodeURIComponent(username)}`, { method: 'POST', body: { text } }),
  delete: (username, id) => req(`/profile-wall/${encodeURIComponent(username)}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}

// ── Visits ────────────────────────────────────────────────────────────────────
export const visitsApi = {
  increment: () => req('/visit', { method: 'POST' }),
  get: () => req('/visit'),
}

// ── Superadmin ────────────────────────────────────────────────────────────────
export const superadminApi = {
  getUsers: () => req('/superadmin/users'),
  setRole: (id, role) => req(`/superadmin/users/${id}/role`, { method: 'PATCH', body: { role } }),
  setBan: (id, banned, minutes) => req(`/superadmin/users/${id}/ban`, { method: 'PATCH', body: { banned, ...(minutes ? { minutes } : {}) } }),
  deleteUser: (id) => req(`/superadmin/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id, newPassword) =>
    req(`/superadmin/users/${id}/reset-password`, { method: 'POST', body: { newPassword } }),
  setPermissions: (id, permissions) =>
    req(`/superadmin/users/${id}/permissions`, { method: 'PATCH', body: permissions }),
  getAuditLog: (page = 0, action = '', username = '') => {
    const p = new URLSearchParams({ page, limit: 50 })
    if (action) p.set('action', action)
    if (username) p.set('username', username)
    return req(`/superadmin/audit?${p}`)
  },
  getStats: () => req('/superadmin/stats'),
}
