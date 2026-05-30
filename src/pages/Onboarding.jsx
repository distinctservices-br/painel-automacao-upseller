import { useState, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'

// Chamada direta via fetch — sem dependência de sessão autenticada
async function chamarValidarOnboarding(clienteKey, senha) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validar-onboarding`
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ clienteKey, senha }),
  })
  if (!resp.ok) throw new Error('Erro de conexão. Tente novamente.')
  return resp.json()
}

// ── Logo Distinct Services ────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex flex-col items-center gap-3 mb-10">
      <div className="w-12 h-12 rounded-[12px] border border-glass-border bg-black-2 flex items-center justify-center">
        <svg viewBox="0 0 720 720" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8">
          <path fill="#73F3A4" d="M440.7 237.2c-13.8.5-26.7 4-38.5 10.6-11.8 6.5-22.8 14.7-33 24.4-10.2 9.8-19.5 20-28 30.8-8.5 10.8-16.4 20.7-23.6 29.6-7.2 8.9-13.9 15.6-20 20.1-6.2 4.5-11.9 5.4-17.1 2.7-3.5-1.8-6-4.6-7.6-8.6-1.6-3.9-1.8-9.3-.6-15.9 1.2-6.7 4.4-15 9.5-24.8 5.6-10.8 12.5-21.2 20.9-31.2-12.1 1.3-24.8-.8-36.4-6.9-19.1-9.9-31.2-28.1-34.1-47.9-10.5 14-19.8 28.9-28 44.6-16.1 31.2-25 59.7-26.6 85.4-1.6 25.7 2.6 47.9 12.6 66.4 10 18.6 24.4 32.7 43.2 42.4 16.2 8.4 31.2 12.4 45.2 11.9 14-.5 26.9-4 38.7-10.5 11.8-6.5 22.8-14.7 33.1-24.6 10.3-9.9 19.7-20.1 28.3-30.7 8.6-10.6 16.6-20.3 23.9-29.2 7.3-8.8 14.2-15.5 20.5-19.9 6.3-4.4 12.2-5.2 17.7-2.4 3.5 1.8 5.8 4.7 6.9 8.5 1.1 3.9.8 9-.8 15.3-1.6 6.3-5 14.4-10.1 24.2-8.7 16.7-20.1 32.7-34.4 47.9-14.3 15.1-29.3 27.8-45.2 37.9l57.5 71.5c17.2-10.5 34.8-26.1 52.8-46.9 18.1-20.7 33.7-43.8 46.8-69.2 16.3-31.5 25.2-60.1 26.6-85.7 1.4-25.7-2.9-47.8-12.9-66.4-10-18.5-24.2-32.6-42.7-42.2-15.9-8.2-30.8-12.1-44.6-11.5z"/>
          <path fill="#73F3A4" d="M320.6 163.5c26.2 13.6 36.4 45.8 22.9 72-8.4 16.2-23.9 26.3-40.8 28.4-10.4 1.3-21.2-.4-31.2-5.6-19.5-10.1-30.2-30.5-28.8-51.1.5-7.1 2.4-14.2 5.9-20.9 13.6-26.2 45.8-36.5 72-22.8z"/>
        </svg>
      </div>
      <div className="text-center">
        <h1 className="font-display font-bold text-[22px] tracking-tight text-white-1">Distinct Services</h1>
        <p className="text-muted text-[13px] mt-0.5">Sistema de Automação Upseller</p>
      </div>
    </div>
  )
}

// ── PIN Input (6 dígitos com auto-advance) ────────────────────────────────────

function PinInput({ onComplete }) {
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const refs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()]

  useEffect(() => { refs[0].current?.focus() }, [])

  const handleChange = (idx, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[idx] = digit
    setDigits(next)

    if (digit && idx < 5) refs[idx + 1].current?.focus()

    const full = next.join('')
    if (full.length === 6) onComplete(full)
  }

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs[idx - 1].current?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = [...digits]
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setDigits(next)
    const focusIdx = Math.min(pasted.length, 5)
    refs[focusIdx].current?.focus()
    if (pasted.length === 6) onComplete(pasted)
  }

  return (
    <div className="flex gap-2 justify-center">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-11 h-14 text-center text-[22px] font-mono font-bold bg-surface border border-[rgba(250,250,250,0.08)] text-white-1 rounded-[10px] outline-none focus:border-[rgba(115,243,164,0.55)] focus:ring-2 focus:ring-[rgba(115,243,164,0.12)] transition-all"
        />
      ))}
    </div>
  )
}

// ── Passo visual ──────────────────────────────────────────────────────────────

const PASSOS = [
  {
    icon: 'ti-download',
    titulo: 'Baixe a extensão',
    texto: 'Clique no botão abaixo para baixar o arquivo da sua extensão.',
  },
  {
    icon: 'ti-puzzle',
    titulo: 'Abra as extensões do Chrome',
    texto: 'No Chrome, acesse o menu (⋮) → Extensões → Gerenciar extensões. Ou digite chrome://extensions na barra de endereço.',
  },
  {
    icon: 'ti-toggle-right',
    titulo: 'Ative o modo desenvolvedor',
    texto: 'No canto superior direito da página de extensões, ative a chave "Modo do desenvolvedor".',
  },
  {
    icon: 'ti-package-import',
    titulo: 'Instale a extensão',
    texto: 'Clique em "Carregar sem compactação" e selecione a pasta da extensão baixada. Ela aparecerá na barra do Chrome.',
  },
  {
    icon: 'ti-star',
    titulo: 'Pronto!',
    texto: 'Faça login normalmente no Upseller. A sincronização é automática e invisível — você não precisa fazer mais nada.',
  },
]

function Passo({ numero, icon, titulo, texto, last }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="flex-shrink-0 flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-[rgba(115,243,164,0.10)] border border-[rgba(115,243,164,0.25)] flex items-center justify-center">
          <i className={`ti ${icon} text-primary text-[18px]`} />
        </div>
        {!last && <div className="w-px flex-1 bg-divider mt-1.5" style={{ minHeight: 24 }} />}
      </div>
      <div className="pb-6 min-w-0">
        <p className="text-[15px] font-semibold text-white-1 mb-1">
          <span className="text-primary mr-1.5">{numero}.</span>{titulo}
        </p>
        <p className="text-[13px] text-muted leading-relaxed">{texto}</p>
      </div>
    </div>
  )
}

// ── Botão Google Drive ────────────────────────────────────────────────────────

function BotaoDownload({ href }) {
  return (
    <a
      href={href}
      download
      className="flex items-center justify-center gap-3 w-full max-w-xs mx-auto px-6 py-4 rounded-[12px] bg-primary text-black-1 font-bold text-[16px] hover:shadow-glow btn-glow transition-all select-none"
    >
      <i className="ti ti-shield-lock text-[20px]" />
      Baixar extensão
    </a>
  )
}

// ── Telas ─────────────────────────────────────────────────────────────────────

function TelaSenha({ clienteKey, onSuccess }) {
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)
  const [pinCompleto, setPinCompleto] = useState('')

  const validar = async (senha) => {
    setLoading(true)
    setErro(null)
    try {
      const data = await chamarValidarOnboarding(clienteKey, senha)
      if (!data.valido) {
        const motivos = {
          link_expirado:          'Este link expirou. Solicite um novo ao suporte.',
          senha_incorreta:        'Senha incorreta. Verifique e tente novamente.',
          tentativas_esgotadas:   'Muitas tentativas incorretas. Tente novamente em 30 minutos.',
          temporariamente_bloqueado: 'Acesso bloqueado temporariamente. Tente novamente em instantes.',
        }
        setErro(motivos[data.motivo] ?? 'Link não encontrado. Verifique o endereço ou solicite um novo.')
      } else {
        onSuccess({ driveLink: data.drive_link, clienteNome: data.cliente_nome })
      }
    } catch (e) {
      setErro(e.message || 'Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (pinCompleto.length === 6) validar(pinCompleto)
  }

  const handlePinComplete = (pin) => {
    setPinCompleto(pin)
    validar(pin)
  }

  return (
    <div className="w-full max-w-sm">
      <Logo />
      <div className="bg-black-2 border border-glass-border rounded-xl p-8 shadow-elev">
        <div className="text-center mb-8">
          <h2 className="font-display font-bold text-[22px] tracking-tight text-white-1 mb-2">
            Instalação da extensão<br />
            <span className="text-primary">Upseller Sync</span>
          </h2>
          <p className="text-muted text-[14px]">Digite a senha recebida para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <PinInput onComplete={handlePinComplete} />

          {erro && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[rgba(255,95,87,0.08)] border border-[rgba(255,95,87,0.25)] text-error-text text-[12px]">
              <i className="ti ti-alert-circle text-[14px] flex-shrink-0" />
              {erro}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || pinCompleto.length < 6}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-full bg-primary text-black-1 font-semibold text-[14px] hover:shadow-glow btn-glow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? <><i className="ti ti-loader-2 animate-spin text-[15px]" /> Verificando…</>
              : <><i className="ti ti-arrow-right text-[15px]" /> Acessar</>
            }
          </button>
        </form>
      </div>
    </div>
  )
}

function TelaDownload({ clienteNome, driveLink }) {
  return (
    <div className="w-full max-w-lg">
      <Logo />
      <div className="bg-black-2 border border-glass-border rounded-xl shadow-elev overflow-hidden">
        <div className="px-8 pt-8 pb-4 border-b border-divider text-center">
          <i className="ti ti-circle-check text-primary text-[36px] mb-3 block" />
          <h2 className="font-display font-bold text-[22px] tracking-tight text-white-1 mb-1">
            Olá, {clienteNome}!
          </h2>
          <p className="text-muted text-[14px]">Sua extensão está pronta. Siga os passos abaixo para ativar o Upseller Sync.</p>
        </div>

        <div className="px-8 py-6">
          {PASSOS.map((p, i) => (
            <Passo key={i} numero={i + 1} last={i === PASSOS.length - 1} {...p} />
          ))}
        </div>

        <div className="px-8 pb-8 flex flex-col items-center gap-4">
          <BotaoDownload href={driveLink} />
          <p className="text-[12px] text-muted text-center">
            <i className="ti ti-clock text-[13px] mr-1" />
            Este link expira em 24 horas após a geração.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Página pública ─────────────────────────────────────────────────────────────

export default function Onboarding() {
  const { clienteKey } = useParams()
  const [resultado, setResultado] = useState(null) // { driveLink, clienteNome }

  return (
    <div className="min-h-screen bg-black-1 flex flex-col items-center justify-start sm:justify-center p-6 py-12 relative">
      {/* Glow de fundo */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[rgba(115,243,164,0.04)] blur-[100px]" />
      </div>

      <div className="relative w-full flex flex-col items-center">
        {!resultado
          ? <TelaSenha clienteKey={clienteKey} onSuccess={setResultado} />
          : <TelaDownload clienteNome={resultado.clienteNome} driveLink={resultado.driveLink} />
        }
      </div>
    </div>
  )
}
