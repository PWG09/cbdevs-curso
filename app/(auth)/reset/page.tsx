"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Send } from "lucide-react";
import AuthCard from "@/components/AuthCard";
import PasswordInput from "@/components/PasswordInput";
import { ErrorBanner, SuccessBanner } from "@/components/ui";
import { homeFor } from "@/components/Guard";
import { MIN_PASSWORD, useAuth } from "@/providers/auth";
import { messageOf } from "@/lib/errors";

/**
 * Handles both steps of password recovery on the same URL already allow-listed in Supabase:
 * requesting the email, and (when opened from that email link) choosing the new password.
 */
export default function ResetPage() {
  const { recovery, authUser, appUser, loading, requestReset, updatePassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const settingPassword = recovery && Boolean(authUser);

  async function sendLink(event: FormEvent) {
    event.preventDefault();
    setError(""); setMessage(""); setBusy(true);
    try {
      await requestReset(email);
      setMessage("Si existe una cuenta con ese correo, recibirás un enlace para crear una nueva contraseña.");
    } catch (cause) {
      setError(messageOf(cause, "No se pudo enviar el correo."));
    } finally { setBusy(false); }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setError(""); setMessage("");
    if (password !== confirmation) { setError("Las contraseñas no coinciden."); return; }
    setBusy(true);
    try {
      await updatePassword(password);
      setMessage("Contraseña actualizada. Entrando…");
      setTimeout(() => router.replace(homeFor(appUser?.role)), 900);
    } catch (cause) {
      setError(messageOf(cause, "No se pudo actualizar la contraseña."));
    } finally { setBusy(false); }
  }

  if (loading && recovery) return <AuthCard eyebrow="Recuperación" title="Verificando enlace…"><p className="text-sm text-cb-muted">Un momento.</p></AuthCard>;

  if (settingPassword) {
    return (
      <AuthCard eyebrow="Recuperación" title="Crea una nueva contraseña" description={`Usa una contraseña única de al menos ${MIN_PASSWORD} caracteres.`}>
        <form className="space-y-4" onSubmit={savePassword}>
          <div><label className="label" htmlFor="reset-password">Nueva contraseña</label><PasswordInput id="reset-password" value={password} onChange={setPassword} autoComplete="new-password" minLength={MIN_PASSWORD} /></div>
          <div><label className="label" htmlFor="reset-confirm">Confirmar contraseña</label><PasswordInput id="reset-confirm" value={confirmation} onChange={setConfirmation} autoComplete="new-password" minLength={MIN_PASSWORD} /></div>
          <ErrorBanner>{error}</ErrorBanner>
          <SuccessBanner>{message}</SuccessBanner>
          <button type="submit" disabled={busy} className="btn-primary w-full"><KeyRound size={16} aria-hidden />{busy ? "Guardando…" : "Guardar contraseña"}</button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow="Recuperación" title="¿Olvidaste tu contraseña?" description="Te enviaremos un enlace para crear una nueva." footer={<Link className="link" href="/login">Volver a iniciar sesión</Link>}>
      <form className="space-y-4" onSubmit={sendLink}>
        <label className="block"><span className="label">Correo</span><input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={254} /></label>
        <ErrorBanner>{error}</ErrorBanner>
        <SuccessBanner>{message}</SuccessBanner>
        <button type="submit" disabled={busy} className="btn-primary w-full"><Send size={16} aria-hidden />{busy ? "Enviando…" : "Enviar enlace"}</button>
      </form>
    </AuthCard>
  );
}
