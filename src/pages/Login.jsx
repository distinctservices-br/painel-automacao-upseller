import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'

export default function Login() {
  const { signIn, loading, bloqueadoPor } = useAuth()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    await signIn(email, password)
  }

  const bloqueado = bloqueadoPor > 0
  const minutos   = String(Math.floor(bloqueadoPor / 60_000)).padStart(2, '0')
  const segundos  = String(Math.floor((bloqueadoPor % 60_000) / 1000)).padStart(2, '0')

  return (
    <div className="min-h-screen bg-black-1 flex items-center justify-center p-6 relative z-[1]">
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[rgba(115,243,164,0.04)] blur-[120px]" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-[12px] border border-glass-border bg-black-2 flex items-center justify-center">
            <svg viewBox="0 0 720 720" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
              <path fill="#73F3A4" d="M440.7 237.2c-13.8.5-26.7 4-38.5 10.6-11.8 6.5-22.8 14.7-33 24.4-10.2 9.8-19.5 20-28 30.8-8.5 10.8-16.4 20.7-23.6 29.6-7.2 8.9-13.9 15.6-20 20.1-6.2 4.5-11.9 5.4-17.1 2.7-3.5-1.8-6-4.6-7.6-8.6-1.6-3.9-1.8-9.3-.6-15.9 1.2-6.7 4.4-15 9.5-24.8 5.6-10.8 12.5-21.2 20.9-31.2-12.1 1.3-24.8-.8-36.4-6.9-19.1-9.9-31.2-28.1-34.1-47.9-10.5 14-19.8 28.9-28 44.6-16.1 31.2-25 59.7-26.6 85.4-1.6 25.7 2.6 47.9 12.6 66.4 10 18.6 24.4 32.7 43.2 42.4 16.2 8.4 31.2 12.4 45.2 11.9 14-.5 26.9-4 38.7-10.5 11.8-6.5 22.8-14.7 33.1-24.6 10.3-9.9 19.7-20.1 28.3-30.7 8.6-10.6 16.6-20.3 23.9-29.2 7.3-8.8 14.2-15.5 20.5-19.9 6.3-4.4 12.2-5.2 17.7-2.4 3.5 1.8 5.8 4.7 6.9 8.5 1.1 3.9.8 9-.8 15.3-1.6 6.3-5 14.4-10.1 24.2-8.7 16.7-20.1 32.7-34.4 47.9-14.3 15.1-29.3 27.8-45.2 37.9l57.5 71.5c17.2-10.5 34.8-26.1 52.8-46.9 18.1-20.7 33.7-43.8 46.8-69.2 16.3-31.5 25.2-60.1 26.6-85.7 1.4-25.7-2.9-47.8-12.9-66.4-10-18.5-24.2-32.6-42.7-42.2-15.9-8.2-30.8-12.1-44.6-11.5z"/>
              <path fill="#73F3A4" d="M320.6 163.5c26.2 13.6 36.4 45.8 22.9 72-8.4 16.2-23.9 26.3-40.8 28.4-10.4 1.3-21.2-.4-31.2-5.6-19.5-10.1-30.2-30.5-28.8-51.1.5-7.1 2.4-14.2 5.9-20.9 13.6-26.2 45.8-36.5 72-22.8z"/>
            </svg>
          </div>
          <div className="text-center">
            <h1 className="font-display font-bold text-2xl tracking-tight text-white-1">Upseller</h1>
            <p className="text-muted text-[13px] mt-1">Painel de Controle — Distinct Services</p>
          </div>
        </div>

        {/* Card */}
        <div className="glass-card p-8 animate-slide-up">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-[0.07em] font-medium text-muted">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@empresa.com.br"
                className="
                  w-full bg-surface border border-[rgba(250,250,250,0.08)] text-white-1
                  rounded-[10px] px-3 py-2.5 text-[13px] font-body outline-none
                  focus:border-[rgba(115,243,164,0.45)] focus:ring-2 focus:ring-[rgba(115,243,164,0.10)]
                  transition-all duration-150 placeholder:text-muted-light
                "
                disabled={loading}
                required
              />
            </div>

            {/* Senha */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-[0.07em] font-medium text-muted">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="
                    w-full bg-surface border border-[rgba(250,250,250,0.08)] text-white-1
                    rounded-[10px] px-3 py-2.5 pr-10 text-[13px] font-body outline-none
                    focus:border-[rgba(115,243,164,0.45)] focus:ring-2 focus:ring-[rgba(115,243,164,0.10)]
                    transition-all duration-150 placeholder:text-muted-light
                  "
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white-1 transition-colors"
                >
                  <i className={`ti ti-${showPass ? 'eye-off' : 'eye'} text-[16px]`} />
                </button>
              </div>
            </div>

            {/* Aviso de bloqueio */}
            {bloqueado && (
              <div className="flex items-center gap-2 rounded-[10px] border border-[rgba(255,80,80,0.25)] bg-[rgba(255,80,80,0.08)] px-3 py-2.5">
                <i className="ti ti-lock text-[15px] text-red-400 shrink-0" />
                <p className="text-[12px] text-red-300 leading-tight">
                  Muitas tentativas incorretas. Aguarde{' '}
                  <span className="font-semibold tabular-nums">{minutos}:{segundos}</span>{' '}
                  para tentar novamente.
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || bloqueado}
              className="
                mt-1 w-full flex items-center justify-center gap-2
                bg-primary text-black-1 font-semibold text-[13px] rounded-full
                py-2.5 transition-all duration-150
                hover:shadow-glow hover:-translate-y-px
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none
                btn-glow
              "
            >
              {loading ? (
                <i className="ti ti-loader-2 animate-spin text-[16px]" />
              ) : bloqueado ? (
                <>
                  <i className="ti ti-lock text-[16px]" />
                  Bloqueado
                </>
              ) : (
                <>
                  <i className="ti ti-login text-[16px]" />
                  Entrar
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-muted-light text-[11px] mt-6">
          Acesso restrito — apenas administradores
        </p>
      </div>
    </div>
  )
}
