import { useEffect, useState, useCallback, useRef } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { fetchPosts } from '@/services/posts'
import { Button, SkeletonCard, EmptyState, ConnectionStatus } from '@/components/ui'
import PostCard from '@/components/feed/PostCard'
import CreatePostModal from '@/components/feed/CreatePostModal'
import { Rss } from 'lucide-react'

export default function FeedPage() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [newPostsCount, setNewPostsCount] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [connected, setConnected] = useState(true)
  const channelRef = useRef(null)
  const newPostIds = useRef(new Set())

  // Carregar posts iniciais
  useEffect(() => {
    loadPosts()
    setupRealtime()
    return () => channelRef.current?.unsubscribe()
  }, [])

  async function loadPosts() {
    setLoading(true)
    try {
      const result = await fetchPosts({ page: 0 })
      setPosts(result.data)
      setHasMore(result.hasMore)
      setPage(0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const nextPage = page + 1
      const result = await fetchPosts({ page: nextPage })
      setPosts(prev => {
        const existingIds = new Set(prev.map(p => p.id))
        const newPosts = result.data.filter(p => !existingIds.has(p.id))
        return [...prev, ...newPosts]
      })
      setHasMore(result.hasMore)
      setPage(nextPage)
    } catch {}
    setLoadingMore(false)
  }

  function setupRealtime() {
    channelRef.current = supabase
      .channel('feed-posts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
      }, (payload) => {
        const newId = payload.new.id
        // Evitar duplicatas
        if (newPostIds.current.has(newId)) return
        newPostIds.current.add(newId)
        // Só notificar de posts de outros usuários
        if (payload.new.user_id !== user?.id) {
          setNewPostsCount(c => c + 1)
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'posts',
      }, (payload) => {
        setPosts(prev => prev.filter(p => p.id !== payload.old.id))
      })
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })
  }

  const handleNewPost = (post) => {
    newPostIds.current.add(post.id)
    setPosts(prev => [post, ...prev])
    setShowCreate(false)
  }

  const handlePostDeleted = (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  const handleLoadNew = () => {
    loadPosts()
    setNewPostsCount(0)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display font-bold text-2xl text-brand-text">Feed</h1>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" /> Publicar
        </Button>
      </div>

      {/* Banner novos posts */}
      {newPostsCount > 0 && (
        <button
          onClick={handleLoadNew}
          className="w-full mb-4 py-2.5 px-4 rounded-xl bg-brand-red/10 border border-brand-red/20 text-brand-red text-sm font-medium hover:bg-brand-red/15 transition-colors flex items-center justify-center gap-2 animate-fade-in"
        >
          <RefreshCw className="w-4 h-4" />
          {newPostsCount} nova{newPostsCount > 1 ? 's' : ''} publicação{newPostsCount > 1 ? 'ões' : ''}
        </button>
      )}

      {/* Posts */}
      <div className="space-y-4">
        {loading ? (
          [1, 2, 3].map(i => <SkeletonCard key={i} />)
        ) : posts.length === 0 ? (
          <EmptyState
            icon={Rss}
            title="Nenhuma publicação ainda"
            description="Seja o primeiro a compartilhar seu treino com a comunidade!"
            action={
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4" /> Criar publicação
              </Button>
            }
          />
        ) : (
          <>
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                onDeleted={handlePostDeleted}
              />
            ))}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button variant="secondary" onClick={loadMore} loading={loadingMore}>
                  Carregar mais
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <ConnectionStatus connected={connected} />
      <CreatePostModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={handleNewPost} />
    </div>
  )
}
