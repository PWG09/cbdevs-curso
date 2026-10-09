import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (browserClient) return browserClient;
  const url = process.env.NEXT_PUBLIC_CBDEVS_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_CBDEVS_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Falta configurar la conexión central de Supabase.");
  browserClient = createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return browserClient;
}

export async function getCurrentOrganization(appKey = "courses"): Promise<string> {
  const supabase = getSupabaseClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Inicia sesión para continuar.");

  const { data: memberships, error } = await supabase
    .from("organization_members")
    .select("organization_id,role,status")
    .eq("user_id", user.id)
    .eq("status", "active");
  if (error) throw new Error("No se pudo verificar el acceso a la organización.");

  for (const membership of memberships || []) {
    const { data: app } = await supabase
      .from("organization_apps")
      .select("enabled")
      .eq("organization_id", membership.organization_id)
      .eq("app_key", appKey)
      .maybeSingle();
    if (app?.enabled) return membership.organization_id;
  }

  // Students are not organization staff; derive their tenant only from their own active enrollment.
  if (appKey === "courses") {
    const { data: enrollment } = await supabase
      .from("cbdevs_course_enrollments")
      .select("organization_id")
      .eq("user_id", user.id)
      .eq("active", true)
      .limit(1)
      .maybeSingle();
    if (enrollment?.organization_id) return enrollment.organization_id;
  }

  throw new Error("Tu cuenta no tiene acceso activo a esta aplicación. Pide al administrador que te asigne acceso.");
}

export async function getOptionalCurrentOrganization(appKey = "courses"): Promise<string | null> {
  try { return await getCurrentOrganization(appKey); } catch { return null; }
}
