"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MailCheck, UserPlus } from "lucide-react";
import AuthCard from "@/components/AuthCard";
import PasswordInput from "@/components/PasswordInput";
import { ErrorBanner } from "@/components/ui";
import { MIN_PASSWORD, useAuth } from "@/providers/auth";
import { messageOf } from "@/lib/errors";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (password !== confirmation) { setError("Las contraseñas no coinciden."); return; }
    setBusy(true);
    try {
      const result = await register(name, email, password);
      if (result.needsConfirmation) setSentTo(email.trim().toLowerCase());
      else router.replace("/my-courses");
    } catch (cause) {
      setError(messageOf(cause, "No se pudo crear la cuenta."));
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) {
    return (
      <AuthCard eyebrow="Último paso" title="Confirma tu correo" footer={<Link className="link" href="/login">Ir a iniciar sesión</Link>}>
        <div className="flex gap-3 rounded-xl border border-cb-line bg-cb-bg p-4 text-sm leading-6 text-slate-300">
          <MailCheck className="mt-0.5 shrink-0 text-cb-amber" size={20} aria-hidden />
          <p>Enviamos un enlace de confirmación a <strong className="text-white">{sentTo}</strong>. Ábrelo para activar tu cuenta. Si no lo ves, revisa la carpeta de spam.</p>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow="Nueva cuenta" title="Crea tu cuenta" description="Cuando el equipo te inscriba en un curso, aparecerá en “Mis cursos”." footer={<>¿Ya tienes cuenta? <Link className="link" href="/login">Inicia sesión</Link></>}>
      <form className="space-y-4" onSubmit={submit}>
        <label className="block"><span className="label">Nombre completo</span><input className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} /></label>
        <label className="block"><span className="label">Correo</span><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} /></label>
        <div><label className="label" htmlFor="new-password">Contraseña</label><PasswordInput id="new-password" value={password} onChange={setPassword} autoComplete="new-password" minLength={MIN_PASSWORD} /><span className="mt-1.5 block text-xs text-cb-muted">Mínimo {MIN_PASSWORD} caracteres.</span></div>
        <div><label className="label" htmlFor="confirm-password">Confirmar contraseña</label><PasswordInput id="confirm-password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" minLength={MIN_PASSWORD} /></div>
        <ErrorBanner>{error}</ErrorBanner>
        <button type="submit" disabled={busy} className="btn-primary w-full"><UserPlus size={16} aria-hidden />{busy ? "Creando cuenta…" : "Crear cuenta"}</button>
      </form>
    </AuthCard>
  );
}
