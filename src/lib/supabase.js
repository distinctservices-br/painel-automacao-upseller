import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas. ' +
    'Crie o arquivo .env.local com as credenciais do Supabase.'
  )
}

// ── Segurança ─────────────────────────────────────────────────────────────
// · Apenas anon key no front-end — service_role key NUNCA entra aqui.
// · RLS bloqueia acesso sem sessão autenticada em todas as tabelas.
// · flowType PKCE: tokens de auth trocados com code_verifier — mais seguro
//   que o fluxo implícito, previne interceptação de tokens na URL.
// · debug: false — garante que logs internos do SDK não vazem dados em produção.
export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
    flowType:           'pkce',   // PKCE — mais seguro que implicit flow
    debug:              false,     // sem logs de auth em produção
  },
  global: {
    headers: {
      'X-Client-Info': 'distinct-painel/1.0',
    },
  },
})
