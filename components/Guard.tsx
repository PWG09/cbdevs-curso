"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useAuth } from "@/providers/auth";
import { Brand } from "@/components/ui";
import type { Role } from "@/types/course";

export const homeFor = (role: Role | undefined) => (role === "admin" || role === "empleado" ? "/courses" : "/my-courses");

/**
 * Client-side route gate for UX. It never grants data access: every query is authorized by RLS.
 */
export default function Guard({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { loading, appUser, authUser, error } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const allowed = Boolean(appUser && (!roles || roles.includes(appUser.role)));

  useEffect(() => {
    if (loading) return;
    if (!authUser) { router.replace(`/login?next=${encodeURIComponent(path || "/")}`); return; }
    if (appUser && !allowed) router.replace(homeFor(appUser.role));
  }, [loading, authUser, appUser, allowed, router, path]);

  if (!loading && authUser && !appUser && error) {
    return (
      <div className="mx-auto max-w-lg pt-10">
        <div className="panel p-8 text-center" role="alert">
          <AlertTriangle className="mx-auto mb-3 text-red-400" aria-hidden />
          <h1 className="text-lg font-semibold">No pudimos verificar tu cuenta</h1>
          <p className="mt-2 text-sm text-cb-muted">{error}</p>
          <button type="button" className="btn-ghost mt-5" onClick={() => window.location.reload()}>Reintentar</button>
        </div>
      </div>
    );
  }

  if (loading || !allowed) {
    return (
      <div className="grid min-h-[60vh] place-items-center" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-3 text-sm text-cb-muted">
          <Brand />
          <span className="flex items-center gap-2"><span className="h-2 w-2 animate-pulse rounded-full bg-cb-amber" />Verificando sesión…</span>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
