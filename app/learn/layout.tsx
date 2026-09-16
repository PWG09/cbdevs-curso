"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/firebase/auth";
import { useAuth } from "@/providers/auth-provider";

export default function LearnLayout({ children }: { children: React.ReactNode }) {
  const { firebaseUser, appUser, loading, profileError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace("/login");
      return;
    }
    if (appUser && appUser.role !== "cliente") {
      router.replace("/dashboard");
    }
  }, [loading, firebaseUser, appUser, router]);

  if (loading) return <main className="auth-shell"><p className="muted">Comprobando sesión...</p></main>;
  if (!firebaseUser) return <main className="auth-shell"><p className="muted">Redirigiendo al inicio de sesión...</p></main>;
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
  if (appUser.role !== "cliente") return <main className="auth-shell"><p className="muted">Redirigiendo...</p></main>;

  return <>{children}</>;
}
