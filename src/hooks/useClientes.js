import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Calcula status do cookie baseado em cookie_renovado_em */
export function calcCookieStatus(renovadoEm) {
  if (!renovadoEm) return 'expirado'
  const dias = (Date.now() - new Date(renovadoEm).getTime()) / 86_400_000
  if (dias < 11)  return 'valido'
  if (dias <= 14) return 'expirando'
  return 'expirado'
}

/** Gera conteúdo do arquivo .bat para configurar uma loja */
export function gerarBat(lojaId, nomeLoja) {
  return `@echo off
cd /d C:\\n8n-upseller
echo Configurando loja: ${nomeLoja}
set LOJA_ID=${lojaId}
npm install playwright 2>nul
node configurar_loja.js
echo Configuracao concluida!
pause
`
}

/** Dispara download do .bat direto no browser */
export function downloadBat(lojaId, nomeLoja) {
  const conteudo  = gerarBat(lojaId, nomeLoja)
  const nomeArq   = `upseller_${nomeLoja.toLowerCase().replace(/\s+/g, '_')}.bat`
  const blob      = new Blob([conteudo], { type: 'application/octet-stream' })
  const url       = URL.createObjectURL(blob)
  const a         = document.createElement('a')
  a.href          = url
  a.download      = nomeArq
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ── Validações ───────────────────────────────────────────────────────────────

function validarCliente(form) {
  if (!form.nome?.trim())          return 'Nome do cliente é obrigatório.'
  if (!form.email?.trim())         return 'Email de contato é obrigatório.'
  const rx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!rx.test(form.email))        return 'Email de contato inválido.'
  if (!form.nomeLoja?.trim())      return 'Nome da loja é obrigatório.'
  if (!form.shopId?.trim())        return 'Shop ID é obrigatório.'
  if (!form.emailUpseller?.trim()) return 'Email Upseller é obrigatório.'
  if (!rx.test(form.emailUpseller)) return 'Email Upseller inválido.'
  if (!form.senhaUpseller?.trim()) return 'Senha Upseller é obrigatória.'
  return null
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useClientes() {
  const [clientes, setClientes] = useState([])
  const [loading,  setLoading]  = useState(false)

  // Busca todos os clientes ativos com suas lojas
  const fetchClientes = useCallback(async () => {
    setLoading(true)
    try {
      const { data: clientesData, error: errC } = await supabase
        .from('clientes')
        .select('*')
        .eq('ativo', true)
        .order('nome')

      if (errC) throw errC

      // Busca lojas de todos os clientes em paralelo
      const clientesComLojas = await Promise.all(
        clientesData.map(async (cliente) => {
          const { data: lojas, error: errL } = await supabase
            .from('lojas')
            .select('id, nome_loja, shop_id, email_upseller, cookie_renovado_em, ativo, ordem, workflow_rodando, printer_id')
            .eq('cliente_id', cliente.id)
            .order('ordem')

          if (errL) throw errL

          return {
            ...cliente,
            lojas: (lojas ?? []).map((l) => ({
              ...l,
              cookieStatus: calcCookieStatus(l.cookie_renovado_em),
            })),
          }
        })
      )

      setClientes(clientesComLojas)
    } catch (err) {
      console.error('fetchClientes:', err)
      toast.error('Erro ao carregar clientes: ' + (err.message ?? 'erro desconhecido'))
    } finally {
      setLoading(false)
    }
  }, [])

  // Cria cliente + loja inicial e retorna o loja_id para gerar o .bat
  const criarCliente = useCallback(async (form) => {
    const erro = validarCliente(form)
    if (erro) { toast.error(erro); return null }

    setLoading(true)
    try {
      // 1. Insere cliente
      const { data: novoCliente, error: errC } = await supabase
        .from('clientes')
        .insert({ nome: form.nome.trim(), email_contato: form.email.trim(), ativo: true })
        .select()
        .single()

      if (errC) throw errC

      // 2. Insere loja
      const { data: novaLoja, error: errL } = await supabase
        .from('lojas')
        .insert({
          cliente_id:      novoCliente.id,
          nome_loja:       form.nomeLoja.trim(),
          shop_id:         form.shopId.trim(),
          email_upseller:  form.emailUpseller.trim(),
          senha_upseller:  form.senhaUpseller,
          ativo:           true,
          ordem:           Number(form.ordem) || 1,
        })
        .select()
        .single()

      if (errL) throw errL

      toast.success('Cliente criado com sucesso!')
      await fetchClientes()
      return novaLoja
    } catch (err) {
      console.error('criarCliente:', err)
      toast.error('Erro ao criar cliente: ' + (err.message ?? 'erro desconhecido'))
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchClientes])

  return { clientes, loading, fetchClientes, criarCliente, downloadBat, gerarBat }
}
