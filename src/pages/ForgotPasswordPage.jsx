import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Flame, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button, Input, Alert } from '@/components/ui'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) { setError('Informe seu e-mail.'); return }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    })
    setLoading(false)
    if (err) setError('Erro ao enviar e-mail. Verifique o endereço.')
    else setSent(true)
  }

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-gradient mb-4">
            <Flame className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl text-brand-text">
            IRON<span className="text-brand-red">FORGE</span>
          </h1>
        </div>

        <div className="card p-6 space-y-5">
          {sent ? (
            <div className="text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center mx-auto">
                <Flame className="w-6 h-6 text-green-400" />
              </div>
              <h2 className="font-semibold text-brand-text">E-mail enviado!</h2>
              <p className="text-brand-sub text-sm">
                Verifique sua caixa de entrada e clique no link para redefinir sua senha.
              </p>
              <Link to="/login" className="btn-secondary inline-flex items-center gap-2 mt-2">
                <ArrowLeft className="w-4 h-4" /> Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <div>
                <h2 className="font-semibold text-brand-text text-lg">Recuperar senha</h2>
                <p className="text-brand-sub text-sm mt-1">
                  Informe seu e-mail e enviaremos um link para redefinir.
                </p>
              </div>
              <Alert type="error" message={error} />
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="E-mail"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button type="submit" loading={loading} className="w-full">
                  Enviar link de recuperação
                </Button>
              </form>
              <Link to="/login" className="flex items-center gap-2 text-sm text-brand-sub hover:text-brand-text transition-colors">
                <ArrowLeft className="w-4 h-4" /> Voltar ao login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
