import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

// ── Constantes ─────────────────────────────────────────────────────────────

const LS_URL      = 'supabase_url'
const LS_ANON     = 'anon_key'
const LS_SERVICE  = 'service_role_key'
const LS_EMAIL    = 'alert_email'

// Detecta service_role key pelo payload JWT
function isServiceRole(key) {
  try {
    const payload = JSON.parse(atob(key.split('.')[1]))
    return payload?.role === 'service_role'
  } catch {
    return false
  }
}

function PageHeader({ eyebrow, title, sub }) {
  return (
    <div className="flex flex-wrap justify-between items-end gap-4 mb-6 pb-5 border-b border-divider">
      <div>
        {eyebrow && <p className="text-[11px] tracking-[0.12em] uppercase text-primary font-body mb-2">{eyebrow}</p>}
        <h1 className="font-display font-bold text-[22px] sm:text-[28px] tracking-tight leading-none">{title}</h1>
        {sub && <p className="text-muted text-[12px] sm:text-[13px] mt-1">{sub}</p>}
      </div>
    </div>
  )
}

const inputCls = `
  w-full bg-surface border border-[rgba(250,250,250,0.08)] text-white-1 rounded-[10px]
  px-3 py-2.5 text-[13px] font-body outline-none
  focus:border-[rgba(115,243,164,0.45)] focus:ring-2 focus:ring-[rgba(115,243,164,0.10)]
  transition-all duration-150 placeholder:text-muted-light
`

function Field({ label, help, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] uppercase tracking-[0.07em] font-medium text-muted">{label}</label>
      {children}
      {help && <span className="text-[11px] text-muted-light leading-relaxed">{help}</span>}
    </div>
  )
}

function RevealInput({ value, onChange, placeholder }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        className={inputCls + ' pr-10'}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck="false"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white-1 transition-colors"
      >
        <i className={`ti ti-${show ? 'eye-off' : 'eye'} text-[16px]`} />
      </button>
    </div>
  )
}

// ── Tela ───────────────────────────────────────────────────────────────────

export default function Configuracao() {
  const [form, setForm] = useState({
    url:        '',
    anonKey:    '',
    serviceKey: '',
    alertEmail: '',
  })

  // Carrega do localStorage ao montar
  useEffect(() => {
    setForm({
      url:        localStorage.getItem(LS_URL)     ?? '',
      anonKey:    localStorage.getItem(LS_ANON)    ?? '',
      serviceKey: localStorage.getItem(LS_SERVICE) ?? '',
      alertEmail: localStorage.getItem(LS_EMAIL)   ?? '',
    })
  }, [])

  const up = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = () => {
    // Anon key não pode ser service_role
    if (form.anonKey && isServiceRole(form.anonKey)) {
      toast.error('⚠️ Campo "Anon key" contém a service_role key — isso é proibido. Use apenas a chave anon.')
      return
    }

    // Service key DEVE ser service_role (se preenchida)
    if (form.serviceKey && !isServiceRole(form.serviceKey)) {
      toast.error('O campo "Service Role Key" não parece ser uma service_role key. Verifique no Supabase Dashboard.')
      return
    }

    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (form.alertEmail && !emailRx.test(form.alertEmail)) {
      toast.error('Email de alertas inválido.')
      return
    }

    localStorage.setItem(LS_URL,     form.url)
    localStorage.setItem(LS_ANON,    form.anonKey)
    localStorage.setItem(LS_SERVICE, form.serviceKey)
    localStorage.setItem(LS_EMAIL,   form.alertEmail)
    toast.success('Configuração salva')
  }

  const clear = () => {
    setForm({ url: '', anonKey: '', serviceKey: '', alertEmail: '' })
  }

  const anonKeyVazia = !form.anonKey?.trim()
  const anonIsService = form.anonKey ? isServiceRole(form.anonKey) : false

  return (
    <>
      <PageHeader
        eyebrow="Sistema"
        title="Configuração"
        sub="Conexão com o backend, chaves de API e canal de alertas."
      />

      <div className="w-full max-w-[640px]">
        {/* Alertas */}
        {anonKeyVazia && (
          <div className="flex items-center gap-3 px-4 py-3 mb-5 rounded-lg bg-[rgba(255,95,87,0.08)] border border-[rgba(255,95,87,0.25)] text-error-text text-[13px]">
            <i className="ti ti-alert-circle text-[18px]" />
            <span>Anon key não configurada — as chamadas ao Supabase vão falhar.</span>
          </div>
        )}
        {anonIsService && (
          <div className="flex items-center gap-3 px-4 py-3 mb-5 rounded-lg bg-[rgba(255,95,87,0.12)] border border-[rgba(255,95,87,0.40)] text-error-text text-[13px]">
            <i className="ti ti-shield-exclamation text-[18px]" />
            <span>
              <strong>ATENÇÃO:</strong> O campo "Anon key" contém a service_role key — isso bypassa o RLS.
              Nunca use no frontend. Obtenha a <code className="font-mono">anon</code> key no Supabase Dashboard → API.
            </span>
          </div>
        )}

        <div className="glass-card p-8 flex flex-col gap-5">

          {/* ── Conexão Supabase ─────────────────── */}
          <p className="text-[11px] uppercase tracking-[0.10em] font-medium text-muted border-b border-divider pb-2">
            Supabase
          </p>

          <Field
            label="URL do Supabase"
            help="Endpoint do projeto onde clientes, lojas e execuções são persistidos."
          >
            <input
              className={inputCls}
              value={form.url}
              onChange={up('url')}
              placeholder="https://proj.supabase.co"
            />
          </Field>

          <Field
            label="Anon key"
            help='Chave pública — usada no frontend para todas as queries (RLS ativo). Nunca use service_role aqui.'
          >
            <RevealInput
              value={form.anonKey}
              onChange={up('anonKey')}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9… (role: anon)"
            />
          </Field>

          {/* ── Service Role Key ─────────────────── */}
          <div className="flex flex-col gap-1.5 mt-2">
            <p className="text-[11px] uppercase tracking-[0.10em] font-medium text-muted border-b border-divider pb-2">
              Scripts locais (.bat)
            </p>
            <div className="flex items-start gap-2.5 px-3 py-3 rounded-lg bg-[rgba(243,193,115,0.06)] border border-[rgba(243,193,115,0.20)] text-warn text-[12px] mt-1">
              <i className="ti ti-alert-triangle text-[15px] flex-shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                A service_role key é necessária apenas para os scripts <span className="font-mono">.bat</span> de
                configuração de loja — eles rodam localmente no Windows (nunca no browser) e precisam fazer PATCH
                direto no Supabase bypassando o RLS. Ela é armazenada só no seu{' '}
                <span className="font-mono">localStorage</span> e embutida no .bat somente no momento do download.
              </p>
            </div>
          </div>

          <Field
            label="Service Role Key"
            help="Usada exclusivamente na geração dos .bat locais. Nunca enviada a servidores externos."
          >
            <RevealInput
              value={form.serviceKey}
              onChange={up('serviceKey')}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9… (role: service_role)"
            />
          </Field>

          {/* ── Alertas ─────────────────────────── */}
          <p className="text-[11px] uppercase tracking-[0.10em] font-medium text-muted border-b border-divider pb-2 mt-2">
            Alertas por email
          </p>

          <Field
            label="Email para alertas"
            help="Notificado quando cookies estiverem expirando ou expirados (no máximo 1 email a cada 24h)."
          >
            <input
              className={inputCls}
              type="email"
              value={form.alertEmail}
              onChange={up('alertEmail')}
              placeholder="alertas@upseller.com.br"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-4 border-t border-divider">
            <button
              onClick={clear}
              className="px-4 py-2 rounded-full text-muted text-[13px] hover:text-white-1 hover:bg-muted-surface transition-all"
            >
              Limpar
            </button>
            <button
              onClick={save}
              disabled={anonIsService}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-black-1 text-[13px] font-semibold hover:shadow-glow btn-glow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="ti ti-device-floppy text-[14px]" />
              Salvar configuração
            </button>
          </div>
        </div>

        {/* Info cards de runtime */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          {[
            { label: 'Schedule',     value: '*/30 06:30-13:30', sub: 'dias úteis' },
            { label: 'Retry policy', value: '3× · 60s',          sub: 'backoff fixo' },
            { label: 'Workers',      value: '2 online',           sub: 'healthy', green: true },
          ].map((m) => (
            <div key={m.label} className="glass-card p-5 flex flex-col gap-1.5">
              <p className="text-[11px] tracking-[0.08em] uppercase text-muted">{m.label}</p>
              <p className={`font-mono text-[13px] mt-1 ${m.green ? 'text-primary' : 'text-white-1'}`}>{m.value}</p>
              <p className={`text-[11px] ${m.green ? 'text-primary' : 'text-muted'}`}>{m.sub}</p>
            </div>
          ))}
        </div>

        {/* Nota de segurança */}
        <div className="mt-6 flex items-start gap-2.5 px-4 py-3.5 rounded-lg bg-muted-surface border border-divider text-muted text-[12px]">
          <i className="ti ti-lock text-[16px] flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Todas as configurações ficam em <code className="font-mono text-[11px]">localStorage</code> — apenas no seu browser, nunca
            enviadas a servidores externos. A anon key é segura para o frontend; o RLS no Supabase isola os dados por sessão.
            A service_role key é embutida nos <code className="font-mono text-[11px]">.bat</code> locais no momento do download —
            garanta que os arquivos gerados não sejam compartilhados.
          </p>
        </div>
      </div>
    </>
  )
}
