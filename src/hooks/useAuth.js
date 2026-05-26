import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

// ── Proteção contra brute-force ──────────────────────────────────────────────
// Máximo de tentativas antes de bloquear temporariamente
const MAX_TENTATIVAS   = 5
const BLOQUEIO_MS      = 5 * 60 * 1000 // 5 minutos
const CHAVE_TENTATIVAS = '_dst_login_attempts'
const CHAVE_BLOQUEIO   = '_dst_login_blocked_until'

function getTentativas() {
  return parseInt(sessionStorage.getItem(CHAVE_TENTATIVAS) ?? '0', 10)
}
function setBloqueio() {
  const ate = Date.now() + BLOQUEIO_MS
  sessionStorage.setItem(CHAVE_BLOQUEIO, String(ate))
  sessionStorage.setItem(CHAVE_TENTATIVAS, '0')
}
function getBloqueioRestante() {
  const ate = parseInt(sessionStorage.getItem(CHAVE_BLOQUEIO) ?? '0', 10)
  const restante = ate - Date.now()
  return restante > 0 ? restante : 0
}
function registrarFalha() {
  const t = getTentativas() + 1
  sessionStorage.setItem(CHAVE_TENTATIVAS, String(t))
  if (t >= MAX_TENTATIVAS) setBloqueio()
  return t
}
function limparContador() {
  sessionStorage.removeItem(CHAVE_TENTATIVAS)
  sessionStorage.removeItem(CHAVE_BLOQUEIO)
}
// ─────────────────────────────────────────────────────────────────────────────

export function useAuth() {
  const [session, setSession]         = useState(undefined)
  const [loading, setLoading]         = useState(false)
  const [bloqueadoPor, setBloqueadoPor] = useState(0) // ms restantes de bloqueio
  const navigate                      = useNavigate()
  const timerRef                      = useRef(null)

  // Countdown reativo do bloqueio
  useEffect(() => {
    const restante = getBloqueioRestante()
    if (restante > 0) {
      setBloqueadoPor(restante)
      timerRef.current = setInterval(() => {
        const r = getBloqueioRestante()
        setBloqueadoPor(r)
        if (r <= 0) clearInterval(timerRef.current)
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [])

  // Carrega sessão inicial e escuta mudanças
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        if (!session) navigate('/login', { replace: true })
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate])

  const signIn = useCallback(async (email, password) => {
    // 1. Bloquear se ainda em cooldown
    const restante = getBloqueioRestante()
    if (restante > 0) {
      const min = Math.ceil(restante / 60_000)
      toast.error(`Muitas tentativas. Aguarde ${min} minuto${min > 1 ? 's' : ''} para tentar novamente.`)
      return false
    }

    // 2. Validação local (sem chamar a API)
    if (!email?.trim() || !password?.trim()) {
      toast.error('Preencha email e senha.')
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      toast.error('Email inválido.')
      return false
    }
    // Rejeita senhas obviamente curtas demais (nunca válidas no Supabase)
    if (password.length < 6) {
      toast.error('Senha incorreta.')
      return false
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password,
    })
    setLoading(false)

    if (error) {
      const tentativas = registrarFalha()
      const restanteNovo = getBloqueioRestante()

      if (restanteNovo > 0) {
        // Acabou de bloquear
        const min = Math.ceil(restanteNovo / 60_000)
        setBloqueadoPor(restanteNovo)
        timerRef.current = setInterval(() => {
          const r = getBloqueioRestante()
          setBloqueadoPor(r)
          if (r <= 0) clearInterval(timerRef.current)
        }, 1000)
        toast.error(`Conta bloqueada por ${min} minuto${min > 1 ? 's' : ''} devido a muitas tentativas.`)
      } else {
        const restam = MAX_TENTATIVAS - tentativas
        const msg = error.message.toLowerCase().includes('invalid login')
          ? restam > 0
            ? `Email ou senha incorretos. ${restam} tentativa${restam > 1 ? 's' : ''} restante${restam > 1 ? 's' : ''}.`
            : 'Email ou senha incorretos.'
          : 'Erro ao realizar login. Tente novamente.'
        toast.error(msg)
      }
      return false
    }

    // Sucesso — limpa contador
    limparContador()
    toast.success('Login realizado!')
    navigate('/', { replace: true })
    return true
  }, [navigate])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }, [navigate])

  return {
    session,
    user:            session?.user ?? null,
    isAuthenticated: !!session,
    isLoading:       session === undefined,
    loading,
    bloqueadoPor,    // ms — use para mostrar countdown no Login se quiser
    signIn,
    signOut,
  }
}
