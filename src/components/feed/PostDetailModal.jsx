import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Heart, MessageCircle, Send, MoreHorizontal, Trash2 } from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { useAuth } from '@/lib/AuthContext'
import { Avatar, Spinner } from '@/components/ui'
import { createComment, deleteComment, fetchComments, toggleLike } from '@/services/posts'
import { getStorageUrl } from '@/lib/supabase'

export default function PostDetailModal({ post, onClose, onLikesChanged, onCommentCountChanged }) {
  const { user } = useAuth()
  const [likes, setLikes] = useState(post.post_likes || [])
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const [liking, setLiking] = useState(false)
  const [error, setError] = useState('')

  const mediaUrl = useMemo(() => {
    if (!post.media_url) return null
    return post.media_url.startsWith('http')
      ? post.media_url
      : getStorageUrl(post.media_type === 'video' ? 'post-videos' : 'post-images', post.media_url)
  }, [post.media_url, post.media_type])

  const isLiked = likes.some((like) => like.user_id === user?.id)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  useEffect(() => {
    let active = true
    setLoadingComments(true)
    setError('')
    fetchComments(post.id)
      .then((data) => { if (active) setComments(data || []) })
      .catch(() => { if (active) setError('Não foi possível carregar os comentários.') })
      .finally(() => { if (active) setLoadingComments(false) })
    return () => { active = false }
  }, [post.id])

  async function handleLike() {
    if (!user || liking) return
    setLiking(true)
    const previous = likes
    const next = isLiked
      ? likes.filter((like) => like.user_id !== user.id)
      : [...likes, { user_id: user.id, id: `temp-${user.id}` }]
    setLikes(next)
    onLikesChanged?.(post.id, next)
    try {
      await toggleLike(post.id, user.id)
    } catch (err) {
      setLikes(previous)
      onLikesChanged?.(post.id, previous)
      setError(err?.message || 'Não foi possível atualizar a curtida.')
    } finally {
      setLiking(false)
    }
  }

  async function handleSendComment(event) {
    event.preventDefault()
    const content = commentText.trim()
    if (!content || !user || sending) return
    setSending(true)
    setError('')
    try {
      const created = await createComment(post.id, user.id, content)
      setComments((current) => current.some((item) => item.id === created.id) ? current : [...current, created])
      setCommentText('')
      onCommentCountChanged?.(post.id, 1)
    } catch (err) {
      setError(err?.message || 'Não foi possível enviar o comentário.')
    } finally {
      setSending(false)
    }
  }

  async function handleDeleteComment(comment) {
    if (comment.user_id !== user?.id) return
    try {
      await deleteComment(comment.id, user.id)
      setComments((current) => current.filter((item) => item.id !== comment.id))
      onCommentCountChanged?.(post.id, -1)
    } catch (err) {
      setError(err?.message || 'Não foi possível excluir o comentário.')
    }
  }

  const createdLabel = format(new Date(post.created_at), "d 'de' MMMM 'de' yyyy", { locale: ptBR })

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-0 sm:p-5 md:p-8 animate-fade-in"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Publicação ampliada"
        className="relative flex h-[100dvh] w-full max-w-6xl flex-col overflow-hidden border-brand-border bg-brand-card shadow-2xl sm:h-[min(88dvh,900px)] sm:flex-row sm:rounded-2xl sm:border"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar publicação"
          className="absolute right-3 top-3 z-20 rounded-full bg-black/65 p-2 text-white transition hover:bg-black/85 focus-visible:outline-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex min-h-0 flex-1 items-center justify-center bg-black sm:min-w-0">
          {mediaUrl && post.media_type === 'video' ? (
            <video src={mediaUrl} controls autoPlay={false} className="max-h-full w-full object-contain" preload="metadata" />
          ) : mediaUrl ? (
            <img
              src={mediaUrl}
              alt={`Publicação de @${post.profiles?.username || 'usuário'}`}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="max-h-full w-full overflow-y-auto p-8 text-center text-lg text-brand-text sm:p-12">
              {post.content || 'Publicação sem mídia'}
            </div>
          )}
        </div>

        <aside className="flex max-h-[52dvh] min-h-0 w-full flex-col border-t border-brand-border bg-brand-card sm:max-h-none sm:w-[370px] sm:min-w-[330px] sm:border-l sm:border-t-0 lg:w-[410px]">
          <header className="flex shrink-0 items-center gap-3 border-b border-brand-border px-4 py-3 pr-14">
            <Link to={`/u/${post.profiles?.username}`} onClick={onClose} className="shrink-0">
              <Avatar profile={post.profiles} size="sm" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link to={`/u/${post.profiles?.username}`} onClick={onClose} className="block truncate text-sm font-semibold text-brand-text hover:text-brand-red">
                @{post.profiles?.username || 'usuário'}
              </Link>
              <p className="text-xs text-brand-sub">{formatDistanceToNow(new Date(post.created_at), { locale: ptBR, addSuffix: true })}</p>
            </div>
            <MoreHorizontal className="h-5 w-5 text-brand-sub" />
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            {post.content && (
              <div className="mb-5 flex items-start gap-3">
                <Avatar profile={post.profiles} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-brand-text">
                    <span className="mr-2 font-semibold">@{post.profiles?.username}</span>{post.content}
                  </p>
                  <p className="mt-1 text-[11px] text-brand-sub">{formatDistanceToNow(new Date(post.created_at), { locale: ptBR, addSuffix: true })}</p>
                </div>
              </div>
            )}

            {loadingComments ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : comments.length ? (
              <div className="space-y-5">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-3">
                    <Link to={`/u/${comment.profiles?.username}`} onClick={onClose} className="shrink-0">
                      <Avatar profile={comment.profiles} size="sm" />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm leading-relaxed text-brand-text">
                        <Link to={`/u/${comment.profiles?.username}`} onClick={onClose} className="mr-2 font-semibold hover:text-brand-red">
                          @{comment.profiles?.username || 'usuário'}
                        </Link>
                        {comment.content}
                      </p>
                      <p className="mt-1 text-[11px] text-brand-sub">{formatDistanceToNow(new Date(comment.created_at), { locale: ptBR, addSuffix: true })}</p>
                    </div>
                    {comment.user_id === user?.id && (
                      <button onClick={() => handleDeleteComment(comment)} aria-label="Excluir comentário" className="p-1 text-brand-sub hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <MessageCircle className="mx-auto mb-2 h-8 w-8 text-brand-sub" />
                <p className="text-sm font-semibold text-brand-text">Nenhum comentário ainda</p>
                <p className="mt-1 text-xs text-brand-sub">Seja o primeiro a comentar.</p>
              </div>
            )}
          </div>

          <footer className="shrink-0 border-t border-brand-border">
            <div className="flex items-center gap-4 px-4 pb-2 pt-3">
              <button onClick={handleLike} disabled={!user || liking} aria-label={isLiked ? 'Descurtir publicação' : 'Curtir publicação'} className={`transition hover:scale-110 disabled:opacity-50 ${isLiked ? 'text-brand-red' : 'text-brand-text hover:text-brand-red'}`}>
                <Heart className={`h-6 w-6 ${isLiked ? 'fill-current' : ''}`} />
              </button>
              <MessageCircle className="h-6 w-6 text-brand-text" />
              <span className="text-sm font-semibold text-brand-text">{likes.length} {likes.length === 1 ? 'curtida' : 'curtidas'}</span>
            </div>
            <p className="px-4 pb-2 text-[11px] uppercase tracking-wide text-brand-sub">{createdLabel}</p>
            {error && <p role="alert" className="px-4 pb-2 text-xs text-red-400">{error}</p>}
            <form onSubmit={handleSendComment} className="flex items-center gap-2 border-t border-brand-border px-3 py-3">
              <input
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                placeholder={user ? 'Adicione um comentário...' : 'Entre para comentar'}
                aria-label="Escreva um comentário"
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-brand-text outline-none placeholder:text-brand-sub"
                maxLength={500}
                disabled={!user || sending}
              />
              <button type="submit" disabled={!commentText.trim() || !user || sending} className="rounded-lg p-2 text-brand-red transition hover:bg-brand-red/10 disabled:opacity-40" aria-label="Enviar comentário">
                {sending ? <Spinner size="sm" /> : <Send className="h-5 w-5" />}
              </button>
            </form>
          </footer>
        </aside>
      </section>
    </div>,
    document.body
  )
}
