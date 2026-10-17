import { useEffect, useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Edit2, Camera, Calendar, Dumbbell, Flame, ChevronDown, ChevronUp } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { Avatar, Button, Input, Textarea, Modal, Alert, PageLoader, EmptyState, SkeletonCard } from '@/components/ui'
import { uploadAvatar } from '@/services/storage'
import PostCard from '@/components/feed/PostCard'

function EditProfileModal({ open, onClose, profile, onSaved }) {
  const { refreshProfile } = useAuth()
  const [form, setForm] = useState({ bio: '', full_name: '' })
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  useEffect(() => {
    if (profile) setForm({ bio: profile.bio || '', full_name: profile.full_name || '' })
  }, [profile])

  const handleAvatarChange = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      let avatarPath = profile.avatar_url
      if (avatarFile) {
        avatarPath = await uploadAvatar(avatarFile, profile.id)
      }
      await supabase.from('profiles').update({
        bio: form.bio,
        full_name: form.full_name,
        avatar_url: avatarPath,
      }).eq('id', profile.id)
      await refreshProfile()
      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || 'Erro ao salvar perfil.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Editar perfil">
      <div className="space-y-5">
        <Alert type="error" message={error} />

        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar
              profile={avatarPreview ? { ...profile, avatar_url: null } : profile}
              size="xl"
            />
            {avatarPreview && (
              <img src={avatarPreview} className="w-24 h-24 rounded-full object-cover absolute inset-0" alt="" />
            )}
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand-red flex items-center justify-center"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
          </div>
          <input ref={fileRef} type="file" className="hidden"
            accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} />
        </div>

        <Input label="Nome completo" placeholder="Seu nome"
          value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} />
        <Textarea label="Biografia" placeholder="Fale um pouco sobre você e seus objetivos..."
          rows={3} value={form.bio}
          onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} />

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} loading={saving}>Salvar</Button>
        </div>
      </div>
    </Modal>
  )
}

const WEEKDAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

function PlanRow({ plan }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-brand-text">{plan.name}</h3>

          {plan.days?.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {plan.days.map(day => (
                <span key={day} className="badge-gray text-xs">
                  {WEEKDAYS_FULL[day]}
                </span>
              ))}
            </div>
          )}

          <p className="mt-1 text-xs text-brand-sub">
            {plan.exercises?.length || 0} exercício{plan.exercises?.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="btn-ghost rounded-lg p-2 shrink-0"
          title={expanded ? 'Recolher' : 'Expandir'}
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-brand-border px-4 pb-4 pt-3 space-y-2">
          {plan.exercises?.length ? (
            plan.exercises.map((ex, i) => (
              <div key={`${ex.id || ex.name}-${i}`} className="flex items-center gap-3 rounded-lg bg-brand-card2 p-3">
                {ex.gifUrl && (
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-brand-border bg-brand-card2">
                    <img
                      src={ex.gifUrl}
                      alt={ex.name}
                      loading="lazy"
                      className="h-full w-full object-contain"
                      onError={e => { e.currentTarget.style.display = 'none' }}
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-brand-text capitalize">{ex.name}</p>
                  <p className="text-xs text-brand-sub mt-0.5">
                    {ex.sets || '—'} séries × {ex.reps || '—'} reps
                    {ex.weight ? ` — ${ex.weight} kg` : ''}
                  </p>
                  {ex.targetMuscles && (
                    <p className="text-xs text-brand-sub">{ex.targetMuscles}</p>
                  )}
                </div>
                <span className="text-xs font-bold text-brand-red shrink-0">#{i + 1}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-brand-sub">Esta ficha não possui exercícios.</p>
          )}
        </div>
      )}
    </div>
  )
}

function PlansTab({ plans, loading, isOwnProfile }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="h-4 w-40 rounded bg-brand-card2" />
            <div className="mt-2 h-3 w-24 rounded bg-brand-card2" />
          </div>
        ))}
      </div>
    )
  }

  if (plans.length === 0) {
    return (
      <EmptyState
        icon={Dumbbell}
        title="Nenhuma ficha"
        description={
          isOwnProfile
            ? 'Você ainda não criou nenhuma ficha de treino.'
            : 'Este usuário ainda não criou fichas.'
        }
      />
    )
  }

  return (
    <div className="space-y-3">
      {plans.map(plan => (
        <PlanRow key={plan.id} plan={plan} />
      ))}
    </div>
  )
}

export default function ProfilePage() {
  const { username } = useParams()
  const { user, profile: myProfile } = useAuth()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [plans, setPlans] = useState([])
  const [stats, setStats] = useState({ total: 0 })
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)
  const [plansLoading, setPlansLoading] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [activeTab, setActiveTab] = useState('posts')

  const targetUsername = username || myProfile?.username
  const isOwnProfile = !username || username === myProfile?.username

  useEffect(() => {
    if (targetUsername) loadProfile()
  }, [targetUsername])

  async function loadProfile() {
    setLoading(true)
    const { data } = await supabase.from('profiles')
      .select('*').eq('username', targetUsername).single()
    setProfile(data)
    setLoading(false)

    if (data) {
      loadPosts(data.id)
      loadStats(data.id)
      loadPlans(data.id)
    }
  }

  async function loadPosts(userId) {
    setPostsLoading(true)
    const { data } = await supabase.from('posts')
      .select(`*, profiles(id, username, avatar_url), post_likes(id, user_id), comments(id)`)
      .eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
    setPosts(data || [])
    setPostsLoading(false)
  }

  async function loadPlans(userId) {
    setPlansLoading(true)
    const { data } = await supabase
      .from('workout_plans')
      .select('id, name, days, exercises, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setPlans(data || [])
    setPlansLoading(false)
  }

  async function loadStats(userId) {
    const { count } = await supabase.from('workout_logs')
      .select('*', { count: 'exact', head: true }).eq('user_id', userId)
    setStats({ total: count || 0 })
  }

  if (loading) return <PageLoader />
  if (!profile) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      <p className="text-brand-sub">Usuário não encontrado.</p>
      <Link to="/" className="btn-primary mt-4 inline-block">Voltar ao início</Link>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header do perfil */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
          <Avatar profile={profile} size="xl" />
          <div className="flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div>
                <h1 className="font-display font-bold text-2xl text-brand-text">
                  @{profile.username}
                </h1>
                {profile.full_name && (
                  <p className="text-brand-sub text-sm">{profile.full_name}</p>
                )}
              </div>
              {isOwnProfile && (
                <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>
                  <Edit2 className="w-3 h-3" /> Editar perfil
                </Button>
              )}
            </div>

            {profile.bio && (
              <p className="text-brand-text text-sm mt-3 leading-relaxed max-w-md">{profile.bio}</p>
            )}

            <div className="flex flex-wrap gap-4 mt-4 text-sm">
              <div className="flex items-center gap-1.5 text-brand-sub">
                <Calendar className="w-4 h-4" />
                Membro desde {format(new Date(profile.created_at), "MMMM 'de' yyyy", { locale: ptBR })}
              </div>
              <div className="flex items-center gap-1.5 text-brand-red font-medium">
                <Flame className="w-4 h-4" />
                {stats.total} treinos registrados
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-brand-card2 p-1 rounded-xl w-fit">
        {[
          { key: 'posts', label: 'Publicações' },
          { key: 'fichas', label: 'Fichas' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key ? 'bg-brand-card text-brand-red shadow' : 'text-brand-sub hover:text-brand-text'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo da tab */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          {postsLoading
            ? [1,2].map(i => <SkeletonCard key={i} />)
            : posts.length === 0
            ? <EmptyState icon={Dumbbell} title="Sem publicações" description={isOwnProfile ? 'Você ainda não publicou nada.' : 'Este usuário ainda não publicou.'} />
            : posts.map(post => (
                <PostCard key={post.id} post={post}
                  onDeleted={(id) => setPosts(prev => prev.filter(p => p.id !== id))} />
              ))
          }
        </div>
      )}

      {activeTab === 'fichas' && (
        <PlansTab
          plans={plans}
          loading={plansLoading}
          isOwnProfile={isOwnProfile}
        />
      )}

      <EditProfileModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        profile={profile}
        onSaved={() => loadProfile()}
      />
    </div>
  )
}