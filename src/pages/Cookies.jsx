import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { calcCookieStatus, downloadBat } from '@/hooks/useClientes'
import { sendAlert, shouldAlert, markAlerted } from '@/lib/email'

// ── Helpers ────────────────────────────────────────────────────────────────

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

const STATUS_MAP = {
  valido:    { label: 'válido',    cls: 'text-primary',     dot: 'bg-primary' },
  expirando: { label: 'expirando', cls: 'text-warn',        dot: 'bg-warn' },
  expirado:  { label: 'expirado',  cls: 'text-error-text',  dot: 'bg-error-text' },
}

function CookieBadge({ status }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.expirado
  return (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return 'nunca'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function diasDesde(iso) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function expiracaoLabel(status, iso) {
  if (!iso) return 'nunca renovado'
  const dias = diasDesde(iso)
  if (status === 'valido')    return `expira em ${11 - dias}d`
  if (status === 'expirando') return `expira em breve`
  return `expirado há ${dias}d`
}

// ── Linha de loja (dentro do accordion, sem botão) ────────────────────────

function LojaRow({ loja }) {
  const status = calcCookieStatus(loja.cookie_renovado_em)

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-black-1 border border-divider">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-medium text-white-1 truncate">{loja.nome_loja}</p>
          <CookieBadge status={status} />
        </div>
        <p className="text-[11px] text-muted mt-0.5 font-mono">
          {loja.shop_id} · {formatDate(loja.cookie_renovado_em)} · {expiracaoLabel(status, loja.cookie_renovado_em)}
        </p>
      </div>
    </div>
  )
}

// ── Accordion por cliente ──────────────────────────────────────────────────

function ClienteAccordion({ cliente, onRenovar, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen)

  const countIssues = cliente.lojas.filter(l => {
    const s = calcCookieStatus(l.cookie_renovado_em)
    return s === 'expirando' || s === 'expirado'
  }).length
  const hasIssues = countIssues > 0

  return (
    <div className="bg-black-2 border border-divider rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 sm:px-5 py-3.5">
        {/* Toggle (clica em quase toda a área do header) */}
        <button
          onClick={() => setOpen(v => !v)}
          className="flex-1 flex items-center justify-between gap-3 min-w-0 text-left -mx-2 px-2 py-1 rounded-[6px] hover:bg-muted-surface transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <i className={`ti ti-chevron-right text-muted text-[14px] transition-transform duration-200 flex-shrink-0 ${open ? 'rotate-90' : ''}`} />
            <span className="font-display font-semibold text-[14px] truncate">{cliente.nome}</span>
            {hasIssues && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[rgba(255,95,87,0.10)] border border-[rgba(255,95,87,0.25)] text-error-text flex-shrink-0">
                {countIssues} {countIssues === 1 ? 'alerta' : 'alertas'}
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted flex-shrink-0 hidden sm:block">
            {cliente.lojas.length} {cliente.lojas.length === 1 ? 'loja' : 'lojas'}
          </span>
        </button>

        {/* Botão Renovar — atualiza TODAS as lojas do cliente */}
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

// ── Alertas de email ────────────────────────────────────────────────────────

async function dispararAlertas(clientes) {
  const lojas = clientes.flatMap(c => c.lojas.map(l => ({ ...l, nome_cliente: c.nome })))
  const toAlert = lojas.filter(l => {
    const s = calcCookieStatus(l.cookie_renovado_em)
    return s === 'expirando' || s === 'expirado'
  })
  if (!toAlert.length) return

  const alertKey = 'alert_cookies_checked'
  if (!shouldAlert(alertKey)) return

  const rows = toAlert.map(l => {
    const st  = calcCookieStatus(l.cookie_renovado_em)
    const cor = st === 'expirado' ? '#FF5F57' : '#F3C173'
    return `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #2A2A2A">${l.nome_cliente}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2A2A2A">${l.nome_loja}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2A2A2A;color:${cor};font-weight:600">${st}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #2A2A2A;font-family:monospace;font-size:12px">${formatDate(l.cookie_renovado_em)}</td>
      </tr>`
  }).join('')

  const html = `
    <div style="font-family:Inter,sans-serif;background:#0F0F0F;color:#FAFAFA;padding:32px;border-radius:12px;max-width:620px">
      <h2 style="margin:0 0 4px;font-size:18px;color:#73F3A4">Alerta de Cookies — Upseller</h2>
      <p style="margin:0 0 20px;color:#888;font-size:13px">${toAlert.length} loja(s) com cookie expirando ou expirado.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#1E1E1E">
            <th style="padding:8px 12px;text-align:left;color:#888;font-weight:500">Cliente</th>
            <th style="padding:8px 12px;text-align:left;color:#888;font-weight:500">Loja</th>
            <th style="padding:8px 12px;text-align:left;color:#888;font-weight:500">Status</th>
            <th style="padding:8px 12px;text-align:left;color:#888;font-weight:500">Ultima renovacao</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:#555">Acesse o painel para gerar o .bat de renovacao.</p>
    </div>`

  await sendAlert({ subject: `${toAlert.length} cookie(s) expirando — Upseller Distinct`, html })
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
        .select('id, nome_loja, shop_id, cookie_renovado_em, ativo, cliente_id, clientes ( nome )')
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

  const totalAlertas = clientes.reduce((s, c) => s + c.lojas.filter(l => {
    const st = calcCookieStatus(l.cookie_renovado_em)
    return st === 'expirando' || st === 'expirado'
  }).length, 0)

  return (
    <>
      <PageHeader
        eyebrow="Sessoes"
        title="Cookies"
        sub="Sessoes autenticadas por loja. Clique no cliente para expandir e gerenciar."
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

      {totalAlertas > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 mb-5 rounded-lg bg-[rgba(255,95,87,0.06)] border border-[rgba(255,95,87,0.20)] text-error-text text-[13px]">
          <i className="ti ti-alert-triangle text-[16px]" />
          <span>
            <strong>{totalAlertas}</strong> {totalAlertas === 1 ? 'cookie expirando ou expirado' : 'cookies expirando ou expirados'} — renove antes da proxima corrida.
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
              defaultOpen={i === 0 || c.lojas.some(l => {
                const s = calcCookieStatus(l.cookie_renovado_em)
                return s === 'expirando' || s === 'expirado'
              })}
            />
          ))}
        </div>
      )}
    </>
  )
}
