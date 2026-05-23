import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useClientes } from '@/hooks/useClientes'

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_BADGE = {
  valido:    { label: 'válido',           cls: 'bg-[rgba(115,243,164,0.10)] border-[rgba(115,243,164,0.30)] text-primary' },
  expirando: { label: 'cookie expirando', cls: 'bg-[rgba(243,193,115,0.10)] border-[rgba(243,193,115,0.35)] text-warn'   },
  expirado:  { label: 'expirado',         cls: 'bg-[rgba(255,95,87,0.10)]   border-[rgba(255,95,87,0.30)]   text-error-text' },
}

function Badge({ kind = 'neutral', children }) {
  const map = {
    success: 'bg-[rgba(115,243,164,0.10)] border-[rgba(115,243,164,0.30)] text-primary',
    warn:    'bg-[rgba(243,193,115,0.10)] border-[rgba(243,193,115,0.35)] text-warn',
    error:   'bg-[rgba(255,95,87,0.10)]   border-[rgba(255,95,87,0.30)]   text-error-text',
    neutral: 'bg-muted-surface border-divider text-muted',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full border text-[11px] font-medium whitespace-nowrap before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current ${map[kind] ?? map.neutral}`}>
      {children}
    </span>
  )
}

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

// ── Sub-components ─────────────────────────────────────────────────────────

function ClienteCard({ cliente, onGenerateBat, onShowExecucoes }) {
  return (
    <div className="glass-card glass-card-hover flex flex-col gap-4 p-6">
      <div className="flex justify-between items-start gap-3">
        <div>
          <p className="font-display font-semibold text-[18px] tracking-tight">{cliente.nome}</p>
          <p className="font-mono text-[11px] text-muted-light mt-0.5">{cliente.id}</p>
        </div>
        <Badge kind="success">
          {cliente.lojas.length} {cliente.lojas.length === 1 ? 'loja' : 'lojas'}
        </Badge>
      </div>

      <div className="flex flex-col gap-2">
        {cliente.lojas.map((loja) => {
          const s = STATUS_BADGE[loja.cookieStatus] ?? STATUS_BADGE.expirado
          return (
            <div
              key={loja.id}
              className="flex justify-between items-center px-3 py-2.5 rounded-[10px] bg-[rgba(250,250,250,0.02)] border border-divider"
            >
              <div>
                <p className="text-[13px] font-medium">
                  {loja.nome_loja}{' '}
                  <span className="text-muted-light">· {loja.shop_id}</span>
                </p>
                <p className="font-mono text-[11px] text-muted">shop {loja.shop_id}</p>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full border text-[11px] font-medium whitespace-nowrap ${s.cls}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                {s.label}
              </span>
            </div>
          )
        })}
      </div>

      <div className="flex gap-2 pt-2 border-t border-dashed border-divider">
        <button
          onClick={() => onGenerateBat(cliente)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-black-1 text-[12px] font-semibold transition-all hover:shadow-glow hover:-translate-y-px btn-glow"
        >
          <i className="ti ti-file-code text-[14px]" /> Gerar .bat
        </button>
        <button
          onClick={onShowExecucoes}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(250,250,250,0.15)] text-[12px] font-medium transition-all hover:border-[rgba(250,250,250,0.35)] hover:bg-muted-surface"
        >
          <i className="ti ti-history text-[14px]" /> Execuções
        </button>
      </div>
    </div>
  )
}

// ── Modal Novo Cliente ────────────────────────────────────────────────────

const FORM_VAZIO = {
  nome: '', email: '', nomeLoja: '', shopId: '', ordem: '1', emailUpseller: '', senhaUpseller: '',
}

function NovoClienteModal({ onClose, onCreate, loading }) {
  const [form, setForm] = useState(FORM_VAZIO)
  const up = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const canSubmit = form.nome && form.email && form.nomeLoja && form.shopId && form.emailUpseller && form.senhaUpseller

  // Fecha com Esc
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (canSubmit) onCreate(form)
  }

  return (
    <div
      className="fixed inset-0 bg-[rgba(15,15,15,0.65)] backdrop-blur-md z-50 grid place-items-center p-6 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-black-2 border border-glass-border rounded-lg shadow-elev w-full max-w-[560px] max-h-[90vh] overflow-auto animate-slide-up">
        {/* Head */}
        <div className="flex justify-between items-start gap-3 px-6 py-5 border-b border-divider">
          <div>
            <h2 className="font-display font-bold text-[18px] tracking-tight">Novo cliente</h2>
            <p className="text-muted text-[12px] mt-1">Cadastre o cliente, registre a loja inicial e baixe o .bat do worker.</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white-1 hover:bg-muted-surface rounded-[6px] p-1 transition-colors">
            <i className="ti ti-x text-[18px]" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
          <Field label="Nome do cliente">
            <input className={inputCls} placeholder="ex. Rafael Teste" value={form.nome} onChange={up('nome')} required />
          </Field>
          <Field label="Email de contato">
            <input className={inputCls} type="email" placeholder="rafael@empresa.com.br" value={form.email} onChange={up('email')} required />
          </Field>

          <hr className="border-divider my-1" />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome da loja">
              <input className={inputCls} placeholder="ex. SS Personalizados" value={form.nomeLoja} onChange={up('nomeLoja')} required />
            </Field>
            <Field label="Shop ID">
              <input className={inputCls} placeholder="321627" value={form.shopId} onChange={up('shopId')} required />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Ordem" help="Prioridade de execução entre lojas do mesmo cliente.">
              <input className={inputCls} type="number" min="1" value={form.ordem} onChange={up('ordem')} />
            </Field>
            <Field label="Email Upseller">
              <input className={inputCls} type="email" placeholder="login@upseller" value={form.emailUpseller} onChange={up('emailUpseller')} required />
            </Field>
          </div>

          <Field label="Senha Upseller" help="Armazenada criptografada no Supabase — usada apenas pelo worker.">
            <input className={inputCls} type="password" placeholder="••••••••" value={form.senhaUpseller} onChange={up('senhaUpseller')} required />
          </Field>
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-divider">
          <button onClick={onClose} className="px-4 py-2 rounded-full text-muted text-[13px] hover:text-white-1 hover:bg-muted-surface transition-all">
            Cancelar
          </button>
          <button
            onClick={() => { if (canSubmit) onCreate(form) }}
            disabled={!canSubmit || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-black-1 text-[13px] font-semibold transition-all hover:shadow-glow btn-glow disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <i className="ti ti-loader-2 animate-spin text-[14px]" /> : <i className="ti ti-file-code text-[14px]" />}
            Criar e gerar .bat
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal .bat ─────────────────────────────────────────────────────────────

function BatModal({ loja, cliente, batContent, onClose }) {
  const filename = `upseller_${loja.nome_loja.toLowerCase().replace(/\s+/g, '_')}.bat`

  const download = () => {
    const blob = new Blob([batContent], { type: 'application/octet-stream' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
    toast.success('.bat baixado!')
  }

  const copy = () => {
    navigator.clipboard?.writeText(batContent)
    toast.success('Copiado!')
  }

  const colorize = (line, i) => {
    let cls = 'text-[rgba(250,250,250,0.75)]'
    if (line.startsWith('@echo') || line.startsWith('pause')) cls = 'text-[rgba(250,250,250,0.50)]'
    else if (line.startsWith('echo')) cls = 'text-primary'
    else if (line.startsWith('set ')) cls = 'text-warn'
    else if (line.startsWith('cd '))  cls = 'text-[rgba(250,250,250,0.50)]'
    else if (line.startsWith('npm') || line.startsWith('node')) cls = 'text-[#79BD89]'
    return <span key={i} className={cls}>{line + '\n'}</span>
  }

  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-[rgba(15,15,15,0.65)] backdrop-blur-md z-50 grid place-items-center p-6 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-black-2 border border-glass-border rounded-lg shadow-elev w-full max-w-[720px] max-h-[90vh] overflow-auto animate-slide-up">
        <div className="flex justify-between items-start gap-3 px-6 py-5 border-b border-divider">
          <div>
            <h2 className="font-display font-bold text-[18px] tracking-tight">.bat gerado — {cliente.nome}</h2>
            <p className="text-muted text-[12px] mt-1">Salve em uma pasta dedicada no Windows do cliente. O worker abrirá uma janela e rodará.</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-white-1 hover:bg-muted-surface rounded-[6px] p-1 transition-colors">
            <i className="ti ti-x text-[18px]" />
          </button>
        </div>

        <div className="p-6">
          {/* Terminal */}
          <div className="bg-[#080808] border border-divider rounded-[10px] overflow-hidden font-mono text-[12px] leading-[1.65]">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-[rgba(250,250,250,0.02)] border-b border-divider">
              <span className="w-[11px] h-[11px] rounded-full bg-[#FF5F57]" />
              <span className="w-[11px] h-[11px] rounded-full bg-[#FEBC2E]" />
              <span className="w-[11px] h-[11px] rounded-full bg-[#28C840]" />
              <span className="ml-2.5 text-[11px] text-muted">{filename}</span>
            </div>
            <pre className="px-4 py-3.5 overflow-auto max-h-[320px] text-[rgba(250,250,250,0.75)] whitespace-pre m-0">
              {batContent.split('\n').map(colorize)}
            </pre>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-divider">
          <button onClick={copy} className="flex items-center gap-2 px-3 py-2 rounded-full text-muted text-[13px] hover:text-white-1 hover:bg-muted-surface transition-all">
            <i className="ti ti-copy text-[14px]" /> Copiar
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-full border border-[rgba(250,250,250,0.15)] text-[13px] hover:border-[rgba(250,250,250,0.35)] hover:bg-muted-surface transition-all">
            Fechar
          </button>
          <button onClick={download} className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-black-1 text-[13px] font-semibold hover:shadow-glow btn-glow transition-all">
            <i className="ti ti-download text-[14px]" /> Baixar .bat
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Helpers visuais ────────────────────────────────────────────────────────

const inputCls = `
  w-full bg-surface border border-[rgba(250,250,250,0.08)] text-white-1 rounded-[10px]
  px-3 py-2 text-[13px] font-body outline-none
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

// ── Tela principal ─────────────────────────────────────────────────────────

export default function Clientes() {
  const { clientes, loading, fetchClientes, criarCliente, downloadBat, gerarBat } = useClientes()
  const [newOpen, setNewOpen] = useState(false)
  const [batData, setBatData] = useState(null) // { loja, cliente, content }

  useEffect(() => { fetchClientes() }, [fetchClientes])

  const handleCriar = async (form) => {
    const loja = await criarCliente(form)
    if (!loja) return
    setNewOpen(false)
    const cliente = clientes.find((c) => c.id === loja.cliente_id) ?? { nome: form.nome }
    setBatData({ loja, cliente: { ...cliente, nome: form.nome }, content: gerarBat(loja.id, loja.nome_loja) })
  }

  const abrirBat = (cliente) => {
    const loja = cliente.lojas[0]
    if (!loja) return
    setBatData({ loja, cliente, content: gerarBat(loja.id, loja.nome_loja) })
  }

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Clientes"
        sub={
          loading
            ? 'Carregando…'
            : `${clientes.length} cliente${clientes.length === 1 ? '' : 's'} · ${clientes.reduce((s, c) => s + c.lojas.length, 0)} lojas conectadas`
        }
        actions={
          <>
            <button
              onClick={fetchClientes}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(250,250,250,0.15)] text-[12px] hover:border-[rgba(250,250,250,0.35)] hover:bg-muted-surface transition-all"
              disabled={loading}
            >
              <i className={`ti ti-refresh text-[14px] ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Atualizando…' : 'Atualizar'}
            </button>
            <button
              onClick={() => setNewOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-black-1 text-[12px] font-semibold hover:shadow-glow btn-glow transition-all"
            >
              <i className="ti ti-plus text-[14px]" /> Novo cliente
            </button>
          </>
        }
      />

      {loading && clientes.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-muted">
          <i className="ti ti-loader-2 animate-spin text-2xl mr-3" /> Carregando clientes…
        </div>
      ) : clientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted gap-3">
          <i className="ti ti-users-group text-4xl text-muted-light" />
          <p className="text-[14px]">Nenhum cliente cadastrado ainda.</p>
          <button
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-black-1 text-[13px] font-semibold mt-2 hover:shadow-glow btn-glow transition-all"
          >
            <i className="ti ti-plus" /> Cadastrar primeiro cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-[18px]">
          {clientes.map((c) => (
            <ClienteCard
              key={c.id}
              cliente={c}
              onGenerateBat={() => abrirBat(c)}
              onShowExecucoes={() => {}}
            />
          ))}
          <button
            onClick={() => setNewOpen(true)}
            className="
              flex flex-col items-center justify-center gap-2.5 min-h-[240px]
              border-[1.5px] border-dashed border-[rgba(250,250,250,0.18)] rounded-lg
              text-muted cursor-pointer transition-all
              hover:border-glass-border-strong hover:text-white-1 hover:bg-[rgba(115,243,164,0.03)]
            "
          >
            <i className="ti ti-plus text-primary text-[28px]" />
            <p className="text-[13px] font-medium">Novo cliente</p>
            <p className="text-[11px] text-muted-light">cadastrar + gerar .bat</p>
          </button>
        </div>
      )}

      {newOpen && (
        <NovoClienteModal
          onClose={() => setNewOpen(false)}
          onCreate={handleCriar}
          loading={loading}
        />
      )}

      {batData && (
        <BatModal
          loja={batData.loja}
          cliente={batData.cliente}
          batContent={batData.content}
          onClose={() => setBatData(null)}
        />
      )}
    </>
  )
}
