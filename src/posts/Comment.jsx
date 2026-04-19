import { useState, useEffect, useRef } from 'react'
import { formatDateHu, timeAgoHu } from '../data.js'

const EMOJI_SET = ['👍','❤️','🔥','😂','😮','😢','💀','👀','🙏','🎉','💯','🤡']

export default function Comment({ c, session, isReply, onReply, onReact, onOpenAuth, onDelete, isAdmin }) {
  const [showEmoji, setShowEmoji] = useState(false)
  const [replyOpen, setReplyOpen] = useState(false)
  const [replyText, setReplyText] = useState('')
  const emojiRef = useRef(null)

  useEffect(() => {
    if (!showEmoji) return
    const close = (e) => { if (emojiRef.current && !emojiRef.current.contains(e.target)) setShowEmoji(false) }
    setTimeout(() => document.addEventListener('click', close), 0)
    return () => document.removeEventListener('click', close)
  }, [showEmoji])

  const reactionEntries = Object.entries(c.reactions || {}).filter(([, cnt]) => cnt > 0)
  const myReactions = c.myReactions || []

  const submitReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim()) return
    if (!session) { onOpenAuth('login'); return }
    const reply = await onReply(c.id, replyText.trim())
    if (reply) { setReplyText(''); setReplyOpen(false) }
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
        <div className="comment-text">{c.text}</div>

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
            </div>
          </div>
          {isAdmin && (
            <button className="comment-action" style={{ color: 'var(--danger)' }} onClick={() => onDelete(c.id)}>✕ Töröl</button>
          )}
        </div>
      </div>

      {replyOpen && (
        <form className="reply-form open" onSubmit={submitReply}>
          <input
            className="comment-input"
            placeholder={`Válasz @${c.author} részére...`}
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            autoFocus
          />
          <button type="submit" className="comment-submit">Küld</button>
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
