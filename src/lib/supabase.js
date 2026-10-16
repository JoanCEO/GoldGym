import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis de ambiente do Supabase não configuradas.\n' +
    'Crie um arquivo .env com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Helper para URLs de storage
export const getStorageUrl = (bucket, path) => {
  if (!path) return null
  if (path.startsWith('http')) return path
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}

// Helper para avatar fallback
export const getAvatarUrl = (path, username) => {
  if (path) return getStorageUrl('avatars', path)
  return `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(username || 'U')}&backgroundColor=E8281E&textColor=ffffff`
}
