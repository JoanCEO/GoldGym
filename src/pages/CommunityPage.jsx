import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Avatar, Input, Spinner, EmptyState } from '@/components/ui'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function CommunityPage() {
  const [members, setMembers] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadMembers() }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    setFiltered(members.filter(m =>
      m.username?.toLowerCase().includes(q) ||
      m.full_name?.toLowerCase().includes(q)
    ))
  }, [search, members])

  async function loadMembers() {
    setLoading(true)
    const { data } = await supabase.from('profiles')
      .select('id, username, full_name, avatar_url, created_at, bio')
      .eq('is_public', true)
      .order('created_at', { ascending: false })
      .limit(100)
    setMembers(data || [])
    setFiltered(data || [])
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-bold text-2xl text-brand-text flex items-center gap-2">
          <Users className="w-6 h-6 text-brand-red" /> Comunidade
        </h1>
        <span className="badge-gray">{members.length} membros</span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-sub" />
        <input
          className="input pl-10"
          placeholder="Buscar membros..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum membro encontrado" />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(member => (
            <Link
              key={member.id}
              to={`/u/${member.username}`}
              className="card-hover p-4 flex items-start gap-3"
            >
              <Avatar profile={member} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-brand-text truncate">@{member.username}</p>
                {member.full_name && (
                  <p className="text-xs text-brand-sub truncate">{member.full_name}</p>
                )}
                {member.bio && (
                  <p className="text-xs text-brand-sub mt-1 line-clamp-2">{member.bio}</p>
                )}
                <p className="text-xs text-brand-muted mt-1">
                  Desde {format(new Date(member.created_at), "MMM/yy", { locale: ptBR })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
