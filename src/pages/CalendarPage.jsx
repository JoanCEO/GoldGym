import { useEffect, useState, useRef } from 'react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isToday, isSameMonth, addMonths, subMonths,
  startOfWeek, endOfWeek, getDay, isFuture, startOfDay
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Flame, TrendingUp, CheckCircle2, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { Button, Spinner, Avatar, ConnectionStatus } from '@/components/ui'

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const FULL_WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export default function CalendarPage() {
  const { user } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [myLogs, setMyLogs] = useState(new Set())
  const [communityLogs, setCommunityLogs] = useState([])
  const [monthStats, setMonthStats] = useState({ month: 0, year: 0 })
  const [toggling, setToggling] = useState(null)
  const [connected, setConnected] = useState(true)
  const [activeTab, setActiveTab] = useState('meu')
  const channelRef = useRef(null)

  useEffect(() => {
    loadMonth()
    setupRealtime()
    return () => channelRef.current?.unsubscribe()
  }, [currentMonth, user])

  async function loadMonth() {
    if (!user) return
    const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
    const yearStart = format(new Date(currentMonth.getFullYear(), 0, 1), 'yyyy-MM-dd')

    // Meus treinos do mês
    const { data: myData } = await supabase
      .from('workout_logs')
      .select('log_date')
      .eq('user_id', user.id)
      .gte('log_date', monthStart)
      .lte('log_date', monthEnd)

    // Stats do mês e ano
    const [{ count: monthCount }, { count: yearCount }] = await Promise.all([
      supabase.from('workout_logs').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).gte('log_date', monthStart).lte('log_date', monthEnd),
      supabase.from('workout_logs').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).gte('log_date', yearStart),
    ])

    // Frequência da comunidade (semana atual)
    const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')
    const weekEnd = format(endOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd')
    const { data: communityData } = await supabase
      .from('workout_logs')
      .select('log_date, profiles(id, username, avatar_url)')
      .gte('log_date', weekStart)
      .lte('log_date', weekEnd)
      .order('log_date')

    setMyLogs(new Set(myData?.map(l => l.log_date) || []))
    setMonthStats({ month: monthCount || 0, year: yearCount || 0 })
    setCommunityLogs(communityData || [])
  }

  function setupRealtime() {
    channelRef.current = supabase
      .channel('workout-logs-calendar')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workout_logs',
      }, () => loadMonth())
      .subscribe(s => setConnected(s === 'SUBSCRIBED'))
  }

  const toggleLog = async (date) => {
    if (isFuture(startOfDay(date)) || !user) return
    const dateStr = format(date, 'yyyy-MM-dd')
    const hasTrained = myLogs.has(dateStr)
    setToggling(dateStr)

    try {
      if (hasTrained) {
        await supabase.from('workout_logs')
          .delete().eq('user_id', user.id).eq('log_date', dateStr)
        setMyLogs(prev => { const s = new Set(prev); s.delete(dateStr); return s })
        setMonthStats(s => ({ ...s, month: s.month - 1, year: s.year - 1 }))
      } else {
        await supabase.from('workout_logs')
          .insert({ user_id: user.id, log_date: dateStr })
        setMyLogs(prev => new Set([...prev, dateStr]))
        setMonthStats(s => ({ ...s, month: s.month + 1, year: s.year + 1 }))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setToggling(null)
    }
  }

  // Dias do calendário
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd })

  // Agrupar comunidade por dia da semana
  const communityByDay = FULL_WEEKDAYS.map((day, idx) => ({
    label: day,
    users: communityLogs
      .filter(l => new Date(l.log_date + 'T12:00:00').getDay() === idx)
      .reduce((acc, l) => {
        if (!acc.some(u => u.username === l.profiles?.username)) acc.push(l.profiles)
        return acc
      }, [])
  }))

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <h1 className="font-display font-bold text-2xl text-brand-text">Calendário de Treinos</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-red/10 flex items-center justify-center">
            <Flame className="w-5 h-5 text-brand-red" />
          </div>
          <div>
            <p className="text-brand-sub text-xs">Este mês</p>
            <p className="font-display font-bold text-2xl text-brand-red">{monthStats.month}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <p className="text-brand-sub text-xs">Este ano</p>
            <p className="font-display font-bold text-2xl text-orange-400">{monthStats.year}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-brand-card2 p-1 rounded-xl w-fit">
        {[
          { key: 'meu', label: 'Meu calendário' },
          { key: 'comunidade', label: 'Comunidade', icon: Users },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-brand-card text-brand-red shadow'
                : 'text-brand-sub hover:text-brand-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'meu' ? (
        /* ── Meu calendário ────────────────────────────── */
        <div className="card p-5">
          {/* Navegação */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="btn-ghost p-2 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-semibold text-brand-text capitalize">
              {format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })}
            </h2>
            <button
              onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              disabled={isSameMonth(addMonths(currentMonth, 1), addMonths(new Date(), 1))}
              className="btn-ghost p-2 rounded-lg disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Cabeçalho dias da semana */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-brand-sub py-1">{d}</div>
            ))}
          </div>

          {/* Grid calendário */}
          <div className="grid grid-cols-7 gap-1">
            {calDays.map(day => {
              const dateStr = format(day, 'yyyy-MM-dd')
              const inMonth = isSameMonth(day, currentMonth)
              const trained = myLogs.has(dateStr)
              const today = isToday(day)
              const future = isFuture(startOfDay(day))
              const isToggling = toggling === dateStr

              return (
                <button
                  key={dateStr}
                  onClick={() => !future && inMonth && toggleLog(day)}
                  disabled={future || !inMonth || isToggling}
                  className={`
                    relative h-10 w-full rounded-lg flex items-center justify-center text-sm
                    transition-all duration-150
                    ${!inMonth ? 'opacity-20 cursor-default' : ''}
                    ${future && inMonth ? 'cursor-not-allowed opacity-40' : ''}
                    ${trained ? 'bg-brand-red/20 border border-brand-red/40 text-brand-red font-semibold' : ''}
                    ${today && !trained ? 'border border-brand-muted text-brand-text' : ''}
                    ${!trained && !today && inMonth && !future ? 'hover:bg-brand-card2 text-brand-sub' : ''}
                  `}
                >
                  {isToggling ? (
                    <Spinner size="sm" />
                  ) : (
                    <>
                      {format(day, 'd')}
                      {trained && (
                        <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-red border border-brand-dark" />
                      )}
                    </>
                  )}
                </button>
              )
            })}
          </div>

          <p className="text-xs text-brand-sub text-center mt-4">
            Clique em um dia para marcar/desmarcar treino
          </p>
        </div>
      ) : (
        /* ── Frequência da comunidade ─────────────────── */
        <div className="space-y-3">
          <p className="text-sm text-brand-sub">
            Treinos da semana atual — {format(startOfWeek(new Date(), { weekStartsOn: 0 }), "dd/MM")} a {format(endOfWeek(new Date(), { weekStartsOn: 0 }), "dd/MM")}
          </p>
          {communityByDay.map(({ label, users }) => (
            <div key={label} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-brand-text text-sm">{label}</h3>
                <span className="badge-gray">{users.length} treinos</span>
              </div>
              {users.length === 0 ? (
                <p className="text-xs text-brand-sub">Nenhum registro ainda.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {users.map(u => (
                    <div key={u?.username} className="flex items-center gap-2">
                      <Avatar profile={u} size="xs" />
                      <span className="text-xs text-brand-sub">@{u?.username}</span>
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <ConnectionStatus connected={connected} />
    </div>
  )
}
