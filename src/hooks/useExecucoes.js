import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

/** Retorna data de início do período selecionado em ISO string */
function periodoInicio(periodo) {
  const agora = new Date()
  if (periodo === 'hoje') {
    agora.setHours(0, 0, 0, 0)
    return agora.toISOString()
  }
  if (periodo === '7d') {
    agora.setDate(agora.getDate() - 7)
    return agora.toISOString()
  }
  if (periodo === 'mes') {
    agora.setDate(1)
    agora.setHours(0, 0, 0, 0)
    return agora.toISOString()
  }
  return null
}

/** Calcula métricas a partir das execuções retornadas */
export function calcMetricas(execucoes) {
  const hoje = new Date().toISOString().slice(0, 10)

  const deHoje = execucoes.filter(
    (e) => (e.hoje ?? e.data_execucao?.slice(0, 10)) === hoje
  )

  const total7d = execucoes.reduce((s, e) => s + (e.total_impresso ?? 0), 0)

  const totalHoje = deHoje.reduce((s, e) => s + (e.total_impresso ?? 0), 0)

  const concluidos = execucoes.filter((e) => e.status === 'concluido').length
  const taxaSucesso = execucoes.length
    ? Math.round((concluidos / execucoes.length) * 100)
    : 0

  const falhas = execucoes.filter((e) => e.status === 'falha').length

  return { totalHoje, total7d, taxaSucesso, falhas }
}

/** Agrupa execuções por loja, somando total_impresso (para o gráfico de barras) */
export function agruparPorLoja(execucoes) {
  const mapa = {}
  execucoes.forEach((e) => {
    const key = e.loja_id
    if (!mapa[key]) {
      mapa[key] = { loja_id: key, nome_loja: e.nome_loja, total: 0, dias: {} }
    }
    mapa[key].total += e.total_impresso ?? 0
    const dia = e.data_execucao?.slice(0, 10)
    if (dia) mapa[key].dias[dia] = (mapa[key].dias[dia] ?? 0) + (e.total_impresso ?? 0)
  })
  return Object.values(mapa)
}

export function useExecucoes() {
  const [execucoes,  setExecucoes]  = useState([])
  const [clientes,   setClientes]   = useState([]) // lista para o filtro de cliente
  const [loading,    setLoading]    = useState(false)

  const fetchExecucoes = useCallback(async ({ clienteId = null, periodo = 'hoje' } = {}) => {
    setLoading(true)
    try {
      let query = supabase
        .from('historico_impressoes')
        .select(`
          id,
          loja_id,
          data_execucao,
          total_impresso,
          hoje,
          status,
          lojas (
            nome_loja,
            shop_id,
            cliente_id,
            clientes ( nome )
          )
        `)
        .order('data_execucao', { ascending: false })
        .limit(100)

      const inicio = periodoInicio(periodo)
      if (inicio) query = query.gte('data_execucao', inicio)

      if (clienteId) {
        // Filtra indiretamente via lojas.cliente_id
        // Supabase não suporta filtro em join diretamente, então filtramos no front
      }

      const { data, error } = await query
      if (error) throw error

      // Normaliza e filtra por cliente se necessário
      let rows = (data ?? []).map((h) => ({
        ...h,
        nome_loja:    h.lojas?.nome_loja  ?? '—',
        shop_id:      h.lojas?.shop_id    ?? '—',
        nome_cliente: h.lojas?.clientes?.nome ?? '—',
        cliente_id:   h.lojas?.cliente_id ?? null,
      }))

      if (clienteId) {
        rows = rows.filter((r) => r.cliente_id === clienteId)
      }

      setExecucoes(rows)
    } catch (err) {
      console.error('fetchExecucoes:', err)
      toast.error('Erro ao carregar execuções: ' + (err.message ?? 'erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }, [])

  // Busca clientes para popular o select de filtro
  const fetchClientesFiltro = useCallback(async () => {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome')
    if (!error) setClientes(data ?? [])
  }, [])

  return { execucoes, clientes, loading, fetchExecucoes, fetchClientesFiltro, calcMetricas, agruparPorLoja }
}
