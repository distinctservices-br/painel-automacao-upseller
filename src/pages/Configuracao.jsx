import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

// ── Constantes ─────────────────────────────────────────────────────────────

const LS_URL   = 'supabase_url'
const LS_ANON  = 'anon_key'
const LS_EMAIL = 'alert_email'

// Detecta service_role key pelo payload JWT (nunca deve aparecer aqui)
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
    <div className="flex justify-between items-end gap-6 mb-7 pb-5 border-b border-divider">
      <div>
        {eyebrow && <p className="text-[11px] tracking-[0.12em] uppercase text-primary font-body mb-2">{eyebrow}</p>}
        <h1 className="font-display font-bold text-[28px] tracking-tight leading-none m-0">{title}</h1>
        {sub && <p className="text-muted text-[13px] mt-1">{sub}</p>}
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
      {help && <span className="text-[11px] text-muted-light">{help}</span>}
    </div>
  )
}

// ── Tela ───────────────────────────────────────────────────────────────────

export default function Configuracao() {
  const [form, setForm] = useState({ url: '', anonKey: '', alertEmail: '' })
  const [showKey, setShowKey] = useState(false)

  // Carrega do localStorage ao montar
  useEffect(() => {
    setForm({
      url:        localStorage.getItem(LS_URL)   ?? '',
      anonKey:    localStorage.getItem(LS_ANON)  ?? '',
      alertEmail: localStorage.getItem(LS_EMAIL) ?? '',
    })
  }, [])

  const up = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = () => {
    // Validações de segurança
    if (form.anonKey && isServiceRole(form.anonKey)) {
      toast.error('⚠️ Você está tentando salvar a service_role key — isso é proibido por segurança. Use apenas a anon key.')
      return
    }

    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (form.alertEmail && !emailRx.test(form.alertEmail)) {
      toast.error('Email de alertas inválido.')
      return
    }

    localStorage.setItem(LS_URL,   form.url)
    localStorage.setItem(LS_ANON,  form.anonKey)
    localStorage.setItem(LS_EMAIL, form.alertEmail)
    toast.success('Configuração salva')
  }

  const clear = () => {
    setForm({ url: '', anonKey: '', alertEmail: '' })
  }

  const anonKeyVazia  = !form.anonKey?.trim()
  const serviceRoleOk = form.anonKey ? !isServiceRole(form.anonKey) : true

  return (
    <>
      <PageHeader
        eyebrow="Sistema"
        title="Configuração"
        sub="Conexão com o backend e canal de alertas. Mudanças entram em vigor na próxima corrida do worker."
      />

      <div className="max-w-[640px]">
        {/* Alerta anon key vazia */}
        {anonKeyVazia && (
          <div className="flex items-center gap-3 px-4 py-3 mb-5 rounded-lg bg-[rgba(255,95,87,0.08)] border border-[rgba(255,95,87,0.25)] text-error-text text-[13px]">
            <i className="ti ti-alert-circle text-[18px]" />
            <span>Anon key não configurada — as chamadas ao Supabase vão falhar.</span>
          </div>
        )}

        {/* Alerta service_role detectada */}
        {!serviceRoleOk && (
          <div className="flex items-center gap-3 px-4 py-3 mb-5 rounded-lg bg-[rgba(255,95,87,0.12)] border border-[rgba(255,95,87,0.40)] text-error-text text-[13px]">
            <i className="ti ti-shield-exclamation text-[18px]" />
            <span><strong>ATENÇÃO:</strong> Isso é a service_role key — ela bypassa o RLS. Nunca use no frontend. Obtenha a <code className="font-mono">anon</code> key no Supabase Dashboard → API.</span>
          </div>
        )}

        <div className="glass-card p-8 flex flex-col gap-5">
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
            help='Chave pública anon — "service_role" nunca deve ser usada no painel.'
          >
            <div className="relative">
              <input
                className={inputCls + ' pr-10'}
                type={showKey ? 'text' : 'password'}
                value={form.anonKey}
                onChange={up('anonKey')}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white-1 transition-colors"
              >
                <i className={`ti ti-${showKey ? 'eye-off' : 'eye'} text-[16px]`} />
              </button>
            </div>
          </Field>

          <Field
            label="Email para alertas"
            help="Notificado em falhas consecutivas e cookies expirando."
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
              disabled={!serviceRoleOk}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-black-1 text-[13px] font-semibold hover:shadow-glow btn-glow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <i className="ti ti-device-floppy text-[14px]" />
              Salvar configuração
            </button>
          </div>
        </div>

        {/* Info cards de runtime */}
        <div className="grid grid-cols-3 gap-3.5 mt-7">
          {[
            { label: 'Schedule',     value: '*/30 06:30-13:30', sub: 'dias úteis' },
            { label: 'Retry policy', value: '3× · 60s',         sub: 'backoff fixo' },
            { label: 'Workers',      value: '2 online',          sub: 'healthy', green: true },
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
          <p>
            As configurações são salvas em <code className="font-mono text-[11px]">localStorage</code> — apenas no seu browser, nunca enviadas a servidores externos.
            A anon key é segura para uso no front-end; o RLS no Supabase garante o isolamento de dados.
          </p>
        </div>
      </div>
    </>
  )
}
