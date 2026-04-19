// ── Token storage (memory only — never localStorage for access tokens) ────────
let _accessToken = null
let _refreshing = null   // pending refresh promise (avoid double-refresh)
let _onUnauth = null     // callback when auth is fully lost

export function setAccessToken(t) { _accessToken = t }
export function clearAccessToken() { _accessToken = null }
export function setUnauthCallback(fn) { _onUnauth = fn }

const API_BASE = import.meta.env.VITE_API_BASE || ''

// ── Core fetch wrapper ────────────────────────────────────────────────────────
async function req(path, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(_accessToken ? { Authorization: `Bearer ${_accessToken}` } : {}),
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
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
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
    req(`/posts${category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : ''}`),
  create: (data) =>
    req('/posts', { method: 'POST', body: data }),
  delete: (id) =>
    req(`/posts/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  reorder: (order) =>
    req('/posts/order', { method: 'PUT', body: { order } }),
  react: (postId, key) =>
    req(`/posts/${encodeURIComponent(postId)}/react`, { method: 'POST', body: { key } }),
}

// ── Comments ──────────────────────────────────────────────────────────────────
export const commentsApi = {
  list: (postId) =>
    req(`/posts/${encodeURIComponent(postId)}/comments`),
  add: (postId, text) =>
    req(`/posts/${encodeURIComponent(postId)}/comments`, { method: 'POST', body: { text } }),
  reply: (commentId, text) =>
    req(`/comments/${encodeURIComponent(commentId)}/reply`, { method: 'POST', body: { text } }),
  delete: (commentId) =>
    req(`/comments/${encodeURIComponent(commentId)}`, { method: 'DELETE' }),
  react: (commentId, emoji) =>
    req(`/comments/${encodeURIComponent(commentId)}/react`, { method: 'POST', body: { emoji } }),
}

// ── File upload ───────────────────────────────────────────────────────────────
export async function uploadFile(file, onProgress) {
  const form = new FormData()
  form.append('file', file)
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/api/upload`)
    if (_accessToken) xhr.setRequestHeader('Authorization', `Bearer ${_accessToken}`)
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
      if (_accessToken) xhr.setRequestHeader('Authorization', `Bearer ${_accessToken}`)
      xhr.onload = () => {
        const data = JSON.parse(xhr.responseText)
        xhr.status >= 200 && xhr.status < 300 ? resolve(data) : reject(new Error(data.error || `HTTP ${xhr.status}`))
      }
      xhr.onerror = () => reject(new Error('Feltöltési hiba'))
      xhr.send(form)
    })
  },
  delete: (id) => req(`/superadmin/songs/${id}`, { method: 'DELETE' }),
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
  getAuditLog: (page = 0, action = '', username = '') => {
    const p = new URLSearchParams({ page, limit: 50 })
    if (action) p.set('action', action)
    if (username) p.set('username', username)
    return req(`/superadmin/audit?${p}`)
  },
  getStats: () => req('/superadmin/stats'),
}
