import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { downloadBat } from '@/hooks/useClientes'
import { sendAlert, shouldAlert, markAlerted } from '@/lib/email'

// ── Header ─────────────────────────────────────────────────────────────────

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

// ── Mapping de status ──────────────────────────────────────────────────────

const STATUS_MAP = {
  ok: {
    label:    'válido',
    badgeCls: 'bg-[rgba(115,243,164,0.10)] border-[rgba(115,243,164,0.30)] text-primary',
    dotCls:   'bg-primary',
  },
  atencao: {
    label:    'atenção',
    badgeCls: 'bg-[rgba(243,193,115,0.10)] border-[rgba(243,193,115,0.35)] text-warn',
    dotCls:   'bg-warn',
  },
  erro: {
    label:    'ação necessária',
    badgeCls: 'bg-[rgba(255,95,87,0.10)] border-[rgba(255,95,87,0.30)] text-error-text',
    dotCls:   'bg-error-text',
  },
}

const STATUS_FALLBACK = {
  label:    'pendente',
  badgeCls: 'bg-muted-surface border-divider text-muted',
  dotCls:   'bg-muted-light',
}

function getStatusCfg(status) {
  return STATUS_MAP[status] ?? STATUS_FALLBACK
}

function CookieBadge({ status }) {
  const s = getStatusCfg(status)
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full border text-[11px] font-medium whitespace-nowrap ${s.badgeCls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dotCls}`} />
      {s.label}
    </span>
  )
}

// ── Helpers de data ────────────────────────────────────────────────────────

function tempoDesde(iso) {
  if (!iso) return 'nunca'
  const ms  = Date.now() - new Date(iso).getTime()
  if (ms < 0) return 'agora'
  const min = Math.floor(ms / 60_000)
  if (min < 1)  return 'agora'
  if (min < 60) return `há ${min} ${min === 1 ? 'minuto' : 'minutos'}`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} ${h === 1 ? 'hora' : 'horas'}`
  const d = Math.floor(h / 24)
  if (d < 30) return `há ${d} ${d === 1 ? 'dia' : 'dias'}`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `há ${mo} ${mo === 1 ? 'mês' : 'meses'}`
  const a = Math.floor(mo / 12)
  return `há ${a} ${a === 1 ? 'ano' : 'anos'}`
}

// ── Linha de loja ──────────────────────────────────────────────────────────

function LojaRow({ loja }) {
  const status  = loja.ultimo_status_cookie ?? null
  const isErro  = status === 'erro'

  return (
    <div
      className={`
        flex flex-col gap-1.5 px-4 py-3 rounded-lg border transition-colors
        ${isErro
          ? 'bg-[rgba(255,95,87,0.04)] border-[rgba(255,95,87,0.45)]'
          : 'bg-black-1 border-divider'}
      `}
    >
      {/* Linha 1: nome + badge + shop_id */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-[13px] font-medium text-white-1 truncate">{loja.nome_loja}</p>
        <CookieBadge status={status} />
        <span className="ml-auto text-[11px] text-muted font-mono">{loja.shop_id}</span>
      </div>

      {/* Linha 2: mensagem do status */}
      {loja.ultimo_status_mensagem && (
        <p className={`text-[11px] leading-snug ${isErro ? 'text-error-text/80' : 'text-muted'}`}>
          {loja.ultimo_status_mensagem}
        </p>
      )}

      {/* Linha 3: timestamp */}
      <p className="text-[10px] text-muted-light font-mono">
        Atualizado {tempoDesde(loja.ultimo_status_atualizado_em)}
      </p>
    </div>
  )
}

// ── Accordion por cliente ──────────────────────────────────────────────────

function ClienteAccordion({ cliente, onRenovar, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)

  const countAtencao = cliente.lojas.filter(l => l.ultimo_status_cookie === 'atencao').length
  const countErro    = cliente.lojas.filter(l => l.ultimo_status_cookie === 'erro').length
  const hasErro      = countErro > 0
  const hasIssues    = countAtencao > 0 || countErro > 0

  // Borda do cliente também fica vermelha se alguma loja estiver em erro
  const containerBorder = hasErro
    ? 'border-[rgba(255,95,87,0.45)]'
    : 'border-divider'

  return (
    <div className={`bg-black-2 border rounded-lg overflow-hidden ${containerBorder}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5">
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-1 flex items-center justify-between gap-3 min-w-0 text-left -mx-2 px-2 py-1 rounded-[6px] hover:bg-muted-surface transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <i className={`ti ti-chevron-right text-muted text-[14px] transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-90' : ''}`} />
            <span className="font-display font-semibold text-[14px] truncate">{cliente.nome}</span>

            {countErro > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[rgba(255,95,87,0.10)] border border-[rgba(255,95,87,0.25)] text-error-text flex-shrink-0">
                {countErro} {countErro === 1 ? 'erro' : 'erros'}
              </span>
            )}
            {countAtencao > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[rgba(243,193,115,0.10)] border border-[rgba(243,193,115,0.30)] text-warn flex-shrink-0">
                {countAtencao} {countAtencao === 1 ? 'atenção' : 'atenções'}
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted flex-shrink-0 hidden sm:block">
            {cliente.lojas.length} {cliente.lojas.length === 1 ? 'loja' : 'lojas'}
          </span>
        </button>

        <button
          onClick={() => onRenovar(cliente)}
          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all
            ${hasIssues
              ? 'bg-primary text-black-1 font-semibold hover:shadow-glow btn-glow'
              : 'border border-divider text-muted hover:border-[rgba(250,250,250,0.30)] hover:text-white-1 hover:bg-muted-surface'
            }`}
          title="Baixa um .bat que renova o cookie de todas as lojas deste cliente"
        >
          <i className="ti ti-download text-[13px]" />
          <span className="hidden sm:inline">Renovar</span>
        </button>
      </div>

      {/* Lojas */}
      {open && (
        <div className="flex flex-col gap-2 px-4 pb-4 border-t border-divider pt-3">
          {cliente.lojas.map(loja => (
            <LojaRow key={loja.id} loja={loja} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Email alerts ───────────────────────────────────────────────────────────

async function dispararAlertas(clientes) {
  const lojas = clientes.flatMap(c =>
    c.lojas.map(l => ({ ...l, nome_cliente: c.nome }))
  )
  const toAlert = lojas.filter(l =>
    l.ultimo_status_cookie === 'atencao' || l.ultimo_status_cookie === 'erro'
  )
  if (!toAlert.length) return

  const alertKey = 'alert_cookies_checked'
  if (!shouldAlert(alertKey)) return

  const rows = toAlert.map(l => {
    const cfg = getStatusCfg(l.ultimo_status_cookie)
    const cor = l.ultimo_status_cookie === 'erro' ? '#FF5F57' : '#F3C173'
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2A2A2A">${l.nome_cliente}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2A2A2A">${l.nome_loja}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2A2A2A;color:${cor};font-weight:600">${cfg.label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2A2A2A;color:#bbb;font-size:12px">${l.ultimo_status_mensagem ?? '—'}</td>
      </tr>`
  }).join('')

  const html = `
    <div style="font-family:Inter,sans-serif;background:#0F0F0F;color:#FAFAFA;padding:32px;border-radius:12px;max-width:680px">
      <h2 style="margin:0 0 4px;font-size:18px;color:#73F3A4">Alerta de Cookies — Upseller</h2>
      <p style="margin:0 0 20px;color:#888;font-size:13px">${toAlert.length} loja(s) precisando de atenção.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#1E1E1E">
            <th style="padding:8px 12px;text-align:left;color:#888;font-weight:500">Cliente</th>
            <th style="padding:8px 12px;text-align:left;color:#888;font-weight:500">Loja</th>
            <th style="padding:8px 12px;text-align:left;color:#888;font-weight:500">Status</th>
            <th style="padding:8px 12px;text-align:left;color:#888;font-weight:500">Mensagem</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:#555">Acesse o painel para gerar o .bat de renovacao.</p>
    </div>`

  await sendAlert({ subject: `${toAlert.length} cookie(s) precisando atenção — Upseller Distinct`, html })
  markAlerted(alertKey)
}

// ── Tela ───────────────────────────────────────────────────────────────────

export default function Cookies() {
  const [clientes, setClientes] = useState([])
  const [loading,  setLoading]  = useState(false)

  const fetchLojas = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('lojas')
        .select(`
          id, nome_loja, shop_id, ativo, cliente_id,
          ultimo_status_cookie, ultimo_status_mensagem, ultimo_status_atualizado_em,
          clientes ( nome )
        `)
        .eq('ativo', true)
        .order('nome_loja')
      if (error) throw error

      // Agrupa por cliente
      const mapa = {}
      ;(data ?? []).forEach(l => {
        const cid   = l.cliente_id
        const cnome = l.clientes?.nome ?? '—'
        if (!mapa[cid]) mapa[cid] = { id: cid, nome: cnome, lojas: [] }
        mapa[cid].lojas.push({ ...l, nome_cliente: cnome })
      })

      const grouped = Object.values(mapa).sort((a, b) => a.nome.localeCompare(b.nome))
      setClientes(grouped)
      dispararAlertas(grouped)
    } catch (err) {
      console.error('fetchLojas:', err)
      toast.error('Erro ao carregar cookies: ' + (err.message ?? 'erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLojas() }, [fetchLojas])

  const renovarCliente = (cliente) => {
    downloadBat(cliente, 'renovar')
    toast.success(`Script baixado — renova ${cliente.lojas.length} loja(s) de ${cliente.nome}`, {
      style: { background: '#1E1E1E', color: '#FAFAFA', border: '1px solid rgba(115,243,164,0.30)' },
    })
  }

  // Contadores globais
  const totalErro = clientes.reduce((s, c) =>
    s + c.lojas.filter(l => l.ultimo_status_cookie === 'erro').length, 0)
  const totalAtencao = clientes.reduce((s, c) =>
    s + c.lojas.filter(l => l.ultimo_status_cookie === 'atencao').length, 0)

  return (
    <>
      <PageHeader
        eyebrow="Sessões"
        title="Cookies"
        sub="Status de cookie por loja. Clique no cliente para expandir e gerenciar."
        actions={
          <button
            onClick={fetchLojas}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-divider text-[12px] hover:border-[rgba(250,250,250,0.30)] hover:bg-muted-surface transition-all disabled:opacity-50"
          >
            <i className={`ti ti-refresh text-[13px] ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        }
      />

      {/* Banners de alerta */}
      {totalErro > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 mb-3 rounded-lg bg-[rgba(255,95,87,0.06)] border border-[rgba(255,95,87,0.25)] text-error-text text-[13px]">
          <i className="ti ti-alert-octagon text-[16px]" />
          <span>
            <strong>{totalErro}</strong> {totalErro === 1 ? 'loja precisa' : 'lojas precisam'} de ação imediata.
          </span>
        </div>
      )}
      {totalAtencao > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 mb-5 rounded-lg bg-[rgba(243,193,115,0.06)] border border-[rgba(243,193,115,0.25)] text-warn text-[13px]">
          <i className="ti ti-alert-triangle text-[16px]" />
          <span>
            <strong>{totalAtencao}</strong> {totalAtencao === 1 ? 'loja precisa' : 'lojas precisam'} de atenção.
          </span>
        </div>
      )}

      {loading && clientes.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-muted text-[13px]">
          <i className="ti ti-loader-2 animate-spin mr-2" /> Carregando...
        </div>
      ) : clientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted gap-3">
          <i className="ti ti-cookie text-3xl text-muted-light" />
          <p className="text-[13px]">Nenhuma loja ativa encontrada.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {clientes.map((c, i) => (
            <ClienteAccordion
              key={c.id}
              cliente={c}
              onRenovar={renovarCliente}
              defaultOpen={
                i === 0 ||
                c.lojas.some(l => l.ultimo_status_cookie === 'atencao' || l.ultimo_status_cookie === 'erro')
              }
            />
          ))}
        </div>
      )}
    </>
  )
}
