import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home, Rss, Calendar, Dumbbell, Users, User,
  Settings, LogOut, Menu, X, Plus, Flame
} from 'lucide-react'
import { useAuth } from '@/lib/AuthContext'
import { Avatar } from '@/components/ui'
import CreatePostModal from '@/components/feed/CreatePostModal'

const navItems = [
  { to: '/',           icon: Home,     label: 'Início' },
  { to: '/feed',       icon: Rss,      label: 'Feed' },
  { to: '/calendario', icon: Calendar, label: 'Calendário' },
  { to: '/fichas',     icon: Dumbbell, label: 'Minhas fichas' },
  { to: '/comunidade', icon: Users,    label: 'Comunidade' },
  { to: '/perfil',     icon: User,     label: 'Meu perfil' },
  { to: '/config',     icon: Settings, label: 'Configurações' },
]

function NavLink({ to, icon: Icon, label, onClick }) {
  const { pathname } = useLocation()
  const active = pathname === to || (to !== '/' && pathname.startsWith(to))
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
        active
          ? 'bg-brand-red/10 text-brand-red'
          : 'text-brand-sub hover:text-brand-text hover:bg-brand-card2'
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-brand-red' : 'text-current'}`} />
      <span className="text-sm font-medium">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-red" />}
    </Link>
  )
}

export default function AppLayout({ children }) {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-brand-dark">
      {/* ── Sidebar Desktop ──────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-brand-border bg-brand-card fixed top-0 left-0 h-full z-30">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-brand-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-brand-text tracking-wide">
              IRON<span className="text-brand-red">FORGE</span>
            </span>
          </Link>
        </div>

        {/* Botão criar publicação */}
        <div className="px-4 py-4">
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary w-full flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova publicação
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink key={item.to} {...item} />
          ))}
        </nav>

        {/* Perfil do usuário */}
        <div className="px-4 py-4 border-t border-brand-border">
          <Link
            to="/perfil"
            className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-brand-card2 transition-colors"
          >
            <Avatar profile={profile} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-text truncate">
                {profile?.username || 'Usuário'}
              </p>
              <p className="text-xs text-brand-sub truncate">
                {profile?.role === 'admin' ? 'Administrador' : 'Membro'}
              </p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="btn-ghost w-full flex items-center gap-3 mt-1 text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Overlay mobile ───────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar Mobile ───────────────────────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-brand-card border-r border-brand-border z-50 lg:hidden
          transform transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-5 py-5 border-b border-brand-border">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center">
              <Flame className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-brand-text">
              IRON<span className="text-brand-red">FORGE</span>
            </span>
          </div>
          <button onClick={() => setMobileOpen(false)} className="btn-ghost p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-4 py-4">
          <button
            onClick={() => { setShowCreate(true); setMobileOpen(false) }}
            className="btn-primary w-full flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova publicação
          </button>
        </div>

        <nav className="px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.to} {...item} onClick={() => setMobileOpen(false)} />
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 px-4 py-4 border-t border-brand-border bg-brand-card">
          <Link
            to="/perfil"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-brand-card2 transition-colors"
          >
            <Avatar profile={profile} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-brand-text truncate">
                {profile?.username || 'Usuário'}
              </p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            className="btn-ghost w-full flex items-center gap-3 mt-1 text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* ── Conteúdo principal ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Topbar mobile */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-brand-border bg-brand-card sticky top-0 z-20">
          <button onClick={() => setMobileOpen(true)} className="btn-ghost p-2 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-bold text-lg text-brand-text">
            IRON<span className="text-brand-red">FORGE</span>
          </span>
          <button
            onClick={() => setShowCreate(true)}
            className="w-9 h-9 rounded-full bg-brand-gradient flex items-center justify-center"
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </header>

        {/* Página */}
        <main className="flex-1 animate-fade-in">
          {children}
        </main>
      </div>

      {/* ── Modal criar post ─────────────────────────────────────────── */}
      <CreatePostModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  )
}
