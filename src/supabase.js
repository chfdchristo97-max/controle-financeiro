import { createClient } from '@supabase/supabase-js'

// Chave pública (feita para ficar no site). Os dados ficam protegidos por login + regras de segurança do banco.
const SUPABASE_URL = 'https://rmwrnngtlgtuhjzurpch.supabase.co'
const SUPABASE_KEY = 'sb_publishable_O93n8P18K0cZv3EhjSq6Zg_lDNIDLWZ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
})
