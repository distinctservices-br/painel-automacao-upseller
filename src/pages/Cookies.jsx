import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { calcCookieStatus, downloadBat } from '@/hooks/useClientes'
import { sendAlert, shouldAlert, markAlerted } from '@/lib/email'

// ── Helpers visuais ────────────────────────────────────────────────────────

function PageHeader({ eyebrow, title, sub, actions }) {
  return (
    <div className="flex justify-between items-end gap-6 mb-7 pb-5 border-b border-divider">
      <div>
        {eyebrow && <p className="text-[11px] tracking-[0.12em] uppercase text-primary font-body mb-2">{eyebrow}</p>}
        <h1 className="font-display font-bold text-[28px] tracking-tight leading-none m-0">{title}</h1>
        {sub && <p className="text-muted text-[13px] mt-1">{sub}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

const STATUS_MAP = {
  valido:    { label: 'válido',    cls: 'bg-[rgba(115,243,164,0.10)] border-[rgba(115,243,164,0.30)] text-primary' },
  expirando: { label: 'expirando', cls: 'bg-[rgba(243,193,115,0.10)] border-[rgba(243,193,115,0.35)] text-warn'   },
  expirado:  { label: 'expirado',  cls: 'bg-[rgba(255,95,87,0.10)]   border-[rgba(255,95,87,0.30)]   text-error-text' },
}

function CookieBadge({ status }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.expirado
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full border text-[11px] font-medium whitespace-nowrap ${s.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function diasDesde(iso) {
  if (!iso) return null
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

function expiracaoLabel(status, iso) {
  if (!iso) return 'Nunca renovado'
  const dias = diasDesde(iso)
  if (status === 'valido')    return `em ${11 - dias} dias`
  if (status === 'expirando') return `em ~${14 - dias}h (crítico)`
  return `há ${dias} dias (expirado)`
}

// ── Card ───────────────────────────────────────────────────────────────────

function CookieCard({ loja, onRenovar }) {
  const status     = calcCookieStatus(loja.cookie_renovado_em)
  const isExpiring = status === 'expirando' || status === 'expirado'

  return (
    <div className="glass-card glass-card-hover flex flex-col gap-3.5 p-6">
      <div className="flex justify-between items-start gap-3">
        <div>
          <p className="font-display font-semibold text-[15px]">{loja.nome_loja}</p>
          <p className="text-[12px] text-muted mt-0.5">
            {loja.nome_cliente} · Shopee · {loja.shop_id}
          </p>
        </div>
        <CookieBadge status={status} />
      </div>

      <div className="flex flex-col gap-1.5 text-[12px]">
        <div className="flex justify-between text-muted">
          <span>Última renovação</span>
          <span className="font-mono text-[11.5px] text-white-1">{formatDate(loja.cookie_renovado_em)}</span>
        </div>
        <div className="flex justify-between text-muted">
          <span>Estimativa de expiração</span>
          <span
            className={`font-mono text-[11.5px] ${
              status === 'expirando' ? 'text-warn'
              : status === 'expirado' ? 'text-error-text'
              : 'text-white-1'
            }`}
          >
            {expiracaoLabel(status, loja.cookie_renovado_em)}
          </span>
        </div>
      </div>

      {/* Instrução rápida */}
      <p className="text-[11px] text-muted leading-relaxed">
        Baixe o <span className="font-mono text-muted-light">.bat</span>, execute como administrador em{' '}
        <span className="font-mono text-muted-light">C:\n8n-upseller</span>, faça login no Upseller e pressione Enter.
      </p>

      <button
        onClick={() => onRenovar(loja)}
        className={`
          self-start flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all
          ${isExpiring
            ? 'bg-primary text-black-1 font-semibold hover:shadow-glow btn-glow'
            : 'border border-[rgba(250,250,250,0.15)] hover:border-[rgba(250,250,250,0.35)] hover:bg-muted-surface'
          }
        `}
      >
        <i className="ti ti-download text-[14px]" /> Renovar manualmente
      </button>
    </div>
  )
}

// ── Alertas de email ────────────────────────────────────────────────────────

async function dispararAlertas(lojas) {
  const expiradas  = lojas.filter(l => calcCookieStatus(l.cookie_renovado_em) === 'expirado')
  const expirando  = lojas.filter(l => calcCookieStatus(l.cookie_renovado_em) === 'expirando')

  const toAlert = [...expiradas, ...expirando]
  if (!toAlert.length) return

  // Rate-limit global: 1 alerta por 24h para o conjunto inteiro
  const alertKey = 'alert_cookies_checked'
  if (!shouldAlert(alertKey)) return

  const rows = toAlert.map(l => {
    const st = calcCookieStatus(l.cookie_renovado_em)
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
      <h2 style="margin:0 0 4px;font-size:20px;color:#73F3A4">⚠️ Alerta de Cookies — Upseller</h2>
      <p style="margin:0 0 24px;color:#888;font-size:13px">${toAlert.length} loja(s) com cookie expirando ou expirado.</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#1E1E1E">
            <th style="padding:8px 12px;text-align:left;color:#888;font-weight:500">Cliente</th>
            <th style="padding:8px 12px;text-align:left;color:#888;font-weight:500">Loja</th>
            <th style="padding:8px 12px;text-align:left;color:#888;font-weight:500">Status</th>
            <th style="padding:8px 12px;text-align:left;color:#888;font-weight:500">Última renovação</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:24px 0 0;font-size:12px;color:#555">
        Acesse o painel → Cookies → Renovar manualmente para gerar o .bat de renovação.
      </p>
    </div>`

  await sendAlert({
    subject: `⚠️ ${toAlert.length} cookie(s) expirando — Upseller Distinct`,
    html,
  })

  markAlerted(alertKey)
}

// ── Tela ───────────────────────────────────────────────────────────────────

export default function Cookies() {
  const [lojas,   setLojas]   = useState([])
  const [loading, setLoading] = useState(false)

  const fetchLojas = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('lojas')
        .select(`
          id,
          nome_loja,
          shop_id,
          cookie_renovado_em,
          ativo,
          cliente_id,
          clientes ( nome )
        `)
        .eq('ativo', true)
        .order('nome_loja')

      if (error) throw error

      const rows = (data ?? []).map((l) => ({
        ...l,
        nome_cliente: l.clientes?.nome ?? '—',
      }))

      setLojas(rows)
      // Dispara alertas de email (rate-limited 24h)
      dispararAlertas(rows)
    } catch (err) {
      console.error('fetchLojas:', err)
      toast.error('Erro ao carregar cookies: ' + (err.message ?? 'erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLojas() }, [fetchLojas])

  const renovarManualmente = (loja) => {
    downloadBat(loja, 'renovar')
    toast.success(`Script de renovação baixado para ${loja.nome_loja}`, {
      duration: 4000,
      style: { background: '#1E1E1E', color: '#FAFAFA', border: '1px solid rgba(115,243,164,0.30)' },
    })
  }

  // Contadores para o header
  const countExpirando = lojas.filter((l) => {
    const s = calcCookieStatus(l.cookie_renovado_em)
    return s === 'expirando' || s === 'expirado'
  }).length

  return (
    <>
      <PageHeader
        eyebrow="Sessões"
        title="Cookies"
        sub="Cada loja mantém uma sessão autenticada. Quando o cookie estiver expirando, baixe o .bat e execute localmente para renovar."
        actions={
          <button
            onClick={fetchLojas}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(250,250,250,0.15)] text-[12px] hover:border-[rgba(250,250,250,0.35)] hover:bg-muted-surface transition-all disabled:opacity-50"
          >
            <i className={`ti ti-refresh text-[14px] ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        }
      />

      {countExpirando > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 mb-5 rounded-lg bg-[rgba(243,193,115,0.08)] border border-[rgba(243,193,115,0.25)] text-warn text-[13px]">
          <i className="ti ti-alert-triangle text-[18px]" />
          <span>
            <strong>{countExpirando}</strong>{' '}
            {countExpirando === 1 ? 'loja com cookie expirando ou expirado' : 'lojas com cookies expirando ou expirados'}.
            Gere e execute o script de renovação antes da próxima corrida.
          </span>
        </div>
      )}

      {/* Instrução geral */}
      <div className="flex items-start gap-3 px-4 py-3.5 mb-5 rounded-lg bg-muted-surface border border-divider text-[12px] text-muted">
        <i className="ti ti-info-circle text-[16px] flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-white-1 mb-0.5">Como funciona a renovação manual</p>
          <p className="leading-relaxed">
            Clique em <strong className="text-white-1">Renovar manualmente</strong> na loja desejada para baixar um{' '}
            <span className="font-mono text-muted-light">.bat</span>. Execute-o como administrador em qualquer máquina
            Windows com Node.js instalado — ele abrirá o Upseller no browser, aguardará seu login e salvará o cookie no Supabase automaticamente.
          </p>
        </div>
      </div>

      {loading && lojas.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-muted">
          <i className="ti ti-loader-2 animate-spin text-2xl mr-3" /> Carregando cookies…
        </div>
      ) : lojas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted gap-3">
          <i className="ti ti-cookie text-4xl text-muted-light" />
          <p className="text-[14px]">Nenhuma loja ativa encontrada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-4">
          {lojas.map((l) => (
            <CookieCard
              key={l.id}
              loja={l}
              onRenovar={renovarManualmente}
            />
          ))}
        </div>
      )}
    </>
  )
}
