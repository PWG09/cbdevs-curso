"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginWithEmail, loginWithGoogle, resetPassword } from "@/lib/firebase/auth";
import { createClientProfile } from "@/lib/firestore/users";
import { useAuth } from "@/providers/auth-provider";

function firebaseMessage(error: unknown) {
  const code = error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";

  if (code.includes("auth/invalid-credential")) return "Correo o contraseña incorrectos.";
  if (code.includes("auth/user-not-found")) return "No existe una cuenta con ese correo.";
  if (code.includes("auth/wrong-password")) return "Correo o contraseña incorrectos.";
  if (code.includes("auth/too-many-requests")) return "Demasiados intentos. Espera un momento y vuelve a intentarlo.";
  if (code.includes("auth/invalid-email")) return "El correo no es válido.";
  if (code.includes("auth/popup-closed-by-user")) return "Se cerró la ventana de Google antes de completar el acceso.";
  return error instanceof Error ? error.message : "No se pudo completar la operación.";
}

export default function LoginPage() {
  const router = useRouter();
  const { appUser, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && appUser) router.replace("/dashboard");
  }, [appUser, loading, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      await loginWithEmail(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(firebaseMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function google() {
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const credential = await loginWithGoogle();
      await createClientProfile(credential.user);
      router.replace("/dashboard");
    } catch (err) {
      setError(firebaseMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function sendReset() {
    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Escribe tu correo para enviarte el enlace de recuperación.");
      return;
    }

    setSaving(true);
    try {
      await resetPassword(email);
      setMessage("Te enviamos un correo para restablecer tu contraseña.");
    } catch (err) {
      setError(firebaseMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!loading && appUser) return null;

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="brand">CBDEVS <span>COURSES</span></div>
        <h1>{resetMode ? "Restablecer contraseña" : "Iniciar sesión"}</h1>
        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </div>

        {resetMode ? (
          <>
            <button className="btn btn-primary" style={{ width: "100%" }} onClick={sendReset} disabled={saving}>
              {saving ? "Enviando..." : "Enviar enlace"}
            </button>
            <button className="btn" style={{ width: "100%", marginTop: 10 }} onClick={() => { setResetMode(false); setError(""); setMessage(""); }}>
              Volver a iniciar sesión
            </button>
          </>
        ) : (
          <>
            <form onSubmit={submit}>
              <div className="field">
                <label>Contraseña</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              <button className="btn btn-primary" style={{ width: "100%" }} disabled={saving}>
                {saving ? "Entrando..." : "Entrar"}
              </button>
            </form>
            <button className="btn" style={{ width: "100%", marginTop: 10 }} onClick={google} disabled={saving}>
              Continuar con Google
            </button>
            <button className="link-button" onClick={() => { setResetMode(true); setError(""); setMessage(""); }}>
              ¿Olvidaste tu contraseña?
            </button>
            <p className="muted">
              ¿No tienes cuenta? <Link href="/register">Regístrate</Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
