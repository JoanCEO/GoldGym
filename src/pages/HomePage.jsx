import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Flame, TrendingUp, Users, ArrowRight, Dumbbell } from 'lucide-react'
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { Avatar, Skeleton } from '@/components/ui'
import PostCard from '@/components/feed/PostCard'

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export default function HomePage() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [weekLogs, setWeekLogs] = useState([])
  const [communityFreq, setCommunityFreq] = useState([])
  const [recentPosts, setRecentPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 })
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  useEffect(() => {
    if (user) loadDashboard()
  }, [user])

  async function loadDashboard() {
    setLoading(true)
    await Promise.all([loadStats(), loadWeekLogs(), loadCommunityFreq(), loadRecentPosts()])
    setLoading(false)
  }

  async function loadStats() {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]

    const [monthRes, yearRes] = await Promise.all([
      supabase.from('workout_logs').select('id', { count: 'exact' })
        .eq('user_id', user.id).gte('log_date', monthStart),
      supabase.from('workout_logs').select('id', { count: 'exact' })
        .eq('user_id', user.id).gte('log_date', yearStart),
    ])
    setStats({
      month: monthRes.count || 0,
      year: yearRes.count || 0,
    })
  }

  async function loadWeekLogs() {
    const { data } = await supabase
      .from('workout_logs')
      .select('log_date')
      .eq('user_id', user.id)
      .gte('log_date', weekStart.toISOString().split('T')[0])
      .lte('log_date', weekEnd.toISOString().split('T')[0])
    setWeekLogs(data?.map(l => l.log_date) || [])
  }

  async function loadCommunityFreq() {
    const { data } = await supabase
      .from('workout_logs')
      .select('log_date, profiles(username, avatar_url)')
      .gte('log_date', weekStart.toISOString().split('T')[0])
      .lte('log_date', weekEnd.toISOString().split('T')[0])
      .order('log_date', { ascending: true })
      .limit(30)
    setCommunityFreq(data || [])
  }

  async function loadRecentPosts() {
    const { data } = await supabase
      .from('posts')
      .select(`
        *,
        profiles(id, username, avatar_url),
        post_likes(id, user_id),
        comments(id)
      `)
      .order('created_at', { ascending: false })
      .limit(3)
    setRecentPosts(data || [])
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Saudação */}
      <div className="flex items-center gap-4">
        <Avatar profile={profile} size="lg" />
        <div>
          <h1 className="font-display font-bold text-2xl text-brand-text">
            Fala, <span className="text-brand-gradient">@{profile?.username}</span>!
          </h1>
          <p className="text-brand-sub text-sm mt-0.5">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Treinos no mês',
            value: loading ? '—' : stats?.month,
            icon: Flame,
            color: 'text-brand-red',
          },
          {
            label: 'Treinos no ano',
            value: loading ? '—' : stats?.year,
            icon: TrendingUp,
            color: 'text-orange-400',
          },
          {
            label: 'Na semana',
            value: loading ? '—' : weekLogs.length,
            icon: Calendar,
            color: 'text-blue-400',
          },
          {
            label: 'Comunidade',
            value: loading ? '—' : communityFreq.length,
            icon: Users,
            color: 'text-green-400',
          },
        ].map((stat) => (
          <div key={stat.label} className="card p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-brand-sub text-xs">{stat.label}</p>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className={`font-display font-bold text-3xl ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Semana atual */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-brand-text">Minha semana</h2>
          <Link to="/calendario" className="text-xs text-brand-sub hover:text-brand-red flex items-center gap-1 transition-colors">
            Ver calendário <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const trained = weekLogs.includes(dateStr)
            const today = isToday(day)
            return (
              <div
                key={dateStr}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all ${
                  trained
                    ? 'bg-brand-red/15 border border-brand-red/30'
                    : today
                    ? 'bg-brand-card2 border border-brand-muted'
                    : 'bg-brand-card2 border border-transparent'
                }`}
              >
                <span className="text-xs text-brand-sub">{DAYS_PT[day.getDay()]}</span>
                <span className={`font-semibold text-sm ${trained ? 'text-brand-red' : today ? 'text-brand-text' : 'text-brand-sub'}`}>
                  {format(day, 'd')}
                </span>
                {trained && <div className="w-2 h-2 rounded-full bg-brand-red" />}
              </div>
            )
          })}
        </div>
      </div>

      {/* Frequência da comunidade */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-brand-text flex items-center gap-2">
            <Users className="w-4 h-4 text-brand-red" />
            Comunidade esta semana
          </h2>
          <Link to="/comunidade" className="text-xs text-brand-sub hover:text-brand-red flex items-center gap-1 transition-colors">
            Ver tudo <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {loading ? (
          <div className="flex gap-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="w-9 h-9 rounded-full" />)}
          </div>
        ) : communityFreq.length === 0 ? (
          <p className="text-brand-sub text-sm">Nenhum treino registrado esta semana ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {[...new Map(communityFreq.map(l => [l.profiles?.username, l])).values()].map(log => (
              <Link key={log.profiles?.username} to={`/u/${log.profiles?.username}`} className="group flex flex-col items-center gap-1">
                <div className="relative">
                  <Avatar profile={log.profiles} size="sm" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-brand-red border-2 border-brand-dark" />
                </div>
                <span className="text-xs text-brand-sub group-hover:text-brand-text transition-colors">
                  {log.profiles?.username}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Posts recentes */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-brand-text flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-brand-red" />
            Publicações recentes
          </h2>
          <Link to="/feed" className="text-xs text-brand-sub hover:text-brand-red flex items-center gap-1 transition-colors">
            Ver feed <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="space-y-4">
          {loading
            ? [1,2].map(i => <div key={i} className="card p-5 h-32 animate-pulse bg-brand-card" />)
            : recentPosts.length === 0
            ? <p className="text-brand-sub text-sm">Nenhuma publicação ainda. Seja o primeiro!</p>
            : recentPosts.map(post => <PostCard key={post.id} post={post} compact />)
          }
        </div>
      </div>
    </div>
  )
}
