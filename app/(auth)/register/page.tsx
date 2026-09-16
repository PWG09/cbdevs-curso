"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAuthenticatedUser, registerWithEmail } from "@/lib/firebase/auth";
import { createClientProfile } from "@/lib/firestore/users";

function firebaseMessage(error: unknown) {
  const code = error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code)
    : "";

  if (code.includes("auth/email-already-in-use")) return "Ese correo ya está registrado.";
  if (code.includes("auth/invalid-email")) return "El correo no es válido.";
  if (code.includes("auth/weak-password")) return "La contraseña debe tener al menos 6 caracteres.";
  if (code.includes("permission-denied")) return "No tienes permiso para crear el perfil. Revisa las reglas de Firestore.";
  return error instanceof Error ? error.message : "No se pudo crear la cuenta.";
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const credential = await registerWithEmail(email, password);
      try {
        await createClientProfile(credential.user, name);
      } catch (profileError) {
        try {
          await deleteAuthenticatedUser();
        } catch {
          // Keep the original profile error visible if rollback is not possible.
        }
        throw profileError;
      }
      router.replace("/dashboard");
    } catch (err) {
      setError(firebaseMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="brand">CBDEVS <span>COURSES</span></div>
        <h1>Crear cuenta</h1>
        <p className="muted">Las cuentas creadas aquí siempre son Cliente.</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field">
            <label>Nombre</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </div>
          <div className="field">
            <label>Contraseña</label>
            <input minLength={6} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
          </div>
          <button className="btn btn-primary" style={{ width: "100%" }} disabled={saving}>
            {saving ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>
        <p className="muted">
          ¿Ya tienes cuenta? <Link href="/login">Entrar</Link>
        </p>
      </div>
    </main>
  );
}
