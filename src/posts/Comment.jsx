import { useState, useEffect, useRef } from 'react'
import { formatDateHu, timeAgoHu } from '../data.js'
import { toast } from '../effects.js'
import { uploadFile, customEmojiApi } from '../api.js'

const EMOJI_SET = ['👍','❤️','🔥','😂','😮','😢','💀','👀','🙏','🎉','💯','🤡']

let _customEmojisCache = null
function useCustomEmojis() {
  const [emojis, setEmojis] = useState(_customEmojisCache || [])
  useEffect(() => {
    if (_customEmojisCache) return
    customEmojiApi.list()
      .then(data => { _customEmojisCache = data || []; setEmojis(_customEmojisCache) })
      .catch(() => { _customEmojisCache = [] })
  }, [])
  return emojis
}

const IMG_TAG_RE = /\[img:([^\]]+)\]/g
const EMOJI_TAG_RE = /\[emoji:[^:]+:([^\]]+)\]/g

function renderCommentText(text) {
  if (!text) return null
  const parts = []
  let last = 0
  const combined = /\[img:([^\]]+)\]|\[emoji:[^:]+:([^\]]+)\]/g
  let m
  while ((m = combined.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[1]) {
      parts.push(<img key={m.index} src={m[1]} className="comment-img" alt="kép" onClick={() => window.open(m[1], '_blank')} />)
    } else if (m[2]) {
      parts.push(<img key={m.index} src={m[2]} className="emoji-inline" alt="emoji" />)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export default function Comment({ c, session, isReply, onReply, onReact, onOpenAuth, onDelete, isAdmin }) {
  const [showEmoji, setShowEmoji] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replyImage, setReplyImage] = useState(null)
  const [replyUploading, setReplyUploading] = useState(false)
  const emojiRef = useRef(null)
  const replyFileRef = useRef(null)
  const customEmojis = useCustomEmojis()

  useEffect(() => {
    if (!showEmoji) return
    const close = (e) => { if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false) }
    setTimeout(() => document.addEventListener('click', close), 0)
    return () => document.removeEventListener('click', close)
  }, [showEmoji])

  const reactionEntries = Object.entries(c.reactions || {}).filter(([, cnt]) => cnt > 0)
  const myReactions = c.myReactions || []

  const handleReplyImagePick = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReplyUploading(true)
    try {
      const data = await uploadFile(file)
      setReplyImage(data.url)
    } catch (err) {
      toast(err.message || 'Feltöltési hiba', 'err')
    } finally {
      setReplyUploading(false)
      e.target.value = ''
    }
  }

  const submitReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim() && !replyImage) return
    if (!session) { onOpenAuth('login'); return }
    const text = replyText.trim() + (replyImage ? `\n[img:${replyImage}]` : '')
    const reply = await onReply(c.id, text)
    if (reply) { setReplyText(''); setReplyOpen(false); setReplyImage(null) }
  }

  return (
    <>
      <div className={`comment${isReply ? ' is-reply' : ''}`}>
        <div className="comment-head">
          <span className={`comment-author${c.authorIsAdmin ? ' admin-author' : ''}`}>{c.author}</span>
          <span className="comment-time" title={formatDateHu(c.createdAt)}>
            {timeAgoHu(c.createdAt)} · {formatDateHu(c.createdAt)}
          </span>
        </div>
        <div className="comment-text">{renderCommentText(c.text)}</div>

        {reactionEntries.length > 0 && (
          <div className="comment-reactions">
            {reactionEntries.map(([em, cnt]) => (
              <button
                key={em}
                className={`comment-react${myReactions.includes(em) ? ' reacted' : ''}`}
                onClick={() => {
                  if (!session) return onOpenAuth('login')
                  onReact(c.id, em)
                }}
              >
                <span>{em}</span><span className="c">{cnt}</span>
              </button>
            ))}
          </div>
        )}

        <div className="comment-actions">
          {!isReply && (
            <button className="comment-action" onClick={() => {
              if (!session) return onOpenAuth('login')
              setReplyOpen(o => !o)
            }}>↵ Válasz</button>
          )}
          <div className="emoji-picker-wrap" ref={emojiRef}>
            <button className="comment-action" onClick={() => {
              if (!session) return onOpenAuth('login')
              setShowEmoji(o => !o)
            }}>☺ Reakció</button>
            <div className={`emoji-picker${showEmoji ? ' open' : ''}`}>
              {EMOJI_SET.map(em => (
                <button key={em} className="emoji-pick" onClick={() => { onReact(c.id, em); setShowEmoji(false) }}>{em}</button>
              ))}
              {customEmojis.length > 0 && (
                <>
                  <div style={{ width: '100%', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
                  {customEmojis.map(ce => (
                    <button
                      key={ce.id}
                      className="emoji-pick"
                      title={ce.name}
                      onClick={() => { onReact(c.id, `[emoji:${ce.name}:${ce.url}]`); setShowEmoji(false) }}
                    >
                      <img src={ce.url} alt={ce.name} style={{ width: 20, height: 20, objectFit: 'contain' }} />
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
          {isAdmin && (
            <button className="comment-action" style={{ color: 'var(--danger)' }} onClick={() => onDelete(c.id)}>✕ Töröl</button>
          )}
        </div>
      </div>

      {replyOpen && (
        <form className="reply-form open" onSubmit={submitReply}>
          <div className="comment-form-row">
            <input
              className="comment-input"
              placeholder={`Válasz @${c.author} részére...`}
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              autoFocus
            />
            <button
              type="button"
              className="comment-attach-btn"
              title="Kép / GIF csatolása"
              disabled={replyUploading}
              onClick={() => replyFileRef.current?.click()}
            >
              {replyUploading ? '…' : '📎'}
            </button>
            <input
              type="file"
              ref={replyFileRef}
              accept="image/*,.gif"
              style={{ display: 'none' }}
              onChange={handleReplyImagePick}
            />
            <button type="submit" className="comment-submit">Küld</button>
          </div>
          {replyImage && (
            <div className="comment-image-preview">
              <img src={replyImage} alt="előnézet" />
              <button type="button" className="comment-image-preview-remove" onClick={() => setReplyImage(null)}>✕</button>
            </div>
          )}
        </form>
      )}

      {(c.replies || []).map(r => (
        <Comment
          key={r.id} c={r} session={session} isReply={true}
          onReply={onReply} onReact={onReact} onOpenAuth={onOpenAuth}
          onDelete={onDelete} isAdmin={isAdmin}
        />
      ))}
    </>
  )
}
