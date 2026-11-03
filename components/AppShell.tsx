"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, GraduationCap, LogOut, Menu, UserCog, UserPlus, Users, X } from "lucide-react";
import { isStaff, useAuth } from "@/providers/auth";
import { Brand } from "@/components/ui";
import { initialsFrom } from "@/lib/format";

const staffNav = [
  { href: "/courses", label: "Cursos", icon: BookOpen },
  { href: "/students", label: "Alumnos", icon: Users },
  { href: "/enrollments", label: "Inscripciones", icon: UserPlus },
];
const studentNav = [{ href: "/my-courses", label: "Mis cursos", icon: GraduationCap }];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { appUser, logout } = useAuth();
  const path = usePathname() ?? "";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const nav = [...(appUser ? (isStaff(appUser) ? staffNav : studentNav) : []), { href: "/account", label: "Mi cuenta", icon: UserCog }];
  const roleLabel = appUser?.role === "admin" ? "Administrador" : appUser?.role === "empleado" ? "Equipo" : "Alumno";

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="min-h-screen bg-cb-bg">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-cb-amber focus:px-3 focus:py-2 focus:text-black">Saltar al contenido</a>
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-cb-line bg-cb-panel p-4 transition-transform duration-200 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`} aria-label="Menú lateral">
        <div className="flex items-center justify-between px-2 py-3">
          <Link href="/"><Brand /></Link>
          <button type="button" className="rounded-lg p-2 text-cb-muted lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X size={18} /></button>
        </div>
        <div className="my-5 h-px bg-cb-line" />
        <nav className="space-y-1" aria-label="Navegación principal">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = path === item.href || path.startsWith(`${item.href}/`);
            return (
              <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "bg-cb-amber/10 text-cb-amber" : "text-slate-400 hover:bg-cb-panel2 hover:text-white"}`}>
                <Icon size={18} aria-hidden />{item.label}
              </Link>
            );
          })}
        </nav>
        {appUser && (
          <div className="mt-auto rounded-2xl border border-cb-line bg-cb-bg p-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cb-amber/15 font-mono text-xs text-cb-amber" aria-hidden>{initialsFrom(appUser.name)}</div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{appUser.name}</div>
                <div className="text-xs text-cb-muted">{roleLabel}</div>
              </div>
              <button type="button" onClick={async () => { await logout(); router.replace("/login"); }} title="Cerrar sesión" aria-label="Cerrar sesión" className="ml-auto rounded-lg p-2 text-slate-500 transition hover:bg-cb-panel2 hover:text-white"><LogOut size={16} /></button>
            </div>
          </div>
        )}
      </aside>
      {open && <button type="button" className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú" />}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-cb-line bg-cb-bg/85 px-4 backdrop-blur lg:hidden">
          <button type="button" className="rounded-lg p-2 text-slate-300" onClick={() => setOpen(true)} aria-label="Abrir menú" aria-expanded={open}><Menu /></button>
          <Brand />
        </header>
        <main id="contenido" className="mx-auto max-w-[1240px] p-4 pb-16 sm:p-6 lg:p-10">{children}</main>
      </div>
    </div>
  );
}
