import { supabase, getStorageUrl } from '@/lib/supabase'

const MAX_IMAGE_SIZE = 5 * 1024 * 1024    // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024   // 50MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

export function validateFile(file) {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)

  if (!isImage && !isVideo) {
    return { ok: false, error: 'Formato não suportado. Use JPG, PNG, GIF, WebP, MP4 ou WebM.' }
  }
  if (isImage && file.size > MAX_IMAGE_SIZE) {
    return { ok: false, error: 'Imagem muito grande. Máximo 5MB.' }
  }
  if (isVideo && file.size > MAX_VIDEO_SIZE) {
    return { ok: false, error: 'Vídeo muito grande. Máximo 50MB.' }
  }
  return { ok: true, type: isImage ? 'image' : 'video' }
}

export async function uploadPostMedia(file, userId, onProgress) {
  const validation = validateFile(file)
  if (!validation.ok) throw new Error(validation.error)

  const ext = file.name.split('.').pop()
  const path = `${userId}/${Date.now()}.${ext}`
  const bucket = validation.type === 'image' ? 'post-images' : 'post-videos'

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  return {
    path: data.path,
    url: getStorageUrl(bucket, data.path),
    type: validation.type,
    bucket,
  }
}

export async function uploadAvatar(file, userId) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(file.type)) {
    throw new Error('Use JPG, PNG ou WebP para a foto de perfil.')
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('Foto de perfil: máximo 2MB.')
  }

  const ext = file.name.split('.').pop()
  const path = `${userId}/avatar.${ext}`

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { cacheControl: '3600', upsert: true })

  if (error) throw error
  return data.path
}

export async function deleteMedia(bucket, path) {
  const { error } = await supabase.storage.from(bucket).remove([path])
  if (error) throw error
}
