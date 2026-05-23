import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useClientes } from '@/hooks/useClientes'

// ── Primitivos visuais ──────────────────────────────────────────────────────

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
  valido:    { label: 'válido',           cls: 'bg-[rgba(115,243,164,0.10)] border-[rgba(115,243,164,0.30)] text-primary' },
  expirando: { label: 'cookie expirando', cls: 'bg-[rgba(243,193,115,0.10)] border-[rgba(243,193,115,0.35)] text-warn'   },
  expirado:  { label: 'expirado',         cls: 'bg-[rgba(255,95,87,0.10)]   border-[rgba(255,95,87,0.30)]   text-error-text' },
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.expirado
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full border text-[11px] font-medium whitespace-nowrap ${s.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {s.label}
    </span>
  )
}

// ── Loja fields reutilizável ───────────────────────────────────────────────

const LOJA_VAZIA = { nomeLoja: '', shopId: '', ordem: '1', emailUpseller: '', senhaUpseller: '', printerId: '' }

function LojaFields({ loja, onChange, onRemove, idx, showRemove }) {
  const up = (k) => (e) => onChange(idx, { ...loja, [k]: e.target.value })
  return (
    <div className="flex flex-col gap-3 p-4 rounded-[10px] bg-[rgba(250,250,250,0.03)] border border-divider">
      <div className="flex justify-between items-center">
        <p className="text-[11px] uppercase tracking-[0.10em] text-primary font-medium">Loja {idx + 1}</p>
        {showRemove && (
          <button type="button" onClick={() => onRemove(idx)} className="text-muted hover:text-error-text transition-colors">
            <i className="ti ti-trash text-[15px]" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome da loja">
          <input className={inputCls} placeholder="ex. SS Personalizados" value={loja.nomeLoja} onChange={up('nomeLoja')} />
        </Field>
        <Field label="Shop ID">
          <input className={inputCls} placeholder="321627" value={loja.shopId} onChange={up('shopId')} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email Upseller">
          <input className={inputCls} type="email" placeholder="login@upseller" value={loja.emailUpseller} onChange={up('emailUpseller')} />
        </Field>
        <Field label="Senha Upseller">
          <input className={inputCls} type="password" placeholder="••••••••" value={loja.senhaUpseller} onChange={up('senhaUpseller')} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="ID da impressora" help="printer_id registrado no Supabase.">
          <input className={inputCls} placeholder="ex. printer_abc123" value={loja.printerId} onChange={up('printerId')} />
        </Field>
        <Field label="Ordem de execução">
          <input className={inputCls} type="number" min="1" value={loja.ordem} onChange={up('ordem')} />
        </Field>
      </div>
    </div>
  )
}

// ── Modal Overlay wrapper ─────────────────────────────────────────────────

function ModalWrapper({ title, sub, onClose, size = '', footer, children }) {
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
      <div className={`bg-black-2 border border-glass-border rounded-lg shadow-elev w-full max-h-[90vh] overflow-auto animate-slide-up ${size === 'lg' ? 'max-w-[720px]' : 'max-w-[560px]'}`}>
        <div className="flex justify-between items-start gap-3 px-6 py-5 border-b border-divider">
          <div>
            <h2 className="font-display font-bold text-[18px] tracking-tight">{title}</h2>
            {sub && <p className="text-muted text-[12px] mt-1">{sub}</p>}
          </div>
          <button onClick={onClose} className="text-muted hover:text-white-1 hover:bg-muted-surface rounded-[6px] p-1 transition-colors">
            <i className="ti ti-x text-[18px]" />
          </button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-6 py-4 border-t border-divider">{footer}</div>}
      </div>
    </div>
  )
}

// ── Modal Novo Cliente (múltiplas lojas) ──────────────────────────────────

function NovoClienteModal({ onClose, onCreate, loading }) {
  const [nome,   setNome]  = useState('')
  const [email,  setEmail] = useState('')
  const [lojas,  setLojas] = useState([{ ...LOJA_VAZIA }])

  const updateLoja = (idx, val) => setLojas(prev => prev.map((l, i) => i === idx ? val : l))
  const addLoja    = () => setLojas(prev => [...prev, { ...LOJA_VAZIA, ordem: String(prev.length + 1) }])
  const removeLoja = (idx) => setLojas(prev => prev.filter((_, i) => i !== idx))

  const canSubmit = nome && email && lojas.every(l => l.nomeLoja && l.shopId && l.emailUpseller && l.senhaUpseller)

  return (
    <ModalWrapper
      title="Novo cliente"
      sub="Cadastre o cliente e adicione quantas lojas precisar. O .bat será gerado para cada loja."
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-full text-muted text-[13px] hover:text-white-1 hover:bg-muted-surface transition-all">
            Cancelar
          </button>
          <button
            onClick={() => canSubmit && onCreate({ nome, email, lojas })}
            disabled={!canSubmit || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-black-1 text-[13px] font-semibold hover:shadow-glow btn-glow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? <i className="ti ti-loader-2 animate-spin text-[14px]" /> : <i className="ti ti-file-code text-[14px]" />}
            Criar e gerar .bat(s)
          </button>
        </>
      }
    >
      <Field label="Nome do cliente">
        <input className={inputCls} placeholder="ex. Rafael Teste" value={nome} onChange={e => setNome(e.target.value)} />
      </Field>
      <Field label="Email de contato">
        <input className={inputCls} type="email" placeholder="rafael@empresa.com.br" value={email} onChange={e => setEmail(e.target.value)} />
      </Field>

      <hr className="border-divider" />

      {lojas.map((l, idx) => (
        <LojaFields
          key={idx} idx={idx} loja={l}
          onChange={updateLoja}
          onRemove={removeLoja}
          showRemove={lojas.length > 1}
        />
      ))}

      <button
        type="button"
        onClick={addLoja}
        className="flex items-center gap-2 self-start px-3 py-1.5 rounded-full border border-dashed border-[rgba(115,243,164,0.30)] text-primary text-[12px] hover:bg-[rgba(115,243,164,0.06)] transition-all"
      >
        <i className="ti ti-plus text-[14px]" /> Adicionar outra loja
      </button>
    </ModalWrapper>
  )
}

// ── Modal .bat ─────────────────────────────────────────────────────────────

function BatModal({ lojas, cliente, onClose }) {
  const { gerarBat } = useClientes()
  const [sel, setSel] = useState(0)
  const loja = lojas[sel]
  const batContent = gerarBat(loja)
  const filename = `configurar_${(loja.nome_loja ?? '').toLowerCase().replace(/\s+/g, '_')}.bat`

  const download = () => {
    const blob = new Blob([batContent], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    toast.success(`.bat baixado!`)
  }

  const copy = () => { navigator.clipboard?.writeText(batContent); toast.success('Copiado!') }

  const colorize = (line, i) => {
    let cls = 'text-[rgba(250,250,250,0.75)]'
    if (line.startsWith('::') || line.startsWith('rem') || line.startsWith('REM')) cls = 'text-[rgba(250,250,250,0.40)]'
    else if (line.startsWith('echo')) cls = 'text-primary'
    else if (line.startsWith('set ') || line.startsWith('chcp')) cls = 'text-warn'
    else if (line.startsWith('call') || line.startsWith('node') || line.startsWith('npm')) cls = 'text-[#79BD89]'
    else if (line.startsWith('@echo') || line.startsWith('pause') || line.startsWith('cd')) cls = 'text-[rgba(250,250,250,0.45)]'
    return <span key={i} className={cls}>{line + '\n'}</span>
  }

  return (
    <ModalWrapper
      title={`.bat gerado — ${cliente.nome}`}
      sub="Salve na pasta C:\\n8n-upseller no Windows do cliente. O script abrirá um browser para login e salvará os cookies automaticamente."
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button onClick={copy} className="flex items-center gap-2 px-3 py-2 rounded-full text-muted text-[13px] hover:text-white-1 hover:bg-muted-surface transition-all">
            <i className="ti ti-copy text-[14px]" /> Copiar
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-full border border-[rgba(250,250,250,0.15)] text-[13px] hover:border-[rgba(250,250,250,0.35)] hover:bg-muted-surface transition-all">
            Fechar
          </button>
          <button onClick={download} className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-black-1 text-[13px] font-semibold hover:shadow-glow btn-glow transition-all">
            <i className="ti ti-download text-[14px]" /> Baixar .bat
          </button>
        </>
      }
    >
      {/* Seletor de loja se houver múltiplas */}
      {lojas.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {lojas.map((l, i) => (
            <button
              key={l.id ?? i}
              onClick={() => setSel(i)}
              className={`px-3 py-1.5 rounded-full text-[12px] border transition-all ${sel === i ? 'bg-primary text-black-1 border-primary font-semibold' : 'border-divider text-muted hover:border-glass-border hover:text-white-1'}`}
            >
              {l.nome_loja}
            </button>
          ))}
        </div>
      )}

      {/* Terminal preview */}
      <div className="bg-[#080808] border border-divider rounded-[10px] overflow-hidden font-mono text-[12px] leading-[1.65]">
        <div className="flex items-center gap-1.5 px-3 py-2 bg-[rgba(250,250,250,0.02)] border-b border-divider">
          <span className="w-[11px] h-[11px] rounded-full bg-[#FF5F57]" />
          <span className="w-[11px] h-[11px] rounded-full bg-[#FEBC2E]" />
          <span className="w-[11px] h-[11px] rounded-full bg-[#28C840]" />
          <span className="ml-2.5 text-[11px] text-muted">{filename}</span>
        </div>
        <pre className="px-4 py-3.5 overflow-auto max-h-[320px] whitespace-pre m-0">
          {batContent.split('\n').map(colorize)}
        </pre>
      </div>
    </ModalWrapper>
  )
}

// ── Modal Editar Cliente ───────────────────────────────────────────────────

function EditarClienteModal({ cliente, onClose, onSave, loading }) {
  const [nome,  setNome]  = useState(cliente.nome)
  const [email, setEmail] = useState(cliente.email_contato ?? '')

  return (
    <ModalWrapper
      title="Editar cliente"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-full text-muted text-[13px] hover:text-white-1 hover:bg-muted-surface transition-all">Cancelar</button>
          <button
            onClick={() => onSave(cliente.id, { nome, email })}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-black-1 text-[13px] font-semibold hover:shadow-glow btn-glow transition-all disabled:opacity-40"
          >
            {loading ? <i className="ti ti-loader-2 animate-spin text-[14px]" /> : <i className="ti ti-device-floppy text-[14px]" />}
            Salvar
          </button>
        </>
      }
    >
      <Field label="Nome do cliente">
        <input className={inputCls} value={nome} onChange={e => setNome(e.target.value)} />
      </Field>
      <Field label="Email de contato">
        <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} />
      </Field>
    </ModalWrapper>
  )
}

// ── Modal Editar Loja ──────────────────────────────────────────────────────

function EditarLojaModal({ loja, onClose, onSave, loading }) {
  const [form, setForm] = useState({
    nomeLoja:      loja.nome_loja ?? '',
    shopId:        loja.shop_id ?? '',
    emailUpseller: loja.email_upseller ?? '',
    senhaUpseller: '',
    printerId:     loja.printer_id ?? '',
    ordem:         String(loja.ordem ?? 1),
    ativo:         loja.ativo ?? true,
  })
  const up = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <ModalWrapper
      title="Editar loja"
      sub="Deixe a senha em branco para mantê-la sem alteração."
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 rounded-full text-muted text-[13px] hover:text-white-1 hover:bg-muted-surface transition-all">Cancelar</button>
          <button
            onClick={() => onSave(loja.id, form)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-black-1 text-[13px] font-semibold hover:shadow-glow btn-glow transition-all disabled:opacity-40"
          >
            {loading ? <i className="ti ti-loader-2 animate-spin text-[14px]" /> : <i className="ti ti-device-floppy text-[14px]" />}
            Salvar
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome da loja">
          <input className={inputCls} value={form.nomeLoja} onChange={up('nomeLoja')} />
        </Field>
        <Field label="Shop ID">
          <input className={inputCls} value={form.shopId} onChange={up('shopId')} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email Upseller">
          <input className={inputCls} type="email" value={form.emailUpseller} onChange={up('emailUpseller')} />
        </Field>
        <Field label="Senha Upseller" help="Deixe vazio para não alterar.">
          <input className={inputCls} type="password" placeholder="••••••••" value={form.senhaUpseller} onChange={up('senhaUpseller')} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="ID da impressora">
          <input className={inputCls} placeholder="printer_abc123" value={form.printerId} onChange={up('printerId')} />
        </Field>
        <Field label="Ordem">
          <input className={inputCls} type="number" min="1" value={form.ordem} onChange={up('ordem')} />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <input
          id="ativo-toggle" type="checkbox" checked={form.ativo}
          onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
          className="w-4 h-4 accent-[#73F3A4] rounded"
        />
        <label htmlFor="ativo-toggle" className="text-[13px] text-white-1 cursor-pointer">Loja ativa</label>
      </div>
    </ModalWrapper>
  )
}

// ── Card de cliente ────────────────────────────────────────────────────────

function ClienteCard({ cliente, onGenerateBat, onEditCliente, onEditLoja }) {
  return (
    <div className="glass-card glass-card-hover flex flex-col gap-4 p-6">
      {/* Header cliente */}
      <div className="flex justify-between items-start gap-3">
        <div>
          <p className="font-display font-semibold text-[18px] tracking-tight">{cliente.nome}</p>
          <p className="font-mono text-[11px] text-muted-light mt-0.5">{cliente.id}</p>
          {cliente.email_contato && (
            <p className="text-[12px] text-muted mt-0.5">{cliente.email_contato}</p>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full border text-[11px] font-medium bg-[rgba(115,243,164,0.10)] border-[rgba(115,243,164,0.30)] text-primary before:content-[''] before:w-1.5 before:h-1.5 before:rounded-full before:bg-current">
            {cliente.lojas.length} {cliente.lojas.length === 1 ? 'loja' : 'lojas'}
          </span>
          <button
            onClick={() => onEditCliente(cliente)}
            className="w-7 h-7 flex items-center justify-center rounded-[6px] text-muted hover:text-white-1 hover:bg-muted-surface transition-colors"
            title="Editar cliente"
          >
            <i className="ti ti-pencil text-[14px]" />
          </button>
        </div>
      </div>

      {/* Lojas */}
      <div className="flex flex-col gap-2">
        {cliente.lojas.map(loja => (
          <div key={loja.id} className="flex justify-between items-center px-3 py-2.5 rounded-[10px] bg-[rgba(250,250,250,0.02)] border border-divider group">
            <div>
              <p className="text-[13px] font-medium">
                {loja.nome_loja}
                <span className="text-muted-light ml-1.5 text-[12px]">· shop {loja.shop_id}</span>
                {loja.printer_id && <span className="text-muted-light ml-1.5 text-[11px]">· 🖨 {loja.printer_id}</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={loja.cookieStatus} />
              <button
                onClick={() => onEditLoja(loja)}
                className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-[5px] text-muted hover:text-white-1 hover:bg-muted-surface transition-all"
                title="Editar loja"
              >
                <i className="ti ti-pencil text-[12px]" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-dashed border-divider">
        <button
          onClick={() => onGenerateBat(cliente)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-black-1 text-[12px] font-semibold hover:shadow-glow btn-glow transition-all"
        >
          <i className="ti ti-file-code text-[14px]" /> Gerar .bat
        </button>
      </div>
    </div>
  )
}

// ── Tela principal ─────────────────────────────────────────────────────────

export default function Clientes() {
  const { clientes, loading, fetchClientes, criarCliente, editarCliente, editarLoja, gerarBat } = useClientes()

  const [newOpen,  setNewOpen]  = useState(false)
  const [batData,  setBatData]  = useState(null)   // { lojas[], cliente }
  const [editCli,  setEditCli]  = useState(null)   // cliente a editar
  const [editLojaData, setEditLojaData] = useState(null) // loja a editar

  useEffect(() => { fetchClientes() }, [fetchClientes])

  const handleCriar = async (form) => {
    const result = await criarCliente(form)
    if (!result) return
    setNewOpen(false)
    // Monta lojas com id retornado pelo insert
    const lojasMapped = result.lojas.map(l => ({
      id: l.id, nome_loja: l.nome_loja, shop_id: l.shop_id,
    }))
    setBatData({ lojas: lojasMapped, cliente: { ...result.cliente, nome: form.nome } })
  }

  const handleEditCli = async (id, dados) => {
    const ok = await editarCliente(id, dados)
    if (ok) setEditCli(null)
  }

  const handleEditLoja = async (id, dados) => {
    const ok = await editarLoja(id, dados)
    if (ok) setEditLojaData(null)
  }

  const abrirBat = (cliente) => {
    if (!cliente.lojas.length) { toast.error('Cliente sem lojas.'); return }
    setBatData({ lojas: cliente.lojas, cliente })
  }

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Clientes"
        sub={loading ? 'Carregando…' : `${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} · ${clientes.reduce((s, c) => s + c.lojas.length, 0)} lojas`}
        actions={
          <>
            <button onClick={fetchClientes} disabled={loading} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[rgba(250,250,250,0.15)] text-[12px] hover:border-[rgba(250,250,250,0.35)] hover:bg-muted-surface transition-all disabled:opacity-50">
              <i className={`ti ti-refresh text-[14px] ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button onClick={() => setNewOpen(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-black-1 text-[12px] font-semibold hover:shadow-glow btn-glow transition-all">
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
        <div className="flex flex-col items-center py-20 text-muted gap-3">
          <i className="ti ti-users-group text-4xl text-muted-light" />
          <p>Nenhum cliente cadastrado ainda.</p>
          <button onClick={() => setNewOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-black-1 text-[13px] font-semibold mt-2 hover:shadow-glow btn-glow transition-all">
            <i className="ti ti-plus" /> Cadastrar primeiro cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-[18px]">
          {clientes.map(c => (
            <ClienteCard
              key={c.id} cliente={c}
              onGenerateBat={() => abrirBat(c)}
              onEditCliente={setEditCli}
              onEditLoja={setEditLojaData}
            />
          ))}
          <button
            onClick={() => setNewOpen(true)}
            className="flex flex-col items-center justify-center gap-2.5 min-h-[200px] border-[1.5px] border-dashed border-[rgba(250,250,250,0.18)] rounded-lg text-muted transition-all hover:border-glass-border-strong hover:text-white-1 hover:bg-[rgba(115,243,164,0.03)]"
          >
            <i className="ti ti-plus text-primary text-[28px]" />
            <p className="text-[13px] font-medium">Novo cliente</p>
            <p className="text-[11px] text-muted-light">cadastrar + gerar .bat</p>
          </button>
        </div>
      )}

      {newOpen    && <NovoClienteModal    onClose={() => setNewOpen(false)}    onCreate={handleCriar}   loading={loading} />}
      {batData    && <BatModal            lojas={batData.lojas}                cliente={batData.cliente} onClose={() => setBatData(null)} />}
      {editCli    && <EditarClienteModal  cliente={editCli}                    onClose={() => setEditCli(null)}      onSave={handleEditCli}  loading={loading} />}
      {editLojaData && <EditarLojaModal   loja={editLojaData}                  onClose={() => setEditLojaData(null)} onSave={handleEditLoja} loading={loading} />}
    </>
  )
}
