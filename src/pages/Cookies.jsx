import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'
import { calcCookieStatus } from '@/hooks/useClientes'

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
  valido:    { label: 'válido',   cls: 'bg-[rgba(115,243,164,0.10)] border-[rgba(115,243,164,0.30)] text-primary' },
  expirando: { label: 'expirando', cls: 'bg-[rgba(243,193,115,0.10)] border-[rgba(243,193,115,0.35)] text-warn'   },
  expirado:  { label: 'expirado', cls: 'bg-[rgba(255,95,87,0.10)]   border-[rgba(255,95,87,0.30)]   text-error-text' },
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
  if (!iso)                return 'Nunca renovado'
  const dias = diasDesde(iso)
  if (status === 'valido')    return `em ${11 - dias} dias`
  if (status === 'expirando') return `em ~${14 - dias}h (crítico)`
  return `há ${dias} dias (expirado)`
}

// ── Card ───────────────────────────────────────────────────────────────────

function CookieCard({ loja, onForceRenew, renewing }) {
  const status   = calcCookieStatus(loja.cookie_renovado_em)
  const isExpiring = status === 'expirando' || status === 'expirado'

  return (
    <div
      className={`glass-card glass-card-hover flex flex-col gap-3.5 p-6 transition-opacity duration-200 ${renewing ? 'opacity-50' : ''}`}
    >
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
            className={`font-mono text-[11.5px] ${isExpiring && status !== 'expirado' ? 'text-warn' : status === 'expirado' ? 'text-error-text' : 'text-white-1'}`}
          >
            {expiracaoLabel(status, loja.cookie_renovado_em)}
          </span>
        </div>
      </div>

      <button
        onClick={() => onForceRenew(loja)}
        disabled={renewing}
        className={`
          self-start flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all
          ${isExpiring
            ? 'bg-primary text-black-1 font-semibold hover:shadow-glow btn-glow'
            : 'border border-[rgba(250,250,250,0.15)] hover:border-[rgba(250,250,250,0.35)] hover:bg-muted-surface'
          }
          disabled:opacity-40 disabled:cursor-not-allowed
        `}
      >
        {renewing
          ? <><i className="ti ti-loader-2 animate-spin text-[14px]" /> Renovando…</>
          : <><i className="ti ti-refresh text-[14px]" /> Forçar renovação</>
        }
      </button>
    </div>
  )
}

// ── Tela ───────────────────────────────────────────────────────────────────

export default function Cookies() {
  const [lojas,    setLojas]    = useState([])
  const [loading,  setLoading]  = useState(false)
  const [renewing, setRenewing] = useState(null) // shop_id em renovação

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

      setLojas(
        (data ?? []).map((l) => ({
          ...l,
          nome_cliente: l.clientes?.nome ?? '—',
        }))
      )
    } catch (err) {
      console.error('fetchLojas:', err)
      toast.error('Erro ao carregar cookies: ' + (err.message ?? 'erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchLojas() }, [fetchLojas])

  const forceRenew = async (loja) => {
    setRenewing(loja.shop_id)
    // Integração real com n8n será feita depois.
    // Por ora exibe o toast e simula latência de rede.
    await new Promise((r) => setTimeout(r, 1200))
    setRenewing(null)
    toast.success(`Renovação de ${loja.nome_loja} iniciada via n8n`)
  }

  const renovarTodos = async () => {
    toast('Renovação de todos os cookies iniciada via n8n', {
      icon: '🔄',
      style: { background: '#1E1E1E', color: '#FAFAFA', border: '1px solid rgba(115,243,164,0.30)' },
    })
  }

  // Contadores para o header
  const expirando = lojas.filter((l) => {
    const s = calcCookieStatus(l.cookie_renovado_em)
    return s === 'expirando' || s === 'expirado'
  }).length

  return (
    <>
      <PageHeader
        eyebrow="Sessões"
        title="Cookies"
        sub="Cada loja mantém uma sessão autenticada renovada pelo worker. O Upseller bloqueia logins simultâneos — só uma renovação por shop por vez."
        actions={
          <button
            onClick={renovarTodos}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(250,250,250,0.15)] text-[12px] hover:border-[rgba(250,250,250,0.35)] hover:bg-muted-surface transition-all"
          >
            <i className="ti ti-refresh text-[14px]" /> Renovar todos
          </button>
        }
      />

      {expirando > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 mb-5 rounded-lg bg-[rgba(243,193,115,0.08)] border border-[rgba(243,193,115,0.25)] text-warn text-[13px]">
          <i className="ti ti-alert-triangle text-[18px]" />
          <span>
            <strong>{expirando}</strong> {expirando === 1 ? 'loja com cookie expirando ou expirado' : 'lojas com cookies expirando ou expirados'}. Renove antes da próxima corrida.
          </span>
        </div>
      )}

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
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
          {lojas.map((l) => (
            <CookieCard
              key={l.id}
              loja={l}
              onForceRenew={forceRenew}
              renewing={renewing === l.shop_id}
            />
          ))}
        </div>
      )}
    </>
  )
}
