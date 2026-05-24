import { useEffect, useState, useMemo } from 'react'
import { useExecucoes, calcMetricas, agruparPorLoja } from '@/hooks/useExecucoes'

// ── Constantes ─────────────────────────────────────────────────────────────

const PER_PAGE = 15

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

const PRESETS = [
  { id: 'hoje',           label: 'Hoje' },
  { id: 'semana',         label: 'Esta semana' },
  { id: 'mes',            label: 'Este mês' },
  { id: '7d',             label: '7 dias' },
  { id: '30d',            label: '30 dias' },
  { id: 'mes_especifico', label: 'Por mês' },
  { id: 'personalizado',  label: 'Personalizado' },
]

// ── Date helpers ────────────────────────────────────────────────────────────

function startOfDay(d) {
  const r = new Date(d); r.setHours(0, 0, 0, 0); return r
}
function endOfDay(d) {
  const r = new Date(d); r.setHours(23, 59, 59, 999); return r
}

function rangeFromPreset(tipo, mesAno) {
  const hoje = new Date()
  switch (tipo) {
    case 'hoje':
      return { inicio: startOfDay(hoje).toISOString(), fim: endOfDay(hoje).toISOString() }
    case 'semana': {
      const dow = hoje.getDay()
      const seg = new Date(hoje)
      seg.setDate(hoje.getDate() - (dow === 0 ? 6 : dow - 1))
      return { inicio: startOfDay(seg).toISOString(), fim: endOfDay(hoje).toISOString() }
    }
    case 'mes':
      return {
        inicio: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString(),
        fim:    endOfDay(hoje).toISOString(),
      }
    case '7d': {
      const d = new Date(hoje); d.setDate(d.getDate() - 6)
      return { inicio: startOfDay(d).toISOString(), fim: endOfDay(hoje).toISOString() }
    }
    case '30d': {
      const d = new Date(hoje); d.setDate(d.getDate() - 29)
      return { inicio: startOfDay(d).toISOString(), fim: endOfDay(hoje).toISOString() }
    }
    case 'mes_especifico': {
      const { mes, ano } = mesAno
      const ultimo = new Date(ano, mes + 1, 0)
      return {
        inicio: new Date(ano, mes, 1).toISOString(),
        fim:    endOfDay(ultimo).toISOString(),
      }
    }
    default:
      return { inicio: null, fim: null }
  }
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const data   = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  const hora   = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return { data, hora }
}

function labelPeriodo(tipo, mesAno, dateRange) {
  if (tipo === 'mes_especifico') return `${MESES[mesAno.mes]} ${mesAno.ano}`
  if (tipo === 'personalizado') {
    if (dateRange.inicio && dateRange.fim) {
      const f = (s) => new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      return `${f(dateRange.inicio)} – ${f(dateRange.fim)}`
    }
    return 'Período personalizado'
  }
  return PRESETS.find(p => p.id === tipo)?.label ?? ''
}

// ── Componentes visuais ────────────────────────────────────────────────────

function PageHeader({ title, sub, actions }) {
  return (
    <div className="flex flex-wrap justify-between items-end gap-4 mb-6 pb-5 border-b border-divider">
      <div>
        <p className="text-[11px] tracking-[0.12em] uppercase text-primary font-body mb-2">Operação</p>
        <h1 className="font-display font-bold text-[22px] sm:text-[28px] tracking-tight leading-none">{title}</h1>
        {sub && <p className="text-muted text-[12px] mt-1">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

const STATUS_CFG = {
  concluido:   { label: 'sucesso',     cls: 'bg-[rgba(115,243,164,0.10)] border-[rgba(115,243,164,0.30)] text-primary' },
  falha:       { label: 'falha',       cls: 'bg-[rgba(255,95,87,0.10)]   border-[rgba(255,95,87,0.30)]   text-error-text' },
  sem_pedidos: { label: 'sem pedidos', cls: 'bg-muted-surface border-divider text-muted' },
}
function StatusBadge({ status }) {
  const s = STATUS_CFG[status] ?? STATUS_CFG.sem_pedidos
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full border text-[11px] font-medium whitespace-nowrap ${s.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current flex-shrink-0" />
      {s.label}
    </span>
  )
}

function MetricCard({ label, value, sub, tone, accent }) {
  const toneClass = tone === 'up' ? 'text-primary' : tone === 'down' ? 'text-error-text' : 'text-muted'
  return (
    <div className="bg-black-2 border border-divider rounded-lg p-4 flex flex-col gap-1">
      <p className="text-[11px] tracking-[0.07em] uppercase text-muted">{label}</p>
      <p className={`font-display font-bold text-[24px] sm:text-[28px] tracking-tight leading-none mt-0.5 ${accent ? 'text-primary' : 'text-white-1'}`}>
        {value}
      </p>
      <p className={`text-[11px] mt-0.5 ${toneClass}`}>{sub}</p>
    </div>
  )
}

// ── Paginação ───────────────────────────────────────────────────────────────

function Pagination({ page, total, perPage, onChange }) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null

  const pages = []
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 || i === totalPages ||
      (i >= page - 1 && i <= page + 1)
    ) {
      pages.push(i)
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...')
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 px-1 py-3">
      <p className="text-[11px] text-muted">
        {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} de {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-divider text-muted hover:text-white-1 hover:border-[rgba(250,250,250,0.25)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <i className="ti ti-chevron-left text-[14px]" />
        </button>

        {pages.map((p, i) =>
          p === '...'
            ? <span key={`e${i}`} className="w-8 text-center text-[12px] text-muted">…</span>
            : (
              <button
                key={p}
                onClick={() => onChange(p)}
                className={`w-8 h-8 rounded-[6px] text-[12px] font-medium transition-all
                  ${p === page
                    ? 'bg-primary text-black-1 font-semibold'
                    : 'border border-divider text-muted hover:text-white-1 hover:border-[rgba(250,250,250,0.25)]'
                  }`}
              >
                {p}
              </button>
            )
        )}

        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-[6px] border border-divider text-muted hover:text-white-1 hover:border-[rgba(250,250,250,0.25)] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <i className="ti ti-chevron-right text-[14px]" />
        </button>
      </div>
    </div>
  )
}

// ── Mini gráfico de barras ──────────────────────────────────────────────────

function Bars({ values, days = [] }) {
  const max    = Math.max(...values, 1)
  const BAR_H  = 52  // px — altura máxima das barras
  const NUM_H  = 18  // px — espaço acima para o número
  const AXIS_H = n > 10 ? 32 : 18  // px — rotacionado precisa de mais altura
  const n      = values.length

  const fmtDay = (iso) => {
    if (!iso) return ''
    const d   = new Date(iso + 'T12:00:00')
    return `${d.getDate()}/${d.getMonth() + 1}`
  }

  return (
    <div className="flex flex-col">
      {/* ── Barras com número acima ── */}
      <div className="flex items-end gap-[3px]" style={{ height: `${BAR_H + NUM_H}px` }}>
        {values.map((v, i) => {
          const barPx = v === 0 ? 3 : Math.max(6, Math.round((v / max) * BAR_H))
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center justify-end h-full gap-[3px]"
            >
              <span className={`font-mono text-[9px] leading-none tracking-tight text-primary
                ${v > 0 ? 'opacity-80' : 'invisible'}`}>
                {v}
              </span>
              <div
                title={days[i] ? `${fmtDay(days[i])}: ${v} pedidos` : `${v} pedidos`}
                className={`w-full rounded-t-[2px] transition-opacity hover:opacity-80
                  ${v === 0
                    ? 'bg-[rgba(250,250,250,0.07)]'
                    : 'bg-gradient-to-b from-primary to-[rgba(115,243,164,0.40)]'
                  }`}
                style={{ height: `${barPx}px` }}
              />
            </div>
          )
        })}
      </div>

      {/* ── Eixo de datas — todas as colunas, rotacionado -45° para caber ── */}
      {days.length > 0 && (
        <div className="flex gap-[3px] mt-1" style={{ height: `${AXIS_H}px` }}>
          {days.map((d, i) => (
            <div key={i} className="flex-1 relative" style={{ overflow: 'visible' }}>
              <span
                className="absolute font-mono text-[9px] text-muted whitespace-nowrap select-none leading-none"
                style={{
                  top: 0,
                  left: '50%',
                  transformOrigin: 'top left',
                  transform: n > 10
                    ? 'translateX(-50%) rotate(-45deg)'
                    : 'translateX(-50%)',
                }}
              >
                {fmtDay(d)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Tela ───────────────────────────────────────────────────────────────────

export default function Execucoes() {
  const {
    execucoes, clientes, lojas, loading,
    fetchExecucoes, fetchClientesFiltro, fetchLojasFiltro,
  } = useExecucoes()

  // Filtros de cliente/loja
  const [clienteId, setClienteId] = useState('')
  const [lojaId,    setLojaId]    = useState('')

  // Filtro de data
  const hoje = new Date()
  const [filtroTipo, setFiltroTipo] = useState('hoje')
  const [mesAno,     setMesAno]     = useState({ mes: hoje.getMonth(), ano: hoje.getFullYear() })
  const [dateRange,  setDateRange]  = useState({ inicio: '', fim: '' })

  // Paginação
  const [page, setPage] = useState(1)

  // Anos disponíveis (atual e 2 anteriores)
  const anos = [hoje.getFullYear(), hoje.getFullYear() - 1, hoje.getFullYear() - 2]

  // Carrega clientes no mount
  useEffect(() => { fetchClientesFiltro() }, [fetchClientesFiltro])

  // Troca de cliente → limpa loja
  useEffect(() => {
    setLojaId('')
    fetchLojasFiltro(clienteId || null)
  }, [fetchLojasFiltro, clienteId])

  // Executa busca sempre que filtros mudam
  useEffect(() => {
    let { inicio, fim } = rangeFromPreset(filtroTipo, mesAno)

    if (filtroTipo === 'personalizado') {
      inicio = dateRange.inicio ? new Date(dateRange.inicio + 'T00:00:00').toISOString() : null
      fim    = dateRange.fim    ? new Date(dateRange.fim    + 'T23:59:59').toISOString() : null
    }

    fetchExecucoes({ clienteId: clienteId || null, lojaId: lojaId || null, dataInicio: inicio, dataFim: fim })
    setPage(1)
  }, [fetchExecucoes, clienteId, lojaId, filtroTipo, mesAno, dateRange])

  // Métricas e agrupamento
  const metricas = useMemo(() => calcMetricas(execucoes), [execucoes])
  const porLoja  = useMemo(() => agruparPorLoja(execucoes), [execucoes])

  // Dias do gráfico — derivados do range real do filtro ativo
  const chartDays = useMemo(() => {
    let startIso, endIso

    if (filtroTipo === 'personalizado') {
      if (!dateRange.inicio || !dateRange.fim) return []
      startIso = dateRange.inicio
      endIso   = dateRange.fim
    } else {
      const { inicio, fim } = rangeFromPreset(filtroTipo, mesAno)
      startIso = inicio?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
      endIso   = fim?.slice(0, 10)   ?? startIso
    }

    const days = []
    const cur  = new Date(startIso + 'T12:00:00')
    const end  = new Date(endIso   + 'T12:00:00')
    while (cur <= end && days.length < 31) {
      days.push(cur.toISOString().slice(0, 10))
      cur.setDate(cur.getDate() + 1)
    }
    return days
  }, [filtroTipo, mesAno, dateRange])

  // Paginação
  const totalPages   = Math.ceil(execucoes.length / PER_PAGE)
  const paginadas    = useMemo(
    () => execucoes.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [execucoes, page],
  )

  // CSV export
  const exportCSV = () => {
    const header = 'Data,Horário,Cliente,Loja,Shop,Pedidos,Status'
    const rows = execucoes.map(r => {
      const d = new Date(r.data_execucao)
      return [
        d.toLocaleDateString('pt-BR'),
        d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        r.nome_cliente, r.nome_loja, r.shop_id, r.total_impresso ?? 0, r.status,
      ].join(',')
    })
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = `execucoes_${filtroTipo}_${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  const selectCls = `
    bg-surface border border-divider text-white-1 rounded-[8px]
    px-2.5 py-1.5 text-[12px] font-body outline-none
    focus:border-[rgba(115,243,164,0.45)] transition-all
  `

  return (
    <>
      <PageHeader
        title="Execuções"
        sub="Histórico do worker — atualiza a cada 30 min, 06:30–13:30, dias úteis."
        actions={
          <>
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-divider text-[12px] hover:border-[rgba(250,250,250,0.30)] hover:bg-muted-surface transition-all"
            >
              <i className="ti ti-download text-[13px]" />
              <span className="hidden sm:inline">CSV</span>
            </button>
            <button
              onClick={() => {
                const { inicio, fim } = rangeFromPreset(filtroTipo, mesAno)
                fetchExecucoes({ clienteId: clienteId || null, lojaId: lojaId || null, dataInicio: inicio, dataFim: fim })
              }}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-black-1 text-[12px] font-semibold hover:shadow-glow btn-glow transition-all disabled:opacity-50"
            >
              <i className={`ti ti-refresh text-[13px] ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </>
        }
      />

      {/* ── Painel de filtros ─────────────────────────────────────────────── */}
      <div className="bg-black-2 border border-divider rounded-lg mb-5 overflow-hidden">

        {/* Linha 1: cliente + loja */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-divider">
          <i className="ti ti-filter text-[13px] text-muted" />
          <select
            value={clienteId}
            onChange={e => setClienteId(e.target.value)}
            className={selectCls + ' flex-1 min-w-[140px] sm:flex-none'}
          >
            <option value="">Todos os clientes</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>

          {clienteId && lojas.length > 0 && (
            <>
              <i className="ti ti-chevron-right text-[12px] text-muted hidden sm:block" />
              <select
                value={lojaId}
                onChange={e => setLojaId(e.target.value)}
                className={selectCls + ' flex-1 min-w-[140px] sm:flex-none'}
              >
                <option value="">Todas as lojas</option>
                {lojas.map(l => <option key={l.id} value={l.id}>{l.nome_loja}</option>)}
              </select>
            </>
          )}

          <span className="ml-auto font-mono text-[11px] text-muted hidden sm:block">
            {loading ? 'Carregando...' : `${execucoes.length} registros`}
          </span>
        </div>

        {/* Linha 2: presets de data */}
        <div className="px-4 py-3 flex flex-col gap-3">
          <div className="flex gap-1.5 flex-wrap">
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => setFiltroTipo(p.id)}
                className={`px-3 py-1.5 rounded-full text-[12px] border transition-all whitespace-nowrap
                  ${filtroTipo === p.id
                    ? 'bg-primary text-black-1 border-primary font-semibold'
                    : 'border-divider text-muted hover:border-[rgba(250,250,250,0.25)] hover:text-white-1'
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Seletor de mês/ano */}
          {filtroTipo === 'mes_especifico' && (
            <div className="flex items-center gap-2 flex-wrap">
              <i className="ti ti-calendar text-[13px] text-muted" />
              <select
                value={mesAno.mes}
                onChange={e => setMesAno(v => ({ ...v, mes: Number(e.target.value) }))}
                className={selectCls}
              >
                {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <select
                value={mesAno.ano}
                onChange={e => setMesAno(v => ({ ...v, ano: Number(e.target.value) }))}
                className={selectCls}
              >
                {anos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <span className="text-[11px] text-muted">
                {MESES[mesAno.mes]} {mesAno.ano}
              </span>
            </div>
          )}

          {/* Período personalizado */}
          {filtroTipo === 'personalizado' && (
            <div className="flex flex-wrap items-center gap-2">
              <i className="ti ti-calendar-event text-[13px] text-muted" />
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={dateRange.inicio}
                  max={dateRange.fim || undefined}
                  onChange={e => setDateRange(v => ({ ...v, inicio: e.target.value }))}
                  className={selectCls + ' [color-scheme:dark]'}
                />
                <span className="text-muted text-[12px]">até</span>
                <input
                  type="date"
                  value={dateRange.fim}
                  min={dateRange.inicio || undefined}
                  onChange={e => setDateRange(v => ({ ...v, fim: e.target.value }))}
                  className={selectCls + ' [color-scheme:dark]'}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Métricas ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <MetricCard
          label="Pedidos hoje"
          value={metricas.totalHoje}
          sub="execuções de hoje"
          tone="up" accent
        />
        <MetricCard
          label={`Total — ${labelPeriodo(filtroTipo, mesAno, dateRange)}`}
          value={metricas.totalPeriodo}
          sub="no período selecionado"
          tone="flat"
        />
        <MetricCard
          label="Taxa de sucesso"
          value={`${metricas.taxaSucesso}%`}
          sub="execuções concluídas"
          tone={metricas.taxaSucesso >= 80 ? 'up' : 'down'}
        />
        <MetricCard
          label="Falhas"
          value={metricas.falhas}
          sub="no período"
          tone={metricas.falhas > 0 ? 'down' : 'flat'}
        />
      </div>

      {/* ── Tabela ───────────────────────────────────────────────────────── */}
      <div className="bg-black-2 border border-divider rounded-lg overflow-hidden mb-5">
        {/* Cabeçalho da tabela */}
        <div className="flex justify-between items-center px-4 py-3 border-b border-divider">
          <p className="font-display font-semibold text-[13px] tracking-tight">
            Corridas
            <span className="text-muted font-normal ml-2 text-[12px]">
              {labelPeriodo(filtroTipo, mesAno, dateRange)}
            </span>
          </p>
          <span className="font-mono text-[11px] text-muted">
            {loading ? '...' : `${execucoes.length} total`}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-14 text-muted text-[13px]">
            <i className="ti ti-loader-2 animate-spin mr-2 text-[18px]" /> Carregando...
          </div>
        ) : execucoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 text-muted gap-2">
            <i className="ti ti-history text-[36px] text-muted-light" />
            <p className="text-[13px]">Nenhuma execução no período.</p>
          </div>
        ) : (
          <>
            {/* Desktop: tabela */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full border-collapse text-[13px] min-w-[560px]">
                <thead>
                  <tr className="bg-[rgba(250,250,250,0.02)]">
                    {['Data / Hora', 'Cliente', 'Loja', 'Pedidos', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 font-medium text-[11px] uppercase tracking-[0.06em] text-muted-light border-b border-divider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginadas.map(r => {
                    const { data, hora } = formatDateTime(r.data_execucao)
                    return (
                      <tr key={r.id} className="border-b border-divider hover:bg-[rgba(115,243,164,0.025)] transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono text-[12px] text-white-1">{data}</span>
                          <span className="font-mono text-[11px] text-muted ml-2">{hora}</span>
                        </td>
                        <td className="px-4 py-3 text-[13px]">{r.nome_cliente}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-[11px] text-muted">{r.nome_loja} · {r.shop_id}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[13px] text-white-1">{r.total_impresso ?? 0}</td>
                        <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <div className="sm:hidden divide-y divide-divider">
              {paginadas.map(r => {
                const { data, hora } = formatDateTime(r.data_execucao)
                return (
                  <div key={r.id} className="px-4 py-3 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-[13px] font-medium text-white-1">{r.nome_cliente}</p>
                        <p className="text-[11px] text-muted font-mono mt-0.5">{r.nome_loja} · {r.shop_id}</p>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] text-muted">
                        {data} <span className="text-muted-light">{hora}</span>
                      </span>
                      <span className="font-mono text-[12px] text-white-1">{r.total_impresso ?? 0} ped.</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Paginação */}
            <div className="px-4 border-t border-divider">
              <Pagination
                page={page}
                total={execucoes.length}
                perPage={PER_PAGE}
                onChange={setPage}
              />
            </div>
          </>
        )}
      </div>

      {/* ── Volume por loja ──────────────────────────────────────────────── */}
      {porLoja.length > 0 && (
        <div className="bg-black-2 border border-divider rounded-lg px-4 sm:px-6 py-5">
          <div className="flex justify-between items-baseline mb-4">
            <p className="font-display font-semibold text-[13px] tracking-tight">Volume por loja</p>
            <span className="font-mono text-[11px] text-muted">{labelPeriodo(filtroTipo, mesAno, dateRange)}</span>
          </div>
          <div className="flex flex-col gap-4">
            {porLoja.map((v, lojaIdx) => {
              const bars = chartDays.map(d => v.dias[d] ?? 0)
              // Mostra eixo de datas apenas na última loja (eixo X compartilhado)
              const showDays = lojaIdx === porLoja.length - 1
              return (
                <div key={v.loja_id} className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-[12px]">
                    <span className="text-muted truncate pr-4">{v.nome_loja}</span>
                    <span className="font-mono text-white-1 flex-shrink-0">{v.total} ped.</span>
                  </div>
                  <Bars values={bars} days={showDays ? chartDays : []} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
