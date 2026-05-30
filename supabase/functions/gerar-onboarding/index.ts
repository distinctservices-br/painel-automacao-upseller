import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
}

const ONBOARDING_BASE = 'https://dashboard.distinctservices.com.br/onboarding'
const BUCKET = 'extensoes'
const MS_24H = 24 * 60 * 60 * 1000

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS })
  if (req.method !== 'POST') return json({ sucesso: false, erro: 'method_not_allowed' }, 405)

  try {
    const { cliente_id, cliente_nome, zip_base64 } = await req.json()
    if (!cliente_id || !cliente_nome || !zip_base64) {
      return json({ sucesso: false, erro: 'campos_obrigatorios_ausentes' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // ── 1. Invalida TODOS os registros anteriores do cliente ──────────────────
    // Busca todos (ativos ou não, expirados ou não) para limpar arquivos órfãos
    const { data: anteriores } = await supabase
      .from('onboarding_links')
      .select('id, drive_file_id')
      .eq('cliente_id', cliente_id)
      .eq('ativo', true)

    if (anteriores && anteriores.length > 0) {
      // Remove arquivos do Storage (ignora erros individuais)
      const paths = anteriores
        .map((r: { drive_file_id: string }) => r.drive_file_id)
        .filter(Boolean)
      if (paths.length > 0) {
        await supabase.storage.from(BUCKET).remove(paths)
      }

      // Marca todos como inativos
      const ids = anteriores.map((r: { id: string }) => r.id)
      await supabase
        .from('onboarding_links')
        .update({ ativo: false })
        .in('id', ids)

      console.log(`[gerar-onboarding] invalidados ${ids.length} link(s) anterior(es) para cliente=${cliente_id.substring(0, 8)}`)
    }

    // ── 2. Gera nova senha e faz upload do zip ────────────────────────────────
    const senha = Math.floor(100000 + Math.random() * 900000).toString()

    const nomeFormatado = cliente_nome
      .split(/\s+/)
      .map((p: string) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join('')
    const storagePath = `${cliente_id}/Distinct-Services-${nomeFormatado}.zip`

    const b64 = zip_base64.replace(/^data:[^;]+;base64,/, '')
    const zipBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, zipBytes, { contentType: 'application/zip', upsert: true })

    if (uploadErr) throw new Error(`Storage upload error: ${uploadErr.message}`)

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
    const downloadUrl = urlData.publicUrl

    // ── 3. Insere novo registro ───────────────────────────────────────────────
    const agora    = new Date()
    const expiraEm = new Date(agora.getTime() + MS_24H)

    const { error: insertErr } = await supabase.from('onboarding_links').insert({
      cliente_id,
      senha,
      drive_file_id: storagePath,
      drive_link:    downloadUrl,
      criado_em:     agora.toISOString(),
      expira_em:     expiraEm.toISOString(),
      ativo:         true,
      tentativas:    0,
      bloqueado_ate: null,
    })

    if (insertErr) throw new Error(`DB insert error: ${insertErr.message}`)

    const clienteKey = cliente_id.substring(0, 8)
    console.log(`[gerar-onboarding] OK cliente=${clienteKey} expira=${expiraEm.toISOString()}`)

    return json({
      sucesso:        true,
      senha,
      onboarding_url: `${ONBOARDING_BASE}/${clienteKey}`,
      expira_em:      expiraEm.toISOString(),
    })

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[gerar-onboarding] erro:', msg)
    return json({ sucesso: false, erro: msg }, 500)
  }
})
