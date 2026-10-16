import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, MessageCircle, MoreHorizontal, Trash2, Edit2, Send, Play } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/lib/AuthContext'
import { Avatar, Button, Spinner, ConfirmModal } from '@/components/ui'
import { toggleLike, fetchComments, createComment, deletePost, deleteComment } from '@/services/posts'
import { getStorageUrl } from '@/lib/supabase'
import PostDetailModal from '@/components/feed/PostDetailModal'

export default function PostCard({ post, onDeleted, compact = false }) {
  const { user, isAdmin } = useAuth()
  const [likes, setLikes] = useState(post.post_likes || [])
  const [commentCount, setCommentCount] = useState(post.comments?.length || 0)
  const [showComments, setShowComments] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const closeDetail = useCallback(() => setShowDetail(false), [])
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isLiked = likes.some(l => l.user_id === user?.id)
  const isOwner = post.user_id === user?.id
  const canDelete = isOwner || isAdmin

  const mediaUrl = post.media_url
    ? post.media_url.startsWith('http')
      ? post.media_url
      : getStorageUrl(post.media_type === 'video' ? 'post-videos' : 'post-images', post.media_url)
    : null

  const handleLike = async () => {
    if (!user) return
    const wasLiked = isLiked
    // Optimistic update
    setLikes(prev =>
      wasLiked
        ? prev.filter(l => l.user_id !== user.id)
        : [...prev, { user_id: user.id, id: 'temp' }]
    )
    try {
      await toggleLike(post.id, user.id)
    } catch {
      // Reverter
      setLikes(prev =>
        wasLiked
          ? [...prev, { user_id: user.id, id: 'temp' }]
          : prev.filter(l => l.user_id !== user.id)
      )
    }
  }

  const handleToggleComments = async () => {
    if (!showComments && comments.length === 0) {
      setLoadingComments(true)
      try {
        const data = await fetchComments(post.id)
        setComments(data)
      } catch {}
      setLoadingComments(false)
    }
    setShowComments(v => !v)
  }

  const handleSendComment = async (e) => {
    e.preventDefault()
    if (!commentText.trim() || !user) return
    setSendingComment(true)
    try {
      const comment = await createComment(post.id, user.id, commentText.trim())
      setComments(prev => [...prev, comment])
      setCommentCount(c => c + 1)
      setCommentText('')
    } catch {}
    setSendingComment(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deletePost(post.id, user.id)
      onDeleted?.(post.id)
    } catch {}
    setDeleting(false)
    setConfirmDelete(false)
  }

  return (
    <article className="card p-5 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <Link to={`/u/${post.profiles?.username}`} className="flex items-center gap-3 group">
          <Avatar profile={post.profiles} size="sm" />
          <div>
            <p className="font-medium text-brand-text text-sm group-hover:text-brand-red transition-colors">
              @{post.profiles?.username}
            </p>
            <p className="text-xs text-brand-sub">
              {formatDistanceToNow(new Date(post.created_at), { locale: ptBR, addSuffix: true })}
            </p>
          </div>
        </Link>

        {canDelete && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="btn-ghost p-1 rounded-lg"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 bg-brand-card2 border border-brand-border rounded-xl shadow-xl z-10 py-1 min-w-[140px] animate-fade-in">
                {isOwner && (
                  <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-text hover:bg-brand-muted/20 transition-colors">
                    <Edit2 className="w-4 h-4" /> Editar
                  </button>
                )}
                <button
                  onClick={() => { setMenuOpen(false); setConfirmDelete(true) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Excluir
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Conteúdo */}
      {post.content && (
        <p className="text-brand-text text-sm leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
      )}

      {/* Mídia */}
      {mediaUrl && !compact && (
        <div className="rounded-xl overflow-hidden bg-brand-card2 max-h-96">
          {post.media_type === 'video' ? (
            <video
              src={mediaUrl}
              controls
              className="w-full max-h-96 object-contain"
              preload="metadata"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowDetail(true)}
              className="group relative block w-full cursor-zoom-in bg-black text-left"
              aria-label="Abrir imagem completa e comentários"
            >
              <img
                src={mediaUrl}
                alt="Mídia da publicação. Clique para ver a imagem completa"
                className="w-full max-h-96 object-cover transition-opacity group-hover:opacity-90"
                loading="lazy"
              />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/10 group-hover:opacity-100">
                <span className="rounded-full bg-black/65 px-3 py-2 text-xs font-medium text-white">Ver publicação</span>
              </span>
            </button>
          )}
        </div>
      )}

      {/* Ações */}
      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            isLiked ? 'text-brand-red' : 'text-brand-sub hover:text-brand-red'
          }`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          <span>{likes.length}</span>
        </button>

        <button
          onClick={handleToggleComments}
          className="flex items-center gap-1.5 text-sm text-brand-sub hover:text-brand-text transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{commentCount}</span>
        </button>
      </div>

      {/* Comentários */}
      {showComments && (
        <div className="border-t border-brand-border pt-4 space-y-3">
          {loadingComments ? (
            <div className="flex justify-center py-4"><Spinner size="sm" /></div>
          ) : (
            <>
              {comments.map(c => (
                <div key={c.id} className="flex items-start gap-2.5">
                  <Avatar profile={c.profiles} size="xs" />
                  <div className="flex-1 bg-brand-card2 rounded-xl px-3 py-2">
                    <p className="text-xs font-medium text-brand-red mb-0.5">
                      @{c.profiles?.username}
                    </p>
                    <p className="text-sm text-brand-text">{c.content}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-xs text-brand-sub text-center py-2">
                  Sem comentários ainda. Seja o primeiro!
                </p>
              )}
            </>
          )}

          {/* Input comentário */}
          <form onSubmit={handleSendComment} className="flex gap-2 items-center mt-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Escreva um comentário..."
              className="input text-sm py-2 flex-1"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={!commentText.trim() || sendingComment}
              className="w-9 h-9 rounded-lg bg-brand-red flex items-center justify-center disabled:opacity-40 transition-opacity hover:bg-brand-orange"
            >
              {sendingComment ? <Spinner size="sm" className="text-white" /> : <Send className="w-4 h-4 text-white" />}
            </button>
          </form>
        </div>
      )}

      {showDetail && (
        <PostDetailModal
          post={{ ...post, post_likes: likes }}
          onClose={closeDetail}
          onLikesChanged={(_postId, nextLikes) => setLikes(nextLikes)}
          onCommentCountChanged={(_postId, delta) => setCommentCount((count) => Math.max(0, count + delta))}
        />
      )}

      {/* Confirm delete */}
      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Excluir publicação"
        message="Tem certeza que deseja excluir esta publicação? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        loading={deleting}
      />
    </article>
  )
}
