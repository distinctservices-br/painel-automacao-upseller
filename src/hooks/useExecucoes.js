import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

export function calcMetricas(execucoes) {
  const hoje       = new Date().toISOString().slice(0, 10)
  const deHoje     = execucoes.filter(e => (e.hoje ?? e.data_execucao?.slice(0, 10)) === hoje)
  const totalHoje  = deHoje.reduce((s, e) => s + (e.total_impresso ?? 0), 0)
  const totalPeriodo = execucoes.reduce((s, e) => s + (e.total_impresso ?? 0), 0)
  const concluidos = execucoes.filter(e => e.status === 'concluido').length
  const taxaSucesso = execucoes.length ? Math.round((concluidos / execucoes.length) * 100) : 0
  const falhas     = execucoes.filter(e => e.status === 'falha').length
  return { totalHoje, totalPeriodo, taxaSucesso, falhas }
}

export function agruparPorLoja(execucoes) {
  const mapa = {}
  execucoes.forEach(e => {
    const key = e.loja_id
    if (!mapa[key]) mapa[key] = { loja_id: key, nome_loja: e.nome_loja, total: 0, dias: {} }
    mapa[key].total += e.total_impresso ?? 0
    const dia = e.data_execucao?.slice(0, 10)
    if (dia) mapa[key].dias[dia] = (mapa[key].dias[dia] ?? 0) + (e.total_impresso ?? 0)
  })
  return Object.values(mapa).sort((a, b) => b.total - a.total)
}

export function useExecucoes() {
  const [execucoes, setExecucoes] = useState([])
  const [clientes,  setClientes]  = useState([])
  const [lojas,     setLojas]     = useState([])
  const [loading,   setLoading]   = useState(false)

  /**
   * dataInicio / dataFim: strings ISO (ex: "2025-05-01T00:00:00.000Z")
   * Se ambos nulos, não aplica filtro de data.
   */
  const fetchExecucoes = useCallback(async ({
    clienteId  = null,
    lojaId     = null,
    dataInicio = null,
    dataFim    = null,
  } = {}) => {
    setLoading(true)
    try {
      let query = supabase
        .from('historico_impressoes')
        .select(`
          id, loja_id, data_execucao, total_impresso, hoje, status,
          lojas ( nome_loja, shop_id, cliente_id, clientes ( nome ) )
        `)
        .order('data_execucao', { ascending: false })
        .limit(1000)

      if (dataInicio) query = query.gte('data_execucao', dataInicio)
      if (dataFim)    query = query.lte('data_execucao', dataFim)
      if (lojaId)     query = query.eq('loja_id', lojaId)

      const { data, error } = await query
      if (error) throw error

      let rows = (data ?? []).map(h => ({
        ...h,
        nome_loja:    h.lojas?.nome_loja          ?? '—',
        shop_id:      h.lojas?.shop_id             ?? '—',
        nome_cliente: h.lojas?.clientes?.nome      ?? '—',
        cliente_id:   h.lojas?.cliente_id          ?? null,
      }))

      if (clienteId && !lojaId) {
        rows = rows.filter(r => r.cliente_id === clienteId)
      }

      setExecucoes(rows)
    } catch (err) {
      console.error('fetchExecucoes:', err)
      toast.error('Erro ao carregar execuções: ' + (err.message ?? 'erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchClientesFiltro = useCallback(async () => {
    const { data, error } = await supabase
      .from('clientes').select('id, nome').eq('ativo', true).order('nome')
    if (!error) setClientes(data ?? [])
  }, [])

  const fetchLojasFiltro = useCallback(async (clienteId) => {
    if (!clienteId) { setLojas([]); return }
    const { data, error } = await supabase
      .from('lojas')
      .select('id, nome_loja, shop_id')
      .eq('cliente_id', clienteId)
      .eq('ativo', true)
      .order('ordem')
    if (!error) setLojas(data ?? [])
  }, [])

  return {
    execucoes, clientes, lojas, loading,
    fetchExecucoes, fetchClientesFiltro, fetchLojasFiltro,
    calcMetricas, agruparPorLoja,
  }
}
