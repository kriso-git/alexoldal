import { useState, useRef, useCallback, useEffect } from 'react'
import { CATEGORIES } from '../data.js'
import { toast } from '../effects.js'
import { uploadFile } from '../api.js'

function toYoutubeEmbed(url) {
  try {
    const u = new URL(url.trim())
    let id = null
    if (u.hostname.includes('youtube.com')) {
      id = u.searchParams.get('v')
      if (!id && u.pathname.startsWith('/embed/')) id = u.pathname.split('/embed/')[1]?.split(/[?&]/)[0]
    } else if (u.hostname === 'youtu.be') {
      id = u.pathname.slice(1).split('?')[0]
    }
    if (id) return `https://www.youtube.com/embed/${id}?rel=0`
    return url.trim()
  } catch { return url.trim() }
}

const ALLOWED_UPLOAD = new Set([
  'image/gif', 'image/jpeg', 'image/png', 'image/webp',
  'audio/mpeg', 'audio/mp3', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/flac',
])

function applyFormat(tag, textarea, value, onChange) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = value.slice(start, end)
  if (start === end) return
  const newValue = value.slice(0, start) + `<${tag}>${selected}</${tag}>` + value.slice(end)
  onChange(newValue)
  requestAnimationFrame(() => {
    textarea.focus()
    const newCursor = end + tag.length * 2 + 5
    textarea.setSelectionRange(newCursor, newCursor)
  })
}

export default function Composer({ onPost }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState('posts')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [mediaSrc, setMediaSrc] = useState('')
  const [mediaType, setMediaType] = useState('none')
  const [mediaLabel, setMediaLabel] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)
  const bodyRef = useRef(null)

  useEffect(() => {
    setMediaSrc(''); setMediaType('none'); setMediaLabel(''); setYoutubeUrl('')
  }, [category])

  const handleFile = useCallback(async (file) => {
    if (!file) return
    if (!ALLOWED_UPLOAD.has(file.type)) {
      return toast('Csak kép (gif/jpg/png/webp) és hang (mp3/wav/ogg) fájl engedélyezett', 'err')
    }
    if (file.size > 100 * 1024 * 1024) {
      return toast('A fájl túl nagy (max 100 MB)', 'err')
    }
    setUploading(true); setUploadPct(0)
    try {
      const result = await uploadFile(file, setUploadPct)
      setMediaSrc(result.path ?? result.url)
      setMediaType(file.type.startsWith('audio/') ? 'audio' : 'image')
      if (!mediaLabel) setMediaLabel(file.name.replace(/\.[^.]+$/, '').toUpperCase())
      toast('Fájl feltöltve ✓')
    } catch (e) {
      toast(e.message, 'err')
    } finally { setUploading(false) }
  }, [mediaLabel])

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }, [handleFile])

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return toast('Adj címet a posztnak', 'err')

    let finalMediaType = mediaType
    let finalMediaSrc = null

    if (category === 'videos') {
      if (!youtubeUrl.trim()) return toast('Adj meg YouTube URL-t', 'err')
      finalMediaType = 'youtube'
      finalMediaSrc = toYoutubeEmbed(youtubeUrl.trim())
    } else {
      finalMediaSrc = mediaSrc || null
    }

    onPost({
      title: title.trim(),
      category,
      body: body.trim(),
      mediaType: finalMediaSrc ? finalMediaType : 'none',
      mediaSrc: finalMediaSrc,
      mediaLabel: mediaLabel.trim() || null,
    })
    setTitle(''); setBody(''); setMediaSrc(''); setMediaType('none')
    setYoutubeUrl(''); setMediaLabel('')
    setOpen(false)
  }

  return (
    <div className="composer-wrap">
      <button
        type="button"
        className="composer-toggle-btn"
        onClick={() => setOpen(v => !v)}
      >
        <span>[ új_poszt.sh ]</span>
        <span className="composer-toggle-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <form className="composer" onSubmit={submit}>
          <div className="composer-row">
            <div className="form-group" style={{ margin: 0, flex: 2 }}>
              <label className="form-label">Cím</label>
              <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Mi történt most?" maxLength={200} autoFocus />
            </div>
            <div className="form-group" style={{ margin: 0, flex: 1 }}>
              <label className="form-label">Kategória</label>
              <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label className="form-label" style={{ margin: 0 }}>Szöveg (opc.)</label>
              <div className="format-toolbar">
                {[
                  { tag: 'b', label: 'B', title: 'Félkövér', style: { fontWeight: 700 } },
                  { tag: 'i', label: 'I', title: 'Dőlt', style: { fontStyle: 'italic' } },
                  { tag: 'u', label: 'U', title: 'Aláhúzott', style: { textDecoration: 'underline' } },
                  { tag: 's', label: 'S', title: 'Áthúzott', style: { textDecoration: 'line-through' } },
                ].map(({ tag, label, title, style }) => (
                  <button
                    key={tag}
                    type="button"
                    className="format-btn"
                    title={title}
                    style={style}
                    onMouseDown={e => {
                      e.preventDefault()
                      if (bodyRef.current) applyFormat(tag, bodyRef.current, body, setBody)
                    }}
                  >{label}</button>
                ))}
              </div>
            </div>
            <textarea ref={bodyRef} className="form-textarea" value={body} onChange={e => setBody(e.target.value)} placeholder="Mondd el..." maxLength={5000} rows={3} />
          </div>

          {category === 'videos' ? (
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">YouTube URL</label>
              <input
                className="form-input"
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... vagy youtu.be/... (nem nyilvános is működik)"
              />
            </div>
          ) : (
            <>
              <div
                className={`upload-zone${dragOver ? ' drag-over' : ''}${uploading ? ' uploading' : ''}`}
                onDrop={onDrop}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                {uploading ? (
                  <div className="upload-zone-content">
                    <span className="upload-zone-text" style={{ color: 'var(--accent)' }}>FELTÖLTÉS...</span>
                    <div className="upload-progress-bar">
                      <div className="upload-progress-fill" style={{ width: `${uploadPct}%` }} />
                    </div>
                    <span style={{ color: 'var(--accent)', fontSize: 11 }}>{uploadPct}%</span>
                  </div>
                ) : mediaSrc ? (
                  <div className="upload-zone-content">
                    <span style={{ color: 'var(--accent)', fontSize: 11 }}>
                      ✓ {mediaSrc.split('/').pop()} [{mediaType}] — klikk a cserére
                    </span>
                  </div>
                ) : (
                  <div className="upload-zone-content">
                    <span className="upload-zone-text">⬆ Húzd ide vagy klikkelj</span>
                    <span style={{ fontSize: 10, color: 'var(--text-faint)' }}>gif · jpg · png · webp · mp3 · wav · ogg — max 100 MB</span>
                  </div>
                )}
                <input
                  ref={fileInputRef} type="file"
                  accept="image/gif,image/jpeg,image/png,image/webp,audio/mpeg,audio/ogg,audio/wav,audio/flac"
                  style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])}
                />
              </div>
              {mediaSrc && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Felirat (opc.)</label>
                  <input className="form-input" value={mediaLabel} onChange={e => setMediaLabel(e.target.value)} placeholder="pl. BEST CLIP 2025" />
                </div>
              )}
            </>
          )}

          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Mégse</button>
            <button type="submit" className="btn btn-admin" disabled={uploading}>▶ Poszt kiadása</button>
          </div>
        </form>
      )}
    </div>
  )
}
