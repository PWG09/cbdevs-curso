"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import AuthCard from "@/components/AuthCard";
import PasswordInput from "@/components/PasswordInput";
import { ErrorBanner } from "@/components/ui";
import { homeFor } from "@/components/Guard";
import { useAuth } from "@/providers/auth";
import { messageOf } from "@/lib/errors";

function safeNext(value: string | null): string | null {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") ? value : null;
}

function LoginForm() {
  const { login, loginGoogle, appUser, loading } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && appUser) router.replace(next ?? homeFor(appUser.role));
  }, [loading, appUser, router, next]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await login(email, password);
      router.replace(next ?? homeFor(user.role));
    } catch (cause) {
      setError(messageOf(cause, "No se pudo iniciar sesión."));
      setBusy(false);
    }
  }

  async function google() {
    setError("");
    setBusy(true);
    try { await loginGoogle(); } catch (cause) { setError(messageOf(cause, "No se pudo iniciar sesión con Google.")); setBusy(false); }
  }

  return (
    <AuthCard eyebrow="Acceso" title="Inicia sesión" description="Continúa con tus cursos donde te quedaste." footer={<>¿No tienes cuenta? <Link className="link" href="/register">Regístrate gratis</Link></>}>
      <form className="space-y-4" onSubmit={submit}>
        <label className="block"><span className="label">Correo</span><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} /></label>
        <div>
          <div className="flex items-baseline justify-between"><label className="label" htmlFor="password">Contraseña</label><Link className="text-xs text-cb-amber hover:underline" href="/reset">¿La olvidaste?</Link></div>
          <PasswordInput id="password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        <ErrorBanner>{error}</ErrorBanner>
        <button type="submit" disabled={busy} className="btn-primary w-full"><LogIn size={16} aria-hidden />{busy ? "Entrando…" : "Entrar"}</button>
      </form>
      <div className="my-5 flex items-center gap-3 text-xs text-slate-500"><span className="h-px flex-1 bg-cb-line" />o<span className="h-px flex-1 bg-cb-line" /></div>
      <button type="button" disabled={busy} className="btn-ghost w-full" onClick={google}>Continuar con Google</button>
    </AuthCard>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
