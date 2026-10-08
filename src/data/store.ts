import { createClient } from '@supabase/supabase-js'
import { createLocalStore } from './localStore'
import { createSupabaseStore } from './supabaseStore'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Null in demo mode (no Supabase keys configured). */
export const supabase = url && anonKey ? createClient(url, anonKey) : null

export const store = supabase ? createSupabaseStore(supabase) : createLocalStore()

export async function signOut() {
  await supabase?.auth.signOut()
}
