import { useState, useRef, useCallback } from 'react'
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

function mediaTypeFromMime(mime) {
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('image/')) return 'image'
  return 'video'
}

export default function Composer({ onPost }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [mediaType, setMediaType] = useState('none')
  const [mediaSrc, setMediaSrc] = useState('')
  const [category, setCategory] = useState('posts')
  const [mediaLabel, setMediaLabel] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  const handleFileUpload = useCallback(async (file) => {
    if (!file) return
    setUploading(true)
    setUploadPct(0)
    try {
      const result = await uploadFile(file, setUploadPct)
      setMediaSrc(result.url)
      setMediaType(mediaTypeFromMime(file.type))
      if (!mediaLabel) setMediaLabel(file.name.replace(/\.[^.]+$/, '').toUpperCase())
      toast('Fájl feltöltve ✓')
    } catch (e) {
      toast(e.message, 'err')
    } finally {
      setUploading(false)
    }
  }, [mediaLabel])

  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  const submit = (e) => {
    e.preventDefault()
    if (!title.trim()) return toast('Adj címet a posztnak', 'err')
    let finalSrc = mediaSrc.trim() || null
    if (mediaType === 'youtube' && finalSrc) finalSrc = toYoutubeEmbed(finalSrc)
    onPost({
      title: title.trim(),
      category,
      body: body.trim(),
      mediaType: mediaType !== 'none' && !finalSrc ? 'placeholder' : mediaType,
      mediaSrc: mediaType !== 'none' ? finalSrc : null,
      mediaLabel: mediaLabel.trim() || null,
    })
    setTitle(''); setBody(''); setMediaSrc(''); setMediaLabel('')
  }

  return (
    <form className="composer" onSubmit={submit}>
      <div className="composer-head">
        <div className="composer-title">[ új_poszt.sh ]</div>
        <button type="button"
          style={{ fontSize: 10, letterSpacing: '0.15em', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer' }}
          onClick={() => setShowHelp(v => !v)}>
          {showHelp ? '▲ súgó bezár' : '▼ hogyan tölts fel?'}
        </button>
      </div>

      {showHelp && (
        <div style={{ padding: '10px 14px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.8, marginBottom: 8 }}>
          <div style={{ color: 'var(--accent)', letterSpacing: '0.1em', marginBottom: 6 }}>// FELTÖLTÉSI ÚTMUTATÓ</div>
          <div><span style={{ color: 'var(--cyan)' }}>Fájl drag-drop:</span> Húzd rá a fájlt az alábbi sárga területre — mp4, mp3, jpg, gif, webp, stb. Max 500 MB. Automatikusan feltöltődik a szerverre.</div>
          <div style={{ marginTop: 5 }}><span style={{ color: 'var(--cyan)' }}>YouTube (beágyazva):</span> Válaszd a <strong>YouTube</strong> típust, illeszd be a linket (watch?v= vagy youtu.be/ — nem nyilvános videó is működik).</div>
          <div style={{ marginTop: 5 }}><span style={{ color: 'var(--cyan)' }}>Kép URL:</span> Imgur, ImgBB, vagy bármilyen közvetlen képlink (.jpg/.png/.webp).</div>
        </div>
      )}

      <div className="composer-row">
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Cím</label>
          <input className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Mi történt most?" />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Kategória</label>
          <select className="form-input" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.filter(c => c.id !== 'all').map(c => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Szöveg (opc.)</label>
        <textarea className="form-textarea" value={body} onChange={e => setBody(e.target.value)} placeholder="Mondd el..." />
      </div>

      {/* Drag-drop upload zone */}
      <div
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !uploading && fileInputRef.current?.click()}
        style={{
          border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
          background: dragOver ? 'rgba(200,255,0,0.04)' : 'transparent',
          borderRadius: 2, padding: '14px 16px', cursor: uploading ? 'wait' : 'pointer',
          textAlign: 'center', fontSize: 11, color: dragOver ? 'var(--accent)' : 'var(--text-faint)',
          letterSpacing: '0.1em', transition: 'all 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}
      >
        {uploading ? (
          <>
            <span style={{ color: 'var(--accent)' }}>FELTÖLTÉS...</span>
            <div style={{ flex: 1, maxWidth: 200, height: 4, background: 'var(--border)', borderRadius: 2 }}>
              <div style={{ width: `${uploadPct}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.1s' }} />
            </div>
            <span style={{ color: 'var(--accent)' }}>{uploadPct}%</span>
          </>
        ) : mediaSrc && !mediaSrc.startsWith('http') ? (
          <span style={{ color: 'var(--accent)' }}>✓ {mediaSrc.split('/').pop()} — klikk a cserére</span>
        ) : (
          <span>⬆ Húzd ide a fájlt vagy klikkelj — mp4 · mp3 · jpg · gif · webp (max 500 MB)</span>
        )}
        <input ref={fileInputRef} type="file" accept="video/*,audio/*,image/*" style={{ display: 'none' }}
          onChange={e => handleFileUpload(e.target.files[0])} />
      </div>

      <div className="composer-row">
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">
            {mediaType === 'youtube' ? 'YouTube URL' : 'Vagy média URL (opc.)'}
          </label>
          <input className="form-input" value={mediaSrc} onChange={e => setMediaSrc(e.target.value)}
            placeholder={mediaType === 'youtube' ? 'https://youtube.com/watch?v=... vagy youtu.be/...' : 'https://... — ha nem töltöttél fel fájlt'} />
        </div>
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Típus</label>
          <select className="form-input" value={mediaType} onChange={e => setMediaType(e.target.value)}>
            <option value="none">nincs</option>
            <option value="youtube">YouTube beágyazás</option>
            <option value="video">videófájl</option>
            <option value="image">kép</option>
            <option value="placeholder">placeholder</option>
          </select>
        </div>
      </div>

      {mediaType !== 'none' && mediaType !== 'youtube' && (
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Média felirat (opc.)</label>
          <input className="form-input" value={mediaLabel} onChange={e => setMediaLabel(e.target.value)} placeholder="pl. CS2 ▸ INFERNO" />
        </div>
      )}

      <div className="form-actions">
        <button type="submit" className="btn btn-admin" disabled={uploading}>▶ Poszt kiadása</button>
      </div>
    </form>
  )
}
