import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useClientes } from '@/hooks/useClientes'

// ── Primitivos ──────────────────────────────────────────────────────────────

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

const COOKIE_MAP = {
  valido:    { label: 'válido',    cls: 'text-primary' },
  expirando: { label: 'expirando', cls: 'text-warn' },
  expirado:  { label: 'expirado',  cls: 'text-error-text' },
}

function CookieDot({ status }) {
  const s = COOKIE_MAP[status] ?? COOKIE_MAP.expirado
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${s.cls}`}>
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
    <div className="flex flex-col gap-3 p-4 rounded-[10px] bg-[rgba(250,250,250,0.02)] border border-divider">
      <div className="flex justify-between items-center">
        <p className="text-[11px] uppercase tracking-[0.10em] text-primary font-medium">Loja {idx + 1}</p>
        {showRemove && (
          <button type="button" onClick={() => onRemove(idx)} className="text-muted hover:text-error-text transition-colors">
            <i className="ti ti-trash text-[14px]" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nome da loja">
          <input className={inputCls} placeholder="Nome da loja" value={loja.nomeLoja} onChange={up('nomeLoja')} />
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
        <Field label="ID da impressora">
          <input className={inputCls} placeholder="printer_abc123" value={loja.printerId} onChange={up('printerId')} />
        </Field>
        <Field label="Ordem">
          <input className={inputCls} type="number" min="1" value={loja.ordem} onChange={up('ordem')} />
        </Field>
      </div>
    </div>
  )
}

// ── Modal base ─────────────────────────────────────────────────────────────

function ModalWrapper({ title, sub, onClose, size = '', footer, children }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-[rgba(15,15,15,0.70)] backdrop-blur-md z-50 grid place-items-end sm:place-items-center p-0 sm:p-6 animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`bg-black-2 border-t sm:border border-glass-border rounded-t-xl sm:rounded-lg shadow-elev w-full max-h-[92vh] overflow-auto animate-slide-up ${size === 'lg' ? 'sm:max-w-[680px]' : 'sm:max-w-[520px]'}`}>
        <div className="flex justify-between items-start gap-3 px-6 py-5 border-b border-divider">
          <div>
            <h2 className="font-display font-bold text-[17px] tracking-tight">{title}</h2>
            {sub && <p className="text-muted text-[12px] mt-0.5">{sub}</p>}
          </div>
          <button onClick={onClose} className="text-muted hover:text-white-1 rounded-[6px] p-1 transition-colors">
            <i className="ti ti-x text-[17px]" />
          </button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 px-6 py-4 border-t border-divider">{footer}</div>}
      </div>
    </div>
  )
}

// ── Modal Novo Cliente ─────────────────────────────────────────────────────

function NovoClienteModal({ onClose, onCreate, loading }) {
  const [nome,  setNome]  = useState('')
  const [email, setEmail] = useState('')
  const [lojas, setLojas] = useState([{ ...LOJA_VAZIA }])

  const updateLoja = (idx, val) => setLojas(prev => prev.map((l, i) => i === idx ? val : l))
  const addLoja    = () => setLojas(prev => [...prev, { ...LOJA_VAZIA, ordem: String(prev.length + 1) }])
  const removeLoja = (idx) => setLojas(prev => prev.filter((_, i) => i !== idx))

  const canSubmit = nome && email && lojas.every(l => l.nomeLoja && l.shopId && l.emailUpseller && l.senhaUpseller)

  return (
    <ModalWrapper
      title="Novo cliente"
      sub="Adicione quantas lojas precisar. O .bat será gerado para cada uma."
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
            {loading
              ? <i className="ti ti-loader-2 animate-spin text-[14px]" />
              : <i className="ti ti-check text-[14px]" />
            }
            Criar cliente
          </button>
        </>
      }
    >
      <Field label="Nome">
        <input className={inputCls} placeholder="Nome do cliente" value={nome} onChange={e => setNome(e.target.value)} />
      </Field>
      <Field label="Email de contato">
        <input className={inputCls} type="email" placeholder="email@empresa.com.br" value={email} onChange={e => setEmail(e.target.value)} />
      </Field>

      <div className="border-t border-divider" />

      {lojas.map((l, idx) => (
        <LojaFields key={idx} idx={idx} loja={l} onChange={updateLoja} onRemove={removeLoja} showRemove={lojas.length > 1} />
      ))}

      <button
        type="button"
        onClick={addLoja}
        className="flex items-center gap-2 self-start text-primary text-[12px] hover:text-white-1 transition-colors"
      >
        <i className="ti ti-plus text-[13px]" /> Adicionar outra loja
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
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
    toast.success('.bat baixado!')
  }

  const copy = () => { navigator.clipboard?.writeText(batContent); toast.success('Copiado!') }

  const colorize = (line, i) => {
    let cls = 'text-[rgba(250,250,250,0.70)]'
    if (line.startsWith('::') || line.startsWith('rem')) cls = 'text-[rgba(250,250,250,0.35)]'
    else if (line.startsWith('echo'))                    cls = 'text-primary'
    else if (line.startsWith('call') || line.startsWith('node') || line.startsWith('npm')) cls = 'text-secondary'
    else if (line.startsWith('@echo') || line.startsWith('pause') || line.startsWith('cd')) cls = 'text-muted-light'
    return <span key={i} className={cls}>{line + '\n'}</span>
  }

  return (
    <ModalWrapper
      title={`Configurar loja — ${cliente.nome}`}
      sub="Execute o .bat como administrador em C:\\n8n-upseller no Windows do cliente."
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button onClick={copy} className="flex items-center gap-2 px-3 py-2 rounded-full text-muted text-[12px] hover:text-white-1 hover:bg-muted-surface transition-all">
            <i className="ti ti-copy text-[13px]" /> Copiar
          </button>
          <button onClick={onClose} className="px-4 py-2 rounded-full border border-divider text-[12px] hover:border-[rgba(250,250,250,0.30)] hover:bg-muted-surface transition-all">
            Fechar
          </button>
          <button onClick={download} className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-black-1 text-[12px] font-semibold hover:shadow-glow btn-glow transition-all">
            <i className="ti ti-download text-[13px]" /> Baixar .bat
          </button>
        </>
      }
    >
      {lojas.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {lojas.map((l, i) => (
            <button
              key={l.id ?? i}
              onClick={() => setSel(i)}
              className={`px-3 py-1 rounded-full text-[12px] border transition-all ${sel === i ? 'bg-primary text-black-1 border-primary font-semibold' : 'border-divider text-muted hover:border-glass-border hover:text-white-1'}`}
            >
              {l.nome_loja}
            </button>
          ))}
        </div>
      )}

      <div className="bg-[#080808] border border-divider rounded-[10px] overflow-hidden font-mono text-[12px] leading-[1.65]">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-divider">
          <span className="w-[10px] h-[10px] rounded-full bg-[#FF5F57]" />
          <span className="w-[10px] h-[10px] rounded-full bg-[#FEBC2E]" />
          <span className="w-[10px] h-[10px] rounded-full bg-[#28C840]" />
          <span className="ml-2 text-[11px] text-muted">{filename}</span>
        </div>
        <pre className="px-4 py-3.5 overflow-auto max-h-[300px] whitespace-pre m-0">
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
      <Field label="Nome">
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
    nomeLoja:      loja.nome_loja     ?? '',
    shopId:        loja.shop_id       ?? '',
    emailUpseller: loja.email_upseller ?? '',
    senhaUpseller: '',
    printerId:     loja.printer_id    ?? '',
    ordem:         String(loja.ordem  ?? 1),
    ativo:         loja.ativo         ?? true,
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
        <Field label="Senha Upseller" help="Vazio = sem alteração.">
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
      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox" checked={form.ativo}
          onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
          className="w-4 h-4 accent-[#73F3A4] rounded"
        />
        <span className="text-[13px] text-white-1">Loja ativa</span>
      </label>
    </ModalWrapper>
  )
}

// ── Card de cliente ────────────────────────────────────────────────────────

function ClienteCard({ cliente, onGenerateBat, onEditCliente, onEditLoja }) {
  return (
    <div className="bg-black-2 border border-divider rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-divider">
        <div className="min-w-0">
          <p className="font-display font-semibold text-[14px] tracking-tight truncate">{cliente.nome}</p>
          {cliente.email_contato && (
            <p className="text-[11px] text-muted mt-0.5 truncate">{cliente.email_contato}</p>
          )}
        </div>
        <div className="flex items-center gap-1 ml-3 flex-shrink-0">
          <span className="text-[11px] text-muted font-medium px-2 py-0.5 rounded-full bg-muted-surface border border-divider">
            {cliente.lojas.length} {cliente.lojas.length === 1 ? 'loja' : 'lojas'}
          </span>
          <button
            onClick={() => onEditCliente(cliente)}
            className="w-7 h-7 flex items-center justify-center rounded-[6px] text-muted hover:text-white-1 hover:bg-muted-surface transition-colors"
            title="Editar cliente"
          >
            <i className="ti ti-pencil text-[13px]" />
          </button>
        </div>
      </div>

      {/* Lojas */}
      <div className="divide-y divide-divider">
        {cliente.lojas.map(loja => (
          <div key={loja.id} className="flex items-center justify-between px-4 py-2.5 group hover:bg-muted-surface transition-colors">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-white-1 truncate">{loja.nome_loja}</p>
              <p className="text-[11px] text-muted font-mono mt-0.5">
                {loja.shop_id}
                {loja.printer_id && <span className="ml-2 text-muted-light">{loja.printer_id}</span>}
              </p>
            </div>
            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
              <CookieDot status={loja.cookieStatus} />
              <button
                onClick={() => onEditLoja(loja)}
                className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-[5px] text-muted hover:text-white-1 hover:bg-[rgba(250,250,250,0.08)] transition-all"
                title="Editar loja"
              >
                <i className="ti ti-pencil text-[12px]" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-divider">
        <button
          onClick={() => onGenerateBat(cliente)}
          className="flex items-center gap-1.5 text-[12px] font-medium text-primary hover:text-white-1 transition-colors"
        >
          <i className="ti ti-file-code text-[13px]" /> Gerar .bat
        </button>
      </div>
    </div>
  )
}

// ── Tela principal ─────────────────────────────────────────────────────────

export default function Clientes() {
  const { clientes, loading, fetchClientes, criarCliente, editarCliente, editarLoja, gerarBat } = useClientes()

  const [newOpen,      setNewOpen]      = useState(false)
  const [batData,      setBatData]      = useState(null)
  const [editCli,      setEditCli]      = useState(null)
  const [editLojaData, setEditLojaData] = useState(null)

  useEffect(() => { fetchClientes() }, [fetchClientes])

  const handleCriar = async (form) => {
    const result = await criarCliente(form)
    if (!result) return
    setNewOpen(false)
    const lojasMapped = result.lojas.map(l => ({ id: l.id, nome_loja: l.nome_loja, shop_id: l.shop_id }))
    setBatData({ lojas: lojasMapped, cliente: { ...result.cliente, nome: form.nome } })
  }

  const handleEditCli  = async (id, dados) => { const ok = await editarCliente(id, dados); if (ok) setEditCli(null) }
  const handleEditLoja = async (id, dados) => { const ok = await editarLoja(id, dados);    if (ok) setEditLojaData(null) }

  const abrirBat = (cliente) => {
    if (!cliente.lojas.length) { toast.error('Cliente sem lojas.'); return }
    setBatData({ lojas: cliente.lojas, cliente })
  }

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Clientes"
        sub={loading ? 'Carregando...' : `${clientes.length} cliente${clientes.length !== 1 ? 's' : ''} · ${clientes.reduce((s, c) => s + c.lojas.length, 0)} lojas`}
        actions={
          <>
            <button
              onClick={fetchClientes}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-divider text-[12px] hover:border-[rgba(250,250,250,0.30)] hover:bg-muted-surface transition-all disabled:opacity-50"
            >
              <i className={`ti ti-refresh text-[13px] ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={() => setNewOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary text-black-1 text-[12px] font-semibold hover:shadow-glow btn-glow transition-all"
            >
              <i className="ti ti-plus text-[13px]" /> Novo cliente
            </button>
          </>
        }
      />

      {loading && clientes.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-muted text-[13px]">
          <i className="ti ti-loader-2 animate-spin mr-2" /> Carregando...
        </div>
      ) : clientes.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-muted gap-3">
          <i className="ti ti-users text-3xl text-muted-light" />
          <p className="text-[13px]">Nenhum cliente cadastrado.</p>
          <button
            onClick={() => setNewOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-black-1 text-[13px] font-semibold mt-1 hover:shadow-glow btn-glow transition-all"
          >
            <i className="ti ti-plus" /> Cadastrar primeiro cliente
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
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
            className="flex flex-col items-center justify-center gap-2 min-h-[140px] border border-dashed border-divider rounded-lg text-muted transition-all hover:border-glass-border hover:text-white-1 hover:bg-muted-surface"
          >
            <i className="ti ti-plus text-[22px] text-primary" />
            <p className="text-[12px]">Novo cliente</p>
          </button>
        </div>
      )}

      {newOpen       && <NovoClienteModal   onClose={() => setNewOpen(false)}    onCreate={handleCriar}    loading={loading} />}
      {batData       && <BatModal           lojas={batData.lojas}                cliente={batData.cliente} onClose={() => setBatData(null)} />}
      {editCli       && <EditarClienteModal cliente={editCli}                    onClose={() => setEditCli(null)}      onSave={handleEditCli}  loading={loading} />}
      {editLojaData  && <EditarLojaModal    loja={editLojaData}                  onClose={() => setEditLojaData(null)} onSave={handleEditLoja} loading={loading} />}
    </>
  )
}
