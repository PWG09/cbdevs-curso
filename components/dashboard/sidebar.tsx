"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/firebase/auth";
import { useAuth } from "@/providers/auth-provider";
import { ROLE_LABELS } from "@/lib/auth/roles";

export function Sidebar() {
  const { appUser } = useAuth();
  const router = useRouter();

  async function exit() {
    await logout();
    router.replace("/login");
  }

  return (
    <aside className="sidebar">
      <div className="brand" style={{ marginBottom: 18 }}>CBDEVS <span>COURSES</span></div>
      <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        {appUser ? ROLE_LABELS[appUser.role] : ""}
      </div>
      <nav>
        <Link href="/dashboard">Dashboard</Link>
        <Link href="/courses">Cursos</Link>
        {(appUser?.role === "admin" || appUser?.role === "empleado") && (
          <Link href="/students">Alumnos</Link>
        )}
      </nav>
      <button className="btn" style={{ width: "100%", marginTop: 20 }} onClick={exit}>
        Cerrar sesión
      </button>
    </aside>
  );
}
