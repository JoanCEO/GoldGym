import { Loader2, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { getAvatarUrl } from '@/lib/supabase'

// ─── Spinner ────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8', xl: 'w-12 h-12' }
  return (
    <Loader2
      className={`animate-spin text-brand-red ${sizes[size]} ${className}`}
    />
  )
}

// ─── PageLoader ─────────────────────────────────────────────────────────────
export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="xl" />
        <p className="text-brand-sub text-sm">Carregando...</p>
      </div>
    </div>
  )
}

// ─── Avatar ─────────────────────────────────────────────────────────────────
export function Avatar({ profile, size = 'md', className = '' }) {
  const sizes = {
    xs: 'w-7 h-7 text-xs',
    sm: 'w-9 h-9 text-sm',
    md: 'w-11 h-11 text-base',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  }
  const url = getAvatarUrl(profile?.avatar_url, profile?.username)
  return (
    <img
      src={url}
      alt={profile?.username || 'Usuário'}
      className={`rounded-full object-cover bg-brand-card2 ${sizes[size]} ${className}`}
      onError={(e) => {
        e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${profile?.username || 'U'}&backgroundColor=E8281E&textColor=ffffff`
      }}
    />
  )
}

// ─── Button ─────────────────────────────────────────────────────────────────
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
  ...props
}) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-40',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5',
    lg: 'px-7 py-3 text-lg',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}

// ─── Input ──────────────────────────────────────────────────────────────────
export function Input({ label, error, hint, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="label">{label}</label>}
      <input className={`input ${error ? 'border-red-500/60' : ''} ${className}`} {...props} />
      {hint && !error && <p className="text-xs text-brand-sub">{hint}</p>}
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  )
}

// ─── Textarea ────────────────────────────────────────────────────────────────
export function Textarea({ label, error, className = '', rows = 3, ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="label">{label}</label>}
      <textarea
        rows={rows}
        className={`input resize-none ${error ? 'border-red-500/60' : ''} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
    </div>
  )
}

// ─── Alert ──────────────────────────────────────────────────────────────────
export function Alert({ type = 'error', message, className = '' }) {
  if (!message) return null
  const styles = {
    error: 'bg-red-500/10 border-red-500/20 text-red-400',
    success: 'bg-green-500/10 border-green-500/20 text-green-400',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
  }
  const icons = {
    error: <AlertCircle className="w-4 h-4 shrink-0" />,
    success: <CheckCircle2 className="w-4 h-4 shrink-0" />,
    info: <AlertCircle className="w-4 h-4 shrink-0" />,
  }
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${styles[type]} ${className}`}>
      {icons[type]}
      <span>{message}</span>
    </div>
  )
}

// ─── Modal ──────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, className = '' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative bg-brand-card border border-brand-border rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up ${className}`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border">
            <h2 className="font-semibold text-brand-text">{title}</h2>
            <button onClick={onClose} className="btn-ghost p-1 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ─── ConfirmModal ───────────────────────────────────────────────────────────
export function ConfirmModal({ open, onClose, onConfirm, title, message, confirmText = 'Confirmar', loading = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-brand-sub mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose} disabled={loading}>Cancelar</Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>{confirmText}</Button>
      </div>
    </Modal>
  )
}

// ─── EmptyState ─────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-2xl bg-brand-card2 border border-brand-border flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-brand-muted" />
        </div>
      )}
      <h3 className="font-semibold text-brand-text mb-1">{title}</h3>
      {description && <p className="text-brand-sub text-sm max-w-xs mb-5">{description}</p>}
      {action}
    </div>
  )
}

// ─── Skeleton ───────────────────────────────────────────────────────────────
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-11 h-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  )
}

// ─── Toggle ─────────────────────────────────────────────────────────────────
export function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-brand-red' : 'bg-brand-muted'}`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </div>
      {label && <span className="text-sm text-brand-text">{label}</span>}
    </label>
  )
}

// ─── ConnectionStatus ────────────────────────────────────────────────────────
export function ConnectionStatus({ connected }) {
  if (connected) return null
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-sm px-4 py-2 rounded-full flex items-center gap-2 animate-fade-in">
      <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
      Reconectando...
    </div>
  )
}
