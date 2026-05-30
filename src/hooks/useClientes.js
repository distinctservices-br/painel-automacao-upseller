import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

// ── Status de cookie ──────────────────────────────────────────────────────

export function calcCookieStatus(renovadoEm) {
  if (!renovadoEm) return 'expirado'
  const dias = (Date.now() - new Date(renovadoEm).getTime()) / 86_400_000
  if (dias < 11)  return 'valido'
  if (dias <= 14) return 'expirando'
  return 'expirado'
}

// ── Geração do configurar_cliente.js com CLIENTE_ID substituído ───────────
// Faz UM login no Upseller e PATCHa TODAS as lojas do cliente
// (filtro PATCH: lojas?cliente_id=eq.${CLIENTE_ID})

export function gerarConfigurarClienteJS(clienteId) {
  const supabaseUrl = 'https://wjsvkmewwrwpouijzbrb.supabase.co'
  const serviceKey  = localStorage.getItem('service_role_key') ?? 'COLOQUE_SUA_SERVICE_ROLE_KEY_AQUI'

  // Atenção: as barras duplas (\\) abaixo viram \ simples no arquivo gerado — correto para Node.js no Windows.
  return `const { chromium } = require('playwright');
const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// --- CONFIGURACAO -------------------------------------------------------
const CLIENTE_ID   = '${clienteId}';
const SUPABASE_URL = '${supabaseUrl}';
const SUPABASE_KEY = '${serviceKey}';
// ------------------------------------------------------------------------

const CLIENTE_DIR = path.join('C:\\\\n8n-upseller\\\\clientes', CLIENTE_ID);
const STATE_FILE  = path.join(CLIENTE_DIR, 'browser_state.json');
const COOKIE_FILE = path.join(CLIENTE_DIR, 'cookie.txt');

fs.mkdirSync(CLIENTE_DIR, { recursive: true });

async function salvarNoSupabase(cookie, browserState) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify({
      cookie: cookie,
      cookie_renovado_em: new Date().toISOString(),
      browser_state: browserState
    });
    const req = https.request({
      hostname: SUPABASE_URL.replace('https://', ''),
      path: '/rest/v1/lojas?cliente_id=eq.' + CLIENTE_ID,
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        'Prefer': 'return=representation'
      }
    }, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const arr = JSON.parse(body);
            const qt  = Array.isArray(arr) ? arr.length : 0;
            console.log('Lojas atualizadas:', qt);
          } catch (e) { /* ignore parse error */ }
          resolve();
        } else {
          reject(new Error('Supabase respondeu ' + res.statusCode + ': ' + body));
        }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

async function main() {
  console.log('');
  console.log('========================================');
  console.log('  CONFIGURACAO DO CLIENTE');
  console.log('  Uma janela do browser vai abrir.');
  console.log('  Faca o login no Upseller normalmente.');
  console.log('  O cookie sera salvo em TODAS as lojas');
  console.log('  deste cliente em uma unica execucao.');
  console.log('  Quando estiver logado, volte aqui');
  console.log('  e pressione ENTER para continuar.');
  console.log('========================================');
  console.log('');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://app.upseller.com/#/login', { waitUntil: 'domcontentloaded', timeout: 30000 });

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(resolve => {
    rl.question('Pressione ENTER apos estar logado no Upseller: ', () => {
      rl.close();
      resolve();
    });
  });

  const url = page.url();
  console.log('URL atual:', url);
  if (url.includes('login') && !url.includes('home')) {
    await browser.close();
    throw new Error('Nao parece estar logado. Tente novamente.');
  }

  const cookies = await context.cookies();
  console.log('Total cookies capturados:', cookies.length);

  const uCookies = cookies.filter(c =>
    c.domain.includes('upseller') || c.domain.includes('app.upseller')
  );

  const temUsU = uCookies.find(c => c.name === 'us_u');
  if (!temUsU) {
    await browser.close();
    throw new Error('Cookie us_u nao encontrado. Verifique se o login foi concluido.');
  }
  console.log('us_u encontrado!');

  const browserStateObj = await context.storageState();

  fs.writeFileSync(STATE_FILE, JSON.stringify(browserStateObj, null, 2), 'utf8');
  console.log('browser_state.json salvo em:', STATE_FILE);

  const cookieStr = uCookies.map(c => c.name + '=' + c.value).join('; ');
  fs.writeFileSync(COOKIE_FILE, cookieStr, 'utf8');
  console.log('cookie.txt salvo em:', COOKIE_FILE);

  await salvarNoSupabase(cookieStr, browserStateObj);
  console.log('Cookie e browser_state aplicados a todas as lojas do cliente!');

  await browser.close();

  console.log('');
  console.log('========================================');
  console.log('  CONCLUIDO!');
  console.log('  A renovacao automatica esta pronta.');
  console.log('========================================');
}

main().catch(err => {
  console.error('[ERRO FATAL]', err.message);
  process.exit(1);
});`
}

// ── Geração do .bat com configurar_cliente.js embutido em base64 ──────────

function toBase64Utf8(str) {
  const bytes = new TextEncoder().encode(str)
  let bin = ''
  bytes.forEach(b => { bin += String.fromCharCode(b) })
  return btoa(bin)
}

/**
 * Gera o .bat para o cliente inteiro.
 * @param {object} cliente — { id, nome, lojas? }
 */
export function gerarBat(cliente, tipo = 'configurar') {
  const jsContent = gerarConfigurarClienteJS(cliente.id)
  const b64        = toBase64Utf8(jsContent)
  const titulo     = tipo === 'renovar' ? 'RENOVACAO MANUAL DE COOKIE' : 'CONFIGURACAO DE CLIENTE'
  const nomeSafe   = cliente.nome ?? cliente.id

  return `@echo off
chcp 65001 >nul
echo.
echo ============================================
echo   ${titulo}
echo   Cliente: ${nomeSafe}
echo ============================================
echo.

cd /d C:\\n8n-upseller

:: Grava configurar_cliente.js com as configuracoes deste cliente
powershell -NoProfile -Command "[System.IO.File]::WriteAllText('C:\\n8n-upseller\\configurar_cliente.js', [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64}')), [System.Text.Encoding]::UTF8)"

if %errorlevel% neq 0 (
  echo ERRO: nao foi possivel criar configurar_cliente.js
  pause
  exit /b 1
)

echo Instalando dependencias...
call npm install playwright 2>nul

echo Baixando browser Chromium (pode demorar na primeira vez)...
call npx playwright install chromium 2>nul

echo.
echo Iniciando processo...
node configurar_cliente.js

echo.
pause`
}

// ── Geração do .zip da extensão Chrome por cliente ───────────────────────

const ARQUIVOS_TEXTO   = ['manifest.json', 'background.js', 'popup.html', 'popup.js', 'README.txt']
const ARQUIVOS_BINARIO = ['icon16.png', 'icon48.png', 'icon128.png']

/** Monta o zip e retorna como base64 (para enviar à Edge Function) */
export async function gerarZipBase64(cliente) {
  const token = localStorage.getItem('extension_token')?.trim()
  if (!token) throw new Error('Extension Token não configurado em Configuração.')

  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  for (const nome of ARQUIVOS_TEXTO) {
    const resp = await fetch(`/extensao/base/${nome}`)
    if (!resp.ok) throw new Error(`Arquivo não encontrado: ${nome}`)
    zip.file(nome, await resp.text())
  }
  for (const nome of ARQUIVOS_BINARIO) {
    const resp = await fetch(`/extensao/base/${nome}`)
    if (!resp.ok) throw new Error(`Arquivo não encontrado: ${nome}`)
    zip.file(nome, await resp.arrayBuffer())
  }

  const nomeSafe = cliente.nome?.replace(/'/g, "\\'") ?? ''
  const config = [
    '// Gerado automaticamente pelo painel — não editar manualmente.',
    'const CONFIG = {',
    `  CLIENTE_ID: '${cliente.id}',`,
    `  CLIENTE_NOME: '${nomeSafe}',`,
    `  EDGE_FUNCTION_URL: 'https://wjsvkmewwrwpouijzbrb.supabase.co/functions/v1/sincronizar-cookie',`,
    `  EXTENSION_TOKEN: '${token}'`,
    '};',
  ].join('\n')
  zip.file('config.js', config)

  return zip.generateAsync({ type: 'base64' })
}

/** Download direto do zip (uso local/debug) */
export async function gerarExtensao(cliente) {
  const token = localStorage.getItem('extension_token')?.trim()
  if (!token) {
    toast.error('Configure o Extension Token em Configuração antes de gerar a extensão.')
    return
  }

  const toastId = toast.loading('Gerando extensão…')
  try {
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()

    // Busca arquivos base da pasta public/extensao/base/
    for (const nome of ARQUIVOS_TEXTO) {
      const resp = await fetch(`/extensao/base/${nome}`)
      if (!resp.ok) throw new Error(`Arquivo não encontrado: ${nome}`)
      zip.file(nome, await resp.text())
    }
    for (const nome of ARQUIVOS_BINARIO) {
      const resp = await fetch(`/extensao/base/${nome}`)
      if (!resp.ok) throw new Error(`Arquivo não encontrado: ${nome}`)
      zip.file(nome, await resp.arrayBuffer())
    }

    // config.js personalizado para este cliente
    const nomeSafe = cliente.nome?.replace(/'/g, "\\'") ?? ''
    const config = [
      '// Gerado automaticamente pelo painel — não editar manualmente.',
      'const CONFIG = {',
      `  CLIENTE_ID: '${cliente.id}',`,
      `  CLIENTE_NOME: '${nomeSafe}',`,
      `  EDGE_FUNCTION_URL: 'https://wjsvkmewwrwpouijzbrb.supabase.co/functions/v1/sincronizar-cookie',`,
      `  EXTENSION_TOKEN: '${token}'`,
      '};',
    ].join('\n')
    zip.file('config.js', config)

    const blob = await zip.generateAsync({ type: 'blob' })

    // Nome do arquivo: Distinct-Services-NomeDoCliente.zip
    const nomeFormatado = (cliente.nome ?? 'Cliente')
      .split(/\s+/)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join('')
    const nomeArquivo = `Distinct-Services-${nomeFormatado}.zip`

    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = nomeArquivo
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)

    toast.success(`${nomeArquivo} baixado!`, { id: toastId })
  } catch (err) {
    console.error('gerarExtensao:', err)
    toast.error('Erro ao gerar extensão: ' + err.message, { id: toastId })
  }
}

export function downloadBat(cliente, tipo = 'configurar') {
  const conteudo = gerarBat(cliente, tipo)
  const prefix   = tipo === 'renovar' ? 'renovar' : 'configurar'
  const nome     = `${prefix}_${(cliente.nome ?? cliente.id).toLowerCase().replace(/\s+/g, '_')}.bat`
  const blob     = new Blob([conteudo], { type: 'application/octet-stream' })
  const url      = URL.createObjectURL(blob)
  const a        = document.createElement('a')
  a.href = url; a.download = nome
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

// ── Validações ────────────────────────────────────────────────────────────

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function validarLoja(l, idx = 0) {
  if (!l.nomeLoja?.trim())      return `Loja ${idx + 1}: nome é obrigatório.`
  // shop_id é opcional — preenchido automaticamente pela extensão Chrome
  if (!l.emailUpseller?.trim()) return `Loja ${idx + 1}: email Upseller é obrigatório.`
  if (!emailRx.test(l.emailUpseller)) return `Loja ${idx + 1}: email Upseller inválido.`
  if (!l.senhaUpseller?.trim()) return `Loja ${idx + 1}: senha Upseller é obrigatória.`
  return null
}

function validarCliente(form) {
  if (!form.nome?.trim())  return 'Nome do cliente é obrigatório.'
  if (!form.email?.trim()) return 'Email de contato é obrigatório.'
  if (!emailRx.test(form.email)) return 'Email de contato inválido.'
  for (let i = 0; i < (form.lojas ?? []).length; i++) {
    const e = validarLoja(form.lojas[i], i)
    if (e) return e
  }
  return null
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useClientes() {
  const [clientes, setClientes] = useState([])
  const [loading,  setLoading]  = useState(false)

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    try {
      const { data: clientesData, error: errC } = await supabase
        .from('clientes')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (errC) throw errC

      const clientesComLojas = await Promise.all(
        clientesData.map(async (c) => {
          const { data: lojas, error: errL } = await supabase
            .from('lojas')
            .select('id, nome_loja, shop_id, email_upseller, cookie_renovado_em, ativo, ordem, printer_id, workflow_rodando')
            .eq('cliente_id', c.id)
            .order('ordem')
          if (errL) throw errL
          return {
            ...c,
            lojas: (lojas ?? []).map(l => ({
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

  // Cria cliente + N lojas
  const criarCliente = useCallback(async (form) => {
    const erro = validarCliente(form)
    if (erro) { toast.error(erro); return null }

    setLoading(true)
    try {
      const { data: novoCliente, error: errC } = await supabase
        .from('clientes')
        .insert({ nome: form.nome.trim(), email_contato: form.email.trim(), ativo: true })
        .select()
        .single()
      if (errC) throw errC

      const lojasInseridas = []
      for (const [i, l] of (form.lojas ?? []).entries()) {
        const { data: novaLoja, error: errL } = await supabase
          .from('lojas')
          .insert({
            cliente_id:     novoCliente.id,
            nome_loja:      l.nomeLoja.trim(),
            shop_id:        l.shopId?.trim() || null,
            email_upseller: l.emailUpseller.trim(),
            senha_upseller: l.senhaUpseller,
            printer_id:     l.printerId?.trim() || null,
            ativo:          true,
            ordem:          Number(l.ordem) || i + 1,
          })
          .select()
          .single()
        if (errL) throw errL
        lojasInseridas.push(novaLoja)
      }

      toast.success('Cliente criado com sucesso!')
      await fetchClientes()
      return { cliente: novoCliente, lojas: lojasInseridas }
    } catch (err) {
      console.error('criarCliente:', err)
      toast.error('Erro ao criar cliente: ' + (err.message ?? 'erro desconhecido'))
      return null
    } finally {
      setLoading(false)
    }
  }, [fetchClientes])

  // Edita um cliente existente
  const editarCliente = useCallback(async (id, dados) => {
    if (!dados.nome?.trim()) { toast.error('Nome é obrigatório.'); return false }
    if (!emailRx.test(dados.email)) { toast.error('Email inválido.'); return false }
    try {
      const { error } = await supabase
        .from('clientes')
        .update({ nome: dados.nome.trim(), email_contato: dados.email.trim() })
        .eq('id', id)
      if (error) throw error
      toast.success('Cliente atualizado!')
      await fetchClientes()
      return true
    } catch (err) {
      toast.error('Erro ao atualizar cliente: ' + err.message)
      return false
    }
  }, [fetchClientes])

  // Edita uma loja existente
  const editarLoja = useCallback(async (id, dados) => {
    if (!dados.nomeLoja?.trim()) { toast.error('Nome da loja é obrigatório.'); return false }
    // shop_id é opcional
    if (!emailRx.test(dados.emailUpseller)) { toast.error('Email Upseller inválido.'); return false }

    const payload = {
      nome_loja:      dados.nomeLoja.trim(),
      shop_id:        dados.shopId?.trim() || null,
      email_upseller: dados.emailUpseller.trim(),
      ordem:          Number(dados.ordem) || 1,
      printer_id:     dados.printerId?.trim() || null,
      ativo:          dados.ativo ?? true,
    }
    // Só atualiza senha se foi preenchida
    if (dados.senhaUpseller?.trim()) {
      payload.senha_upseller = dados.senhaUpseller
    }

    try {
      const { error } = await supabase.from('lojas').update(payload).eq('id', id)
      if (error) throw error
      toast.success('Loja atualizada!')
      await fetchClientes()
      return true
    } catch (err) {
      toast.error('Erro ao atualizar loja: ' + err.message)
      return false
    }
  }, [fetchClientes])

  // Adiciona loja a um cliente existente
  const adicionarLoja = useCallback(async (clienteId, l) => {
    const erro = validarLoja(l)
    if (erro) { toast.error(erro); return null }
    try {
      const { data: novaLoja, error } = await supabase
        .from('lojas')
        .insert({
          cliente_id:     clienteId,
          nome_loja:      l.nomeLoja.trim(),
          shop_id:        l.shopId.trim(),
          email_upseller: l.emailUpseller.trim(),
          senha_upseller: l.senhaUpseller,
          printer_id:     l.printerId?.trim() || null,
          ativo:          true,
          ordem:          Number(l.ordem) || 1,
        })
        .select()
        .single()
      if (error) throw error
      toast.success('Loja adicionada!')
      await fetchClientes()
      return novaLoja
    } catch (err) {
      toast.error('Erro ao adicionar loja: ' + err.message)
      return null
    }
  }, [fetchClientes])

  return {
    clientes, loading,
    fetchClientes, criarCliente,
    editarCliente, editarLoja, adicionarLoja,
    gerarBat, downloadBat, gerarConfigurarClienteJS,
  }
}
