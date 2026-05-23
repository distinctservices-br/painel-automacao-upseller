import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    'Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não encontradas. ' +
    'Crie o arquivo .env.local com as credenciais do Supabase.'
  )
}

// Usamos APENAS a anon key — nunca a service_role key no front-end.
// O RLS no Supabase garante que apenas usuários autenticados acessem os dados.
export const supabase = createClient(supabaseUrl, supabaseAnon, {
  auth: {
    persistSession:    true,
    autoRefreshToken:  true,
    detectSessionInUrl: true,
  },
})
