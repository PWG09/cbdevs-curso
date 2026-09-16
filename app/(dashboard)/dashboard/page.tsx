"use client";

import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";

export default function DashboardPage() {
  const { appUser } = useAuth();

  return (
    <>
      <div className="top-actions">
        <div>
          <h1 style={{ marginBottom: 4 }}>Dashboard</h1>
          <div className="muted">Bienvenido, {appUser?.name || appUser?.email}</div>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="stat">
          <span className="muted">Rol</span>
          <strong style={{ fontSize: 22 }}>{appUser?.role}</strong>
        </div>
        <div className="stat">
          <span className="muted">Cursos</span>
          <strong>→</strong>
          <Link href="/courses" className="muted">Ver cursos</Link>
        </div>
        <div className="stat">
          <span className="muted">Cuenta</span>
          <strong style={{ fontSize: 22 }}>{appUser?.email}</strong>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h2>Plataforma de cursos</h2>
        <p className="muted">
          Aquí se administran exclusivamente cursos grabados, módulos, lecciones,
          inscripciones y progreso.
        </p>
      </div>
    </>
  );
}
