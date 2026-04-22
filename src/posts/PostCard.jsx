import { useState, useRef, useEffect } from 'react'
import { formatDateHu, timeAgoHu, catLabel } from '../data.js'
import { toast } from '../effects.js'
import { commentsApi, uploadFile } from '../api.js'
import Comment, { useCustomEmojis } from './Comment.jsx'
import YouTubePlayer from './YouTubePlayer.jsx'
import AudioPlayer from './AudioPlayer.jsx'

const REACTIONS = [
  { key: 'like',  emoji: '👍' },
  { key: 'fire',  emoji: '🔥' },
  { key: 'skull', emoji: '💀' },
  { key: 'laugh', emoji: '😂' },
]

const ROLE_BADGE = {
  superadmin: { label: '⚡', color: 'var(--magenta)' },
  admin:      { label: 'A',  color: 'var(--accent)' },
}

export default function PostCard({ post, session, presenceMap, onReact, onComment, onReplyComment, onReactComment, onDeleteComment, onDeletePost, onPin, onOpenAuth, onProfile, index, onDragStart, onDragOver, onDrop, draggingId, dragOverId }) {
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState(null)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [pendingImage, setPendingImage] = useState(null)
  const [imageUploading, setImageUploading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const fileInputRef = useRef(null)
  const mediaRef = useRef(null)
  const emojiPickerRef = useRef(null)
  const isAdmin = session?.role === 'admin' || session?.role === 'superadmin'
  const commentCount = post.commentCount || 0
  const customEmojis = useCustomEmojis()

  useEffect(() => {
    if (!showEmojiPicker) return
    const close = (e) => { if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) setShowEmojiPicker(false) }
    setTimeout(() => document.addEventListener('click', close), 0)
    return () => document.removeEventListener('click', close)
  }, [showEmojiPicker])

  useEffect(() => {
    if (!commentsOpen || comments !== null) return
    setCommentsLoading(true)
    commentsApi.list(post.id)
      .then(data => setComments(data))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false))
  }, [commentsOpen, post.id])

  useEffect(() => {
    if (post._newComment && commentsOpen) {
      commentsApi.list(post.id).then(data => setComments(data)).catch(() => {})
    }
  }, [post._newComment])

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageUploading(true)
    try {
      const data = await uploadFile(file)
      setPendingImage(data.url)
    } catch (err) {
      toast(err.message || 'Feltöltési hiba', 'err')
    } finally {
      setImageUploading(false)
      e.target.value = ''
    }
  }

  const submitComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim() && !pendingImage) return
    if (!session) return onOpenAuth('login')
    const text = commentText.trim() + (pendingImage ? `\n[img:${pendingImage}]` : '')
    const comment = await onComment(post.id, text)
    if (comment) {
      setComments(prev => prev ? [...prev, comment] : [comment])
      setCommentText('')
      setPendingImage(null)
    }
  }

  const handleDeleteComment = async (postId, commentId) => {
    const ok = await onDeleteComment(postId, commentId)
    if (ok) setComments(prev => removeComment(prev, commentId))
  }

  const handleReply = async (commentId, text) => {
    const reply = await onReplyComment(commentId, text)
    if (reply) setComments(prev => addReply(prev, commentId, reply))
    return reply
  }

  const handleReactComment = async (commentId, emoji) => {
    const result = await onReactComment(commentId, emoji)
    if (result) setComments(prev => updateCommentReactions(prev, commentId, result))
    return result
  }

  const roleBadge = ROLE_BADGE[post.authorRole]
  const presence = presenceMap?.[post.author]
  const isOnline = presence?.isOnline ?? false
  const lastSeenLabel = presence && !isOnline && presence.last_seen
    ? `Utoljára: ${timeAgoHu(new Date(presence.last_seen).getTime())}`
    : null
  const dragging = draggingId === post.id
  const dragOver = dragOverId === post.id && draggingId !== post.id
  const articleRef = useRef(null)

  const enableDrag = () => articleRef.current?.setAttribute('draggable', 'true')
  const disableDrag = () => articleRef.current?.setAttribute('draggable', 'false')

  return (
    <article
      ref={articleRef}
      className={`post${dragging ? ' dragging' : ''}${dragOver ? ' drag-over' : ''}`}
      onDragStart={(e) => onDragStart(e, post.id)}
      onDragOver={(e) => onDragOver(e, post.id)}
      onDrop={(e) => onDrop(e, post.id)}
      onDragEnd={disableDrag}
      style={{ animationDelay: `${Math.min(index, 6) * 0.05}s` }}
    >
      <div className="post-head">
        <div className="post-meta">
          <div className="post-info">
            <span className="post-cat">{catLabel(post.category)}</span>
            <span className="dot">·</span>
            <span title={formatDateHu(post.createdAt)}>{formatDateHu(post.createdAt)}</span>
            <span className="dot">·</span>
            <span>{timeAgoHu(post.createdAt)}</span>
            <span className="dot">·</span>
            <span className="post-author-wrap">
              {post.author_avatar && (
                <div
                  className="avatar-presence-wrap"
                  onClick={() => onProfile?.(post.author)}
                  title={isOnline ? 'Elérhető' : lastSeenLabel || undefined}
                >
                  <img
                    src={post.author_avatar}
                    alt={post.author}
                    className="post-author-avatar"
                  />
                  <span className={`presence-dot${isOnline ? ' online' : presence ? ' offline' : ''}`} />
                </div>
              )}
              <button className="post-author link-btn" onClick={() => onProfile?.(post.author)}>@{post.author}</button>
              {roleBadge && (
                <span className="post-author-badge" style={{ color: roleBadge.color, borderColor: roleBadge.color }}>
                  {roleBadge.label}
                </span>
              )}
              {post.level > 1 && <span className="level-badge">LV.{post.level}</span>}
            </span>
          </div>
          <h2 className="post-title glitch-hover">
            {post.pinned && <span className="post-pin-icon">📌 </span>}
            {post.title}
          </h2>
        </div>
        <div
          className="post-handle"
          title="Húzd a sorrend átrendezéséhez"
          onMouseEnter={enableDrag}
          onMouseLeave={disableDrag}
        >⋮⋮⋮</div>
      </div>

      {post.mediaType === 'youtube' && post.mediaSrc && (
        <YouTubePlayer src={post.mediaSrc} />
      )}
      {post.mediaType === 'audio' && post.mediaSrc && (
        <AudioPlayer src={post.mediaSrc} label={post.mediaLabel} />
      )}
      {post.mediaType === 'image' && post.mediaSrc && (
        <div className="post-media img-type" ref={mediaRef}>
          <img src={post.mediaSrc} alt={post.mediaLabel || post.title} loading="lazy" />
        </div>
      )}
      {post.mediaType === 'placeholder' && (
        <div className="post-media img-type">
          <div className="media-placeholder" data-label={post.mediaLabel || 'NO SIGNAL'} />
        </div>
      )}

      {post.body && (
        <div className="post-body">
          {post.body.split(/\n\n+/).map((para, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: sanitizeBody(para) }} />
          ))}
        </div>
      )}

      <div className="post-footer">
        <div className="reactions">
          {REACTIONS.map(r => {
            const reacted = post.myReactions?.includes(r.key)
            return (
              <button
                key={r.key}
                className={`react-btn${reacted ? ' reacted' : ''}`}
                onClick={(e) => {
                  if (!session) return onOpenAuth('login')
                  onReact(post.id, r.key)
                  e.currentTarget.classList.remove('bump')
                  void e.currentTarget.offsetWidth
                  e.currentTarget.classList.add('bump')
                }}
              >
                <span className="emoji">{r.emoji}</span>
                <span className="count">{post.reactions?.[r.key] ?? 0}</span>
              </button>
            )
          })}
          {Object.entries(post.reactions || {})
            .filter(([key, cnt]) => key.startsWith('http') && cnt > 0)
            .map(([url, cnt]) => {
              const reacted = post.myReactions?.includes(url)
              return (
                <button key={url} className={`react-btn${reacted ? ' reacted' : ''}`}
                  onClick={() => { if (!session) return onOpenAuth('login'); onReact(post.id, url) }}>
                  <img src={url} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                  <span className="count">{cnt}</span>
                </button>
              )
            })}
          {customEmojis.length > 0 && (
            <div className="emoji-picker-wrap" ref={emojiPickerRef}>
              <button className="react-btn react-btn-add" title="Egyedi emoji reakció"
                onClick={() => { if (!session) return onOpenAuth('login'); setShowEmojiPicker(o => !o) }}>
                <span className="emoji">+</span>
              </button>
              <div className={`emoji-picker${showEmojiPicker ? ' open' : ''}`}>
                {customEmojis.map(ce => (
                  <button key={ce.id} className="emoji-pick" title={ce.name}
                    onClick={() => { onReact(post.id, ce.url); setShowEmojiPicker(false) }}>
                    <img src={ce.url} alt={ce.name} style={{ width: 20, height: 20, objectFit: 'contain' }} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="post-actions">
          <button className="icon-btn" onClick={() => setCommentsOpen(o => !o)}>
            💬 {commentCount} {commentsOpen ? 'elrejt' : 'komment'}
          </button>
          <div style={{ position: 'relative' }}>
            <button className="icon-btn" onClick={() => {
              const url = `${window.location.origin}/#${post.id}`
              navigator.clipboard?.writeText(url)
              setShareOpen(o => !o)
            }}>↗ Megoszt</button>
            {shareOpen && (
              <div style={{
                position: 'absolute', bottom: '110%', right: 0, zIndex: 50,
                background: 'var(--bg-2)', border: '1px solid var(--border-strong)',
                borderRadius: 6, padding: '10px 12px', minWidth: 260, maxWidth: 340,
                boxShadow: '0 4px 24px rgba(0,0,0,0.6)',
              }}>
                <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.1em', marginBottom: 4 }}>LINK MÁSOLVA</div>
                <div style={{ fontSize: 11, color: 'var(--text)', fontWeight: 700, marginBottom: 6, lineHeight: 1.3 }}>{post.title}</div>
                <div style={{
                  fontSize: 9, color: 'var(--accent)', fontFamily: 'var(--font-mono)',
                  wordBreak: 'break-all', opacity: 0.8,
                }}>{window.location.origin}/#{ post.id}</div>
                <button
                  style={{ marginTop: 8, fontSize: 9, background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 0, letterSpacing: '0.08em' }}
                  onClick={() => setShareOpen(false)}
                >[ bezár ]</button>
              </div>
            )}
          </div>
          {onPin && (
            <button className="icon-btn" onClick={() => onPin(post.id, !post.pinned)}
              title={post.pinned ? 'Kitűző eltávolítása' : 'Kitűzés az oldal tetejére'}>
              {post.pinned ? '📌 Kitűzve' : '📌 Kitűz'}
            </button>
          )}
          {isAdmin && (
            <button className="icon-btn danger" onClick={() => onDeletePost(post.id)}>🗑 Töröl</button>
          )}
        </div>
      </div>

      <div className={`comments${commentsOpen ? ' open' : ''}`}>
        {session ? (
          <form className="comment-form" onSubmit={submitComment}>
            <div className="comment-form-row">
              <input
                className="comment-input"
                placeholder={`Írj kommentet ${session.username} néven...`}
                value={commentText}
                maxLength={2000}
                onChange={e => setCommentText(e.target.value)}
              />
              <button
                type="button"
                className="comment-attach-btn"
                title="Kép / GIF csatolása"
                disabled={imageUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {imageUploading ? '…' : '📎'}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*,.gif"
                style={{ display: 'none' }}
                onChange={handleImagePick}
              />
              <button type="submit" className="comment-submit">Küld</button>
            </div>
            {pendingImage && (
              <div className="comment-image-preview">
                <img src={pendingImage} alt="előnézet" />
                <button
                  type="button"
                  className="comment-image-preview-remove"
                  onClick={() => setPendingImage(null)}
                >✕</button>
              </div>
            )}
          </form>
        ) : (
          <div className="comment-login-nudge">
            A kommenteléshez{' '}
            <button className="inline-link" onClick={() => onOpenAuth('login')}>lépj be</button>
            {' '}vagy{' '}
            <button className="inline-link" onClick={() => onOpenAuth('register')}>regisztrálj</button>.
          </div>
        )}
        <div className="comment-list">
          {commentsLoading && (
            <div style={{ fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', padding: 12, letterSpacing: '0.1em' }}>
              [ betöltés... ]
            </div>
          )}
          {!commentsLoading && comments?.length === 0 && (
            <div style={{ fontSize: 11, color: 'var(--text-faint)', textAlign: 'center', padding: 12, letterSpacing: '0.1em' }}>
              [ nincs komment — légy te az első ]
            </div>
          )}
          {(comments || []).map(c => (
            <Comment
              key={c.id} c={c} session={session} isReply={false}
              onReply={handleReply}
              onReact={handleReactComment}
              onOpenAuth={onOpenAuth}
              onDelete={(cid) => handleDeleteComment(post.id, cid)}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      </div>
    </article>
  )
}

function sanitizeBody(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&lt;(b|i|u|s)&gt;([\s\S]*?)&lt;\/(b|i|u|s)&gt;/g, (_, open, content, close) => {
      if (open !== close) return `&lt;${open}&gt;${content}&lt;/${close}&gt;`
      return `<${open}>${content}</${close}>`
    })
}

function removeComment(list, id) {
  return list.filter(c => c.id !== id).map(c => ({ ...c, replies: removeComment(c.replies || [], id) }))
}

function addReply(list, parentId, reply) {
  return list.map(c => {
    if (c.id === parentId) return { ...c, replies: [...(c.replies || []), reply] }
    if (c.replies?.length) return { ...c, replies: addReply(c.replies, parentId, reply) }
    return c
  })
}

function updateCommentReactions(list, commentId, { reactions, myReactions }) {
  return list.map(c => {
    if (c.id === commentId) return { ...c, reactions, myReactions }
    if (c.replies?.length) return { ...c, replies: updateCommentReactions(c.replies, commentId, { reactions, myReactions }) }
    return c
  })
}
