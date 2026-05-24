import { useEffect, useState } from 'react'
import { useExecucoes, calcMetricas, agruparPorLoja } from '@/hooks/useExecucoes'

// ── Helpers visuais ────────────────────────────────────────────────────────

function PageHeader({ eyebrow, title, sub, actions }) {
  return (
    <div className="flex flex-wrap justify-between items-end gap-4 mb-6 pb-5 border-b border-divider">
      <div>
        {eyebrow && <p className="text-[11px] tracking-[0.12em] uppercase text-primary font-body mb-2">{eyebrow}</p>}
        <h1 className="font-display font-bold text-[22px] sm:text-[28px] tracking-tight leading-none">{title}</h1>
        {sub && <p className="text-muted text-[12px] sm:text-[13px] mt-1">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    concluido:   { label: 'sucesso',     cls: 'bg-[rgba(115,243,164,0.10)] border-[rgba(115,243,164,0.30)] text-primary' },
    falha:       { label: 'falha',       cls: 'bg-[rgba(255,95,87,0.10)]   border-[rgba(255,95,87,0.30)]   text-error-text' },
    sem_pedidos: { label: 'sem pedidos', cls: 'bg-muted-surface border-divider text-muted' },
  }
  const s = map[status] ?? map.sem_pedidos
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full border text-[11px] font-medium whitespace-nowrap ${s.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  )
}

function MetricCard({ label, value, trend, tone, accent }) {
  const toneClass = tone === 'up' ? 'text-primary' : tone === 'down' ? 'text-error-text' : 'text-muted'
  return (
    <div className="glass-card p-4 sm:p-5 flex flex-col gap-1.5">
      <p className="text-[11px] tracking-[0.08em] uppercase text-muted">{label}</p>
      <p className={`font-display font-bold text-[26px] sm:text-[30px] tracking-tight leading-none ${accent ? 'text-primary' : 'text-white-1'}`}>
        {value}
      </p>
      <p className={`text-[11px] flex items-center gap-1 mt-0.5 ${toneClass}`}>
        {tone === 'up'   && <i className="ti ti-trending-up" />}
        {tone === 'down' && <i className="ti ti-trending-down" />}
        {tone === 'flat' && <i className="ti ti-minus" />}
        {trend}
      </p>
    </div>
  )
}

function Bars({ values }) {
  const max = Math.max(...values, 1)
  return (
    <div className="flex items-end gap-1 h-[48px]">
      {values.map((v, i) => (
        <div
          key={i}
          title={`${v} pedidos`}
          className={`flex-1 rounded-t-[3px] min-h-[4px] transition-opacity duration-150 hover:opacity-70 ${v === 0 ? 'bg-[rgba(250,250,250,0.10)]' : 'bg-gradient-to-b from-primary to-[rgba(115,243,164,0.45)]'}`}
          style={{ height: `${Math.max(6, (v / max) * 100)}%` }}
        />
      ))}
    </div>
  )
}

const PERIODOS = [
  { id: 'hoje', label: 'Hoje' },
  { id: '7d',   label: '7 dias' },
  { id: 'mes',  label: 'Mês' },
]

// ── Tela ───────────────────────────────────────────────────────────────────

export default function Execucoes() {
  const {
    execucoes, clientes, lojas, loading,
    fetchExecucoes, fetchClientesFiltro, fetchLojasFiltro,
  } = useExecucoes()
  const [clienteId, setClienteId] = useState('')
  const [lojaId,    setLojaId]    = useState('')
  const [periodo,   setPeriodo]   = useState('hoje')

  useEffect(() => { fetchClientesFiltro() }, [fetchClientesFiltro])

  useEffect(() => {
    setLojaId('')
    fetchLojasFiltro(clienteId || null)
  }, [fetchLojasFiltro, clienteId])

  useEffect(() => {
    fetchExecucoes({ clienteId: clienteId || null, lojaId: lojaId || null, periodo })
  }, [fetchExecucoes, clienteId, lojaId, periodo])

  const metricas   = calcMetricas(execucoes)
  const porLoja    = agruparPorLoja(execucoes)

  const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })

  const exportCSV = () => {
    const header = 'Horário,Cliente,Loja,Shop,Pedidos,Status'
    const rows = execucoes.map((r) =>
      [r.data_execucao, r.nome_cliente, r.nome_loja, r.shop_id, r.total_impresso, r.status].join(',')
    )
    const csv  = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `execucoes_${periodo}.csv`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Execuções"
        sub="Histórico do worker — atualiza a cada 30 min, 06:30–13:30, dias úteis."
        actions={
          <>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-divider text-[12px] hover:border-[rgba(250,250,250,0.30)] hover:bg-muted-surface transition-all"
            >
              <i className="ti ti-download text-[13px]" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>
            <button
              onClick={() => fetchExecucoes({ clienteId: clienteId || null, lojaId: lojaId || null, periodo })}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-black-1 text-[12px] font-semibold hover:shadow-glow btn-glow transition-all disabled:opacity-50"
            >
              <i className={`ti ti-refresh text-[13px] ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </>
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-3 mb-5 bg-black-2 border border-divider rounded-lg">
        <select
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="bg-surface border border-divider text-white-1 rounded-[8px] px-2.5 py-1.5 text-[12px] font-body outline-none focus:border-[rgba(115,243,164,0.45)] transition-all flex-1 min-w-[120px] sm:flex-none"
        >
          <option value="">Todos os clientes</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </select>

        {clienteId && lojas.length > 0 && (
          <>
            <i className="ti ti-chevron-right text-[13px] text-muted hidden sm:block" />
            <select
              value={lojaId}
              onChange={(e) => setLojaId(e.target.value)}
              className="bg-surface border border-divider text-white-1 rounded-[8px] px-2.5 py-1.5 text-[12px] font-body outline-none focus:border-[rgba(115,243,164,0.45)] transition-all flex-1 min-w-[120px] sm:flex-none"
            >
              <option value="">Todas as lojas</option>
              {lojas.map((l) => (
                <option key={l.id} value={l.id}>{l.nome_loja} · {l.shop_id}</option>
              ))}
            </select>
          </>
        )}

        {/* Período segmented */}
        <div className="flex bg-surface border border-divider rounded-full p-[3px] gap-0.5 ml-auto">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              className={`px-3 py-1 rounded-full text-[11px] sm:text-[12px] font-body transition-all duration-150
                ${periodo === p.id ? 'seg-active' : 'text-muted hover:text-white-1'}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <span className="w-full sm:w-auto font-mono text-[11px] text-muted-light">
          {loading ? 'Carregando...' : `${execucoes.length} registros`}
        </span>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <MetricCard label="Pedidos hoje"    value={metricas.totalHoje}           trend="+hoje"       tone="up"   accent />
        <MetricCard label="Período"         value={metricas.total7d}             trend={periodo}     tone="flat" />
        <MetricCard label="Taxa de sucesso" value={`${metricas.taxaSucesso}%`}   trend="concluídos"  tone={metricas.taxaSucesso >= 80 ? 'up' : 'down'} />
        <MetricCard label="Falhas"          value={metricas.falhas}              trend="no período"  tone={metricas.falhas > 0 ? 'down' : 'flat'} />
      </div>

      {/* Tabela */}
      <div className="bg-black-2 border border-divider rounded-lg overflow-hidden mb-5">
        <div className="flex justify-between items-center px-4 sm:px-5 py-3 border-b border-divider">
          <p className="font-display font-semibold text-[13px] sm:text-[14px] tracking-tight">
            Corridas — {PERIODOS.find((p) => p.id === periodo)?.label}
          </p>
          <span className="font-mono text-[11px] text-muted">{execucoes.length}</span>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted text-[13px]">
            <i className="ti ti-loader-2 animate-spin mr-2" /> Carregando...
          </div>
        ) : execucoes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted gap-2">
            <i className="ti ti-history text-3xl text-muted-light" />
            <p className="text-[13px]">Nenhuma execução no período.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] min-w-[500px]">
              <thead>
                <tr>
                  {['Horário', 'Cliente', 'Loja', 'Pedidos', 'Status'].map((h) => (
                    <th key={h} className="text-left px-4 sm:px-5 py-2.5 font-medium text-[11px] uppercase tracking-[0.07em] text-muted-light bg-[rgba(250,250,250,0.02)] border-b border-divider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {execucoes.map((r) => (
                  <tr key={r.id} className="border-b border-divider hover:bg-[rgba(115,243,164,0.03)] transition-colors">
                    <td className="px-4 sm:px-5 py-3 font-mono text-[12px] text-muted whitespace-nowrap">
                      {new Date(r.data_execucao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 sm:px-5 py-3 whitespace-nowrap">{r.nome_cliente}</td>
                    <td className="px-4 sm:px-5 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-[6px] bg-muted-surface border border-divider font-mono text-[11px] text-muted whitespace-nowrap">
                        {r.nome_loja} · {r.shop_id}
                      </span>
                    </td>
                    <td className="px-4 sm:px-5 py-3 font-mono text-white-1">{r.total_impresso ?? 0}</td>
                    <td className="px-4 sm:px-5 py-3"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Volume por loja */}
      {porLoja.length > 0 && (
        <div className="bg-black-2 border border-divider rounded-lg px-4 sm:px-6 py-5">
          <div className="flex justify-between items-baseline mb-4">
            <p className="font-display font-semibold text-[13px] sm:text-[14px] tracking-tight">Volume por loja</p>
            <span className="font-mono text-[11px] text-muted hidden sm:block">seg · ter · qua · qui · sex · sáb · dom</span>
          </div>
          <div className="flex flex-col gap-3.5">
            {porLoja.map((v) => {
              const bars = ultimos7Dias.map((d) => v.dias[d] ?? 0)
              return (
                <div key={v.loja_id} className="grid grid-cols-[1fr_40px] gap-3 items-center">
                  <div>
                    <p className="text-[12px] text-muted mb-1.5 truncate">{v.nome_loja}</p>
                    <Bars values={bars} />
                  </div>
                  <p className="font-mono text-[12px] text-white-1 text-right">{v.total}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
