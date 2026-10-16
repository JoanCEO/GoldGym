import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Flame, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button, Input, Alert } from '@/components/ui'

export default function LoginPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.email || !form.password) {
      setError('Preencha todos os campos.')
      return
    }
    setLoading(true)
    const { error: err } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })
    setLoading(false)
    if (err) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : 'Erro ao entrar. Tente novamente.'
      )
    } else {
      navigate('/')
    }
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-gradient mb-4">
            <Flame className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl text-brand-text tracking-wide">
            Gold´s<span className="text-brand-red"> Gym</span>
          </h1>
          <p className="text-brand-sub text-sm mt-1">A comunidade fitness que treina junto.</p>
        </div>

        {/* Card */}
        <div className="card p-6 space-y-5">
          <h2 className="font-semibold text-brand-text text-lg">Entrar na conta</h2>
          <Alert type="error" message={error} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="E-mail"
              name="email"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={handleChange}
              autoComplete="email"
            />
            <div className="flex flex-col gap-1.5">
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  className="input pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-sub hover:text-brand-text transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/recuperar-senha" className="text-xs text-brand-sub hover:text-brand-red transition-colors">
                Esqueceu a senha?
              </Link>
            </div>

            <Button type="submit" loading={loading} className="w-full">
              Entrar
            </Button>
          </form>

          <div className="divider" />
          <p className="text-center text-sm text-brand-sub">
            Não tem conta?{' '}
            <Link to="/cadastro" className="text-brand-red hover:underline font-medium">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
