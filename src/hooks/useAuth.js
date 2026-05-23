import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

export function useAuth() {
  const [session, setSession]   = useState(undefined) // undefined = carregando
  const [loading, setLoading]   = useState(false)
  const navigate                = useNavigate()

  // Carrega sessão inicial e escuta mudanças
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        // Sessão expirou → redireciona para login
        if (!session) navigate('/login', { replace: true })
      }
    )

    return () => subscription.unsubscribe()
  }, [navigate])

  const signIn = useCallback(async (email, password) => {
    if (!email || !password) {
      toast.error('Preencha email e senha.')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast.error('Email inválido.')
      return false
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (error) {
      const msg = error.message.includes('Invalid login')
        ? 'Email ou senha incorretos.'
        : error.message
      toast.error(msg)
      return false
    }

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
    user:          session?.user ?? null,
    isAuthenticated: !!session,
    isLoading:     session === undefined, // undefined = ainda resolvendo
    loading,
    signIn,
    signOut,
  }
}
