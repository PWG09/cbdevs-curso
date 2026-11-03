import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import { AppError, toAppError } from "@/lib/errors";
import type { Role } from "@/types/course";

export const db = () => getSupabaseClient();

export async function requireUser(): Promise<User> {
  const { data, error } = await db().auth.getUser();
  if (error || !data.user) throw new AppError("Tu sesión expiró. Vuelve a iniciar sesión.", "28000");
  return data.user;
}

export interface StaffAccess { organizationId: string; role: Exclude<Role, "cliente"> }

/**
 * Resolves the staff organization for the Courses app: an active owner/admin/manager membership
 * in an organization with the `courses` app enabled. UX only — RLS re-checks every write.
 */
export async function getStaffAccess(userId: string): Promise<StaffAccess | null> {
  const { data: memberships, error } = await db()
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("role", ["owner", "admin", "manager"]);
  if (error) throw toAppError(error, "No se pudieron verificar tus permisos.");
  if (!memberships?.length) return null;

  const { data: apps, error: appError } = await db()
    .from("organization_apps")
    .select("organization_id")
    .in("organization_id", memberships.map((m) => m.organization_id))
    .eq("app_key", "courses")
    .eq("enabled", true);
  if (appError) throw toAppError(appError, "No se pudieron verificar tus permisos.");
  const enabled = new Set((apps ?? []).map((a) => a.organization_id as string));

  // Prefer the highest role when the user belongs to several organizations.
  const rank: Record<string, number> = { owner: 0, admin: 1, manager: 2 };
  const match = memberships
    .filter((m) => enabled.has(m.organization_id))
    .sort((a, b) => (rank[a.role] ?? 9) - (rank[b.role] ?? 9))[0];
  if (!match) return null;
  return { organizationId: match.organization_id, role: match.role === "manager" ? "empleado" : "admin" };
}

export async function requireStaffOrganization(): Promise<string> {
  const user = await requireUser();
  const access = await getStaffAccess(user.id);
  if (!access) throw new AppError("Tu cuenta no tiene acceso de equipo a CBDEVS Cursos.", "42501");
  return access.organizationId;
}
