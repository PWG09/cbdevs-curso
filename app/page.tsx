"use client";

import Link from "next/link";
import { useAuth } from "@/providers/auth-provider";

export default function HomePage() {
  const { firebaseUser, appUser, loading } = useAuth();

  return (
    <main>
      <header className="header">
        <div className="container header-inner">
          <div className="brand">CBDEVS <span>COURSES</span></div>
          {!loading && (
            <div className="row">
              {firebaseUser ? (
                <Link className="btn btn-primary" href="/dashboard">Dashboard</Link>
              ) : (
                <>
                  <Link className="btn" href="/login">Entrar</Link>
                  <Link className="btn btn-primary" href="/register">Crear cuenta</Link>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <section className="page">
        <div className="container" style={{ maxWidth: 820 }}>
          <div className="card">
            <span className="badge badge-amber">CBDEVS</span>
            <h1 style={{ fontSize: 46, marginBottom: 10 }}>Cursos online.</h1>
            <p className="muted" style={{ fontSize: 18, lineHeight: 1.6 }}>
              Plataforma para cursos grabados, módulos, lecciones y seguimiento de progreso.
            </p>
            {appUser && (
              <p className="muted">
                Sesión activa como <strong>{appUser.name || appUser.email}</strong>.
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
