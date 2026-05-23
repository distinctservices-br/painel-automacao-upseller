import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

function periodoInicio(periodo) {
  const d = new Date()
  if (periodo === 'hoje') { d.setHours(0, 0, 0, 0); return d.toISOString() }
  if (periodo === '7d')   { d.setDate(d.getDate() - 7); return d.toISOString() }
  if (periodo === 'mes')  { d.setDate(1); d.setHours(0, 0, 0, 0); return d.toISOString() }
  return null
}

export function calcMetricas(execucoes) {
  const hoje      = new Date().toISOString().slice(0, 10)
  const deHoje    = execucoes.filter(e => (e.hoje ?? e.data_execucao?.slice(0, 10)) === hoje)
  const totalHoje = deHoje.reduce((s, e) => s + (e.total_impresso ?? 0), 0)
  const total7d   = execucoes.reduce((s, e) => s + (e.total_impresso ?? 0), 0)
  const concluidos = execucoes.filter(e => e.status === 'concluido').length
  const taxaSucesso = execucoes.length ? Math.round((concluidos / execucoes.length) * 100) : 0
  const falhas    = execucoes.filter(e => e.status === 'falha').length
  return { totalHoje, total7d, taxaSucesso, falhas }
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
  return Object.values(mapa)
}

export function useExecucoes() {
  const [execucoes, setExecucoes] = useState([])
  const [clientes,  setClientes]  = useState([])
  const [lojas,     setLojas]     = useState([]) // lojas do cliente selecionado
  const [loading,   setLoading]   = useState(false)

  const fetchExecucoes = useCallback(async ({ clienteId = null, lojaId = null, periodo = 'hoje' } = {}) => {
    setLoading(true)
    try {
      let query = supabase
        .from('historico_impressoes')
        .select(`
          id, loja_id, data_execucao, total_impresso, hoje, status,
          lojas ( nome_loja, shop_id, cliente_id, clientes ( nome ) )
        `)
        .order('data_execucao', { ascending: false })
        .limit(200)

      const inicio = periodoInicio(periodo)
      if (inicio) query = query.gte('data_execucao', inicio)

      // Filtro direto por loja_id (mais preciso que filtrar no front por cliente)
      if (lojaId) query = query.eq('loja_id', lojaId)

      const { data, error } = await query
      if (error) throw error

      let rows = (data ?? []).map(h => ({
        ...h,
        nome_loja:    h.lojas?.nome_loja ?? '—',
        shop_id:      h.lojas?.shop_id   ?? '—',
        nome_cliente: h.lojas?.clientes?.nome ?? '—',
        cliente_id:   h.lojas?.cliente_id ?? null,
      }))

      // Se filtrou por cliente mas não por loja, filtra no front
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

  // Busca lojas de um cliente específico para o segundo select de filtro
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
