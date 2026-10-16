import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Flame } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button, Input, Alert } from '@/components/ui'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const validate = () => {
    if (!form.username.trim()) return 'Nome de usuário é obrigatório.'
    if (!/^[a-z0-9_]{3,20}$/.test(form.username))
      return 'Nome de usuário: 3–20 caracteres, letras minúsculas, números e underscore.'
    if (!form.email.trim()) return 'E-mail é obrigatório.'
    if (!form.password) return 'Senha é obrigatória.'
    if (form.password.length < 6) return 'Senha deve ter pelo menos 6 caracteres.'
    if (form.password !== form.confirm) return 'As senhas não coincidem.'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setLoading(true)
    try {
      // Verificar se username já existe
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', form.username.toLowerCase())
        .single()

      if (existing) { setError('Nome de usuário já está em uso.'); return }

      // Criar conta
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { username: form.username.toLowerCase() },
        },
      })

      if (signUpError) throw signUpError

      if (data.user) {
        // Criar perfil (trigger no Supabase também faz isso, mas garantimos aqui)
        await supabase.from('profiles').upsert({
          id: data.user.id,
          username: form.username.toLowerCase(),
          email: form.email,
        })
        setSuccess(true)
      }
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setError('Este e-mail já está cadastrado.')
      } else {
        setError(err.message || 'Erro ao criar conta. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
        <div className="card p-8 max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-green-500/15 border border-green-500/20 flex items-center justify-center mx-auto">
            <Flame className="w-7 h-7 text-green-400" />
          </div>
          <h2 className="font-semibold text-xl text-brand-text">Conta criada!</h2>
          <p className="text-brand-sub text-sm">
            Verifique seu e-mail para confirmar a conta antes de entrar.
          </p>
          <Button className="w-full" onClick={() => navigate('/login')}>
            Ir para o login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-gradient mb-4">
            <Flame className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl text-brand-text tracking-wide">
            Gold´s<span className="text-brand-red"> Gym</span>
          </h1>
          <p className="text-brand-sub text-sm mt-1">Junte-se à comunidade.</p>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-brand-text text-lg">Criar conta</h2>
          <Alert type="error" message={error} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nome de usuário"
              name="username"
              placeholder="seu_username"
              value={form.username}
              onChange={handleChange}
              hint="3–20 caracteres, apenas letras minúsculas, números e _"
              autoComplete="username"
            />
            <Input
              label="E-mail"
              name="email"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
            <Input
              label="Senha"
              name="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
            <Input
              label="Confirmar senha"
              name="confirm"
              type="password"
              placeholder="Repita a senha"
              value={form.confirm}
              onChange={handleChange}
              autoComplete="new-password"
            />
            <Button type="submit" loading={loading} className="w-full">
              Criar conta
            </Button>
          </form>

          <div className="divider" />
          <p className="text-center text-sm text-brand-sub">
            Já tem conta?{' '}
            <Link to="/login" className="text-brand-red hover:underline font-medium">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
