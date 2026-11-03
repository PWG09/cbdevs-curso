"use client";

import Link from "next/link";
import { ArrowRight, BadgeCheck, Code2, Layers, PlayCircle } from "lucide-react";
import { Brand } from "@/components/ui";
import { homeFor } from "@/components/Guard";
import { useAuth } from "@/providers/auth";

const features = [
  { icon: Layers, title: "Ruta por fases", text: "Cada curso avanza en fases y lecciones cortas, en el orden correcto." },
  { icon: PlayCircle, title: "Video y lectura", text: "Explicaciones en video, material de lectura y recursos descargables." },
  { icon: Code2, title: "Práctica real", text: "Ejemplos de código, ejercicios con solución y quizzes para comprobar lo aprendido." },
  { icon: BadgeCheck, title: "Tu progreso", text: "Marca lecciones completadas y retoma exactamente donde te quedaste." },
];

export default function Home() {
  const { appUser, loading } = useAuth();
  const primaryHref = appUser ? homeFor(appUser.role) : "/login";

  return (
    <main className="relative min-h-screen overflow-hidden bg-cb-bg">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-cb-amber/[.07] blur-3xl" aria-hidden />
      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Brand />
        <nav className="flex items-center gap-2">
          {appUser ? <Link className="btn-ghost" href={primaryHref}>Ir a mis cursos</Link> : (
            <>
              <Link className="btn text-slate-300 hover:text-white" href="/login">Iniciar sesión</Link>
              <Link className="btn-primary" href="/register">Crear cuenta</Link>
            </>
          )}
        </nav>
      </header>

      <section className="relative mx-auto max-w-6xl px-5 pb-16 pt-12 sm:pt-20">
        <div className="max-w-3xl">
          <div className="mono-label">Formación CBDEVS</div>
          <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">Aprende a construir software <span className="text-cb-amber">paso a paso.</span></h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-cb-muted">Cursos grabados y estructurados por el equipo de CBDEVS, con práctica guiada y seguimiento de tu avance lección por lección.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link className="btn-primary px-6 py-3 text-base" href={primaryHref}>{loading ? "Cargando…" : appUser ? "Continuar aprendiendo" : "Entrar a mis cursos"} <ArrowRight size={18} aria-hidden /></Link>
            {!appUser && <Link className="btn-ghost px-6 py-3 text-base" href="/register">Crear cuenta gratis</Link>}
          </div>
        </div>

        <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, text }) => (
            <div key={title} className="panel p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-cb-panel2 text-cb-amber"><Icon size={19} aria-hidden /></div>
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-1.5 text-sm leading-6 text-cb-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative border-t border-cb-line py-6 text-center text-xs text-slate-500">© {new Date().getFullYear()} CBDEVS · Acceso a cursos por inscripción</footer>
    </main>
  );
}
