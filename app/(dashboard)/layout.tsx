"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/dashboard/sidebar";
import { logout } from "@/lib/firebase/auth";
import { useAuth } from "@/providers/auth-provider";
import type { UserRole } from "@/types/user";

function routeAllowed(pathname: string, role: UserRole) {
  if (pathname === "/dashboard") return true;
  if (pathname === "/courses") return true;
  if (pathname === "/students" || pathname.startsWith("/students/")) {
    return role === "admin" || role === "empleado";
  }
  if (pathname === "/courses/new" || pathname.startsWith("/courses/")) {
    return role === "admin" || role === "empleado";
  }
  return true;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, appUser, loading, profileError } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (!appUser) return;

    if (!routeAllowed(pathname, appUser.role)) {
      router.replace("/dashboard");
    }
  }, [loading, firebaseUser, appUser, profileError, pathname, router]);

  if (loading) {
    return <main className="auth-shell"><p className="muted">Comprobando sesión...</p></main>;
  }

  if (!firebaseUser) {
    return <main className="auth-shell"><p className="muted">Redirigiendo al inicio de sesión...</p></main>;
  }

  if (profileError || !appUser) {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <div className="brand">CBDEVS <span>COURSES</span></div>
          <h1>Cuenta no habilitada</h1>
          <p className="muted">{profileError || "No se encontró tu perfil."}</p>
          <button className="btn btn-primary" style={{ width: "100%" }} onClick={async () => { await logout(); router.replace("/login"); }}>
            Cerrar sesión
          </button>
        </div>
      </main>
    );
  }

  if (!routeAllowed(pathname, appUser.role)) {
    return <main className="auth-shell"><p className="muted">Comprobando permisos...</p></main>;
  }

  return (
    <div className="dashboard-shell">
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  );
}
