import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info',
}

const BUCKET = 'extensoes'
const MAX_TENTATIVAS = 10
const BLOQUEIO_MS = 30 * 60 * 1000   // 30 minutos

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 200, headers: CORS })
  if (req.method !== 'POST') return json({ valido: false, motivo: 'method_not_allowed' }, 405)

  try {
    const { clienteKey, senha } = await req.json()

    // Valida formato: clienteKey deve ter 8 chars hexadecimais, senha 6 dígitos
    if (!clienteKey || typeof clienteKey !== 'string' || !/^[0-9a-f]{8}$/i.test(clienteKey)) {
      return json({ valido: false, motivo: 'campos_ausentes' }, 400)
    }
    if (!senha || typeof senha !== 'string' || !/^\d{6}$/.test(senha)) {
      return json({ valido: false, motivo: 'campos_ausentes' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Busca link ativo filtrando pelos primeiros 8 chars do cliente_id
    const { data: links } = await supabase
      .from('onboarding_links')
      .select('*')
      .eq('ativo', true)

    const link = (links ?? []).find((l: { cliente_id: string }) =>
      l.cliente_id?.toString().substring(0, 8) === clienteKey
    )

    if (!link) {
      // Resposta genérica para não revelar se o link existe
      return json({ valido: false, motivo: 'link_nao_encontrado' })
    }

    // ── Verifica bloqueio por tentativas ──────────────────────────────────────
    if (link.bloqueado_ate && new Date(link.bloqueado_ate) > new Date()) {
      return json({ valido: false, motivo: 'temporariamente_bloqueado' })
    }

    // ── Verifica expiração ────────────────────────────────────────────────────
    if (new Date(link.expira_em) < new Date()) {
      await supabase.from('onboarding_links').update({ ativo: false }).eq('id', link.id)
      if (link.drive_file_id) {
        await supabase.storage.from(BUCKET).remove([link.drive_file_id])
      }
      return json({ valido: false, motivo: 'link_expirado' })
    }

    // ── Verifica senha ────────────────────────────────────────────────────────
    if (link.senha !== senha) {
      const novasTentativas = (link.tentativas ?? 0) + 1
      const update: Record<string, unknown> = { tentativas: novasTentativas }

      if (novasTentativas >= MAX_TENTATIVAS) {
        update.bloqueado_ate = new Date(Date.now() + BLOQUEIO_MS).toISOString()
        await supabase.from('onboarding_links').update(update).eq('id', link.id)
        console.warn(`[validar-onboarding] bloqueado clienteKey=${clienteKey} tentativas=${novasTentativas}`)
        return json({ valido: false, motivo: 'tentativas_esgotadas' })
      }

      await supabase.from('onboarding_links').update(update).eq('id', link.id)
      return json({ valido: false, motivo: 'senha_incorreta' })
    }

    // ── Sucesso: reseta contadores ────────────────────────────────────────────
    await supabase
      .from('onboarding_links')
      .update({ tentativas: 0, bloqueado_ate: null })
      .eq('id', link.id)

    // Busca nome do cliente
    const { data: cliente } = await supabase
      .from('clientes')
      .select('nome')
      .eq('id', link.cliente_id)
      .single()

    console.log(`[validar-onboarding] acesso OK clienteKey=${clienteKey}`)

    return json({
      valido: true,
      drive_link: link.drive_link,
      cliente_nome: cliente?.nome ?? 'Cliente',
    })

  } catch (err) {
    console.error('[validar-onboarding] erro:', err)
    return json({ valido: false, motivo: 'erro_interno' }, 500)
  }
})
