import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

/**
 * Browser Supabase client using only the public publishable/anon key.
 * Every query runs as the signed-in user and is authorized by Postgres RLS.
 */
export function getSupabaseClient(): SupabaseClient {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_CBDEVS_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_CBDEVS_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_CBDEVS_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Falta configurar la conexión central de Supabase.");
  browserClient = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return browserClient;
}
