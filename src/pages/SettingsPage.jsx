import { useState } from 'react'
import { Shield, Eye, Bell, Lock } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/AuthContext'
import { Toggle, Button, Alert, Input } from '@/components/ui'

export default function SettingsPage() {
  const { user, profile, refreshProfile } = useAuth()
  const [isPublic, setIsPublic] = useState(profile?.is_public ?? true)
  const [showFrequency, setShowFrequency] = useState(profile?.show_frequency ?? true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')

  const savePrivacy = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    const { error: err } = await supabase.from('profiles').update({
      is_public: isPublic,
      show_frequency: showFrequency,
    }).eq('id', user.id)
    setSaving(false)
    if (err) setError('Erro ao salvar configurações.')
    else { setSuccess('Configurações salvas!'); refreshProfile() }
  }

  const changePassword = async () => {
    setPwError('')
    setPwSuccess('')
    if (!pwForm.next || pwForm.next.length < 6) { setPwError('Senha deve ter pelo menos 6 caracteres.'); return }
    if (pwForm.next !== pwForm.confirm) { setPwError('As senhas não coincidem.'); return }
    setPwLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password: pwForm.next })
    setPwLoading(false)
    if (err) setPwError(err.message || 'Erro ao alterar senha.')
    else { setPwSuccess('Senha alterada com sucesso!'); setPwForm({ current: '', next: '', confirm: '' }) }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="font-display font-bold text-2xl text-brand-text">Configurações</h1>

      {/* Privacidade */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-brand-text flex items-center gap-2">
          <Eye className="w-4 h-4 text-brand-red" /> Privacidade
        </h2>
        <div className="space-y-3">
          <Toggle checked={isPublic} onChange={setIsPublic} label="Perfil público (outros podem ver seu perfil)" />
          <Toggle checked={showFrequency} onChange={setShowFrequency} label="Mostrar frequência de treinos na comunidade" />
        </div>
        <Alert type="error" message={error} />
        <Alert type="success" message={success} />
        <Button onClick={savePrivacy} loading={saving} size="sm">Salvar preferências</Button>
      </div>

      {/* Alterar senha */}
      <div className="card p-5 space-y-4">
        <h2 className="font-semibold text-brand-text flex items-center gap-2">
          <Lock className="w-4 h-4 text-brand-red" /> Alterar senha
        </h2>
        <Input label="Nova senha" type="password" placeholder="Mínimo 6 caracteres"
          value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} />
        <Input label="Confirmar nova senha" type="password" placeholder="Repita a nova senha"
          value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
        <Alert type="error" message={pwError} />
        <Alert type="success" message={pwSuccess} />
        <Button onClick={changePassword} loading={pwLoading} size="sm">Alterar senha</Button>
      </div>

      {/* Info da conta */}
      <div className="card p-5 space-y-2">
        <h2 className="font-semibold text-brand-text flex items-center gap-2">
          <Shield className="w-4 h-4 text-brand-red" /> Conta
        </h2>
        <p className="text-sm text-brand-sub">E-mail: <span className="text-brand-text">{user?.email}</span></p>
        <p className="text-sm text-brand-sub">Username: <span className="text-brand-text">@{profile?.username}</span></p>
        <p className="text-sm text-brand-sub">Função: <span className="text-brand-text capitalize">{profile?.role || 'member'}</span></p>
      </div>
    </div>
  )
}
