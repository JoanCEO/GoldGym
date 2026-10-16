import { supabase } from '@/lib/supabase'

// Buscar posts paginados
export async function fetchPosts({ page = 0, pageSize = 10 } = {}) {
  const from = page * pageSize
  const to = from + pageSize - 1

  const { data, error, count } = await supabase
    .from('posts')
    .select(`
      *,
      profiles(id, username, avatar_url),
      post_likes(id, user_id),
      comments(id)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) throw error
  return { data, count, hasMore: (from + data.length) < count }
}

// Criar post
export async function createPost({ userId, content, mediaUrl, mediaType }) {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      content,
      media_url: mediaUrl || null,
      media_type: mediaType || null,
    })
    .select(`*, profiles(id, username, avatar_url), post_likes(id, user_id), comments(id)`)
    .single()

  if (error) throw error
  return data
}

// Atualizar post
export async function updatePost(postId, userId, { content }) {
  const { data, error } = await supabase
    .from('posts')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', postId)
    .eq('user_id', userId) // RLS duplo check
    .select()
    .single()

  if (error) throw error
  return data
}

// Deletar post
export async function deletePost(postId, userId) {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId)

  if (error) throw error
}

// Toggle like
export async function toggleLike(postId, userId) {
  const { data: existing } = await supabase
    .from('post_likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .single()

  if (existing) {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('id', existing.id)
    if (error) throw error
    return false // unliked
  } else {
    const { error } = await supabase
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId })
    if (error) throw error
    return true // liked
  }
}

// Buscar comentários de um post
export async function fetchComments(postId) {
  const { data, error } = await supabase
    .from('comments')
    .select(`*, profiles(id, username, avatar_url)`)
    .eq('post_id', postId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data
}

// Criar comentário
export async function createComment(postId, userId, content) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: userId, content })
    .select(`*, profiles(id, username, avatar_url)`)
    .single()

  if (error) throw error
  return data
}

// Deletar comentário
export async function deleteComment(commentId, userId) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId)

  if (error) throw error
}
