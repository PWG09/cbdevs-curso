"use client";

import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, Save } from "lucide-react";
import Guard from "@/components/Guard";
import PasswordInput from "@/components/PasswordInput";
import { ErrorBanner, PageHeader, SuccessBanner } from "@/components/ui";
import { MIN_PASSWORD, useAuth } from "@/providers/auth";
import { messageOf } from "@/lib/errors";

function Account() {
  const { appUser, updateName, updatePassword } = useAuth();
  const [name, setName] = useState(appUser?.name ?? "");
  const [nameState, setNameState] = useState<{ busy: boolean; ok: string; error: string }>({ busy: false, ok: "", error: "" });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [passState, setPassState] = useState<{ busy: boolean; ok: string; error: string }>({ busy: false, ok: "", error: "" });

  useEffect(() => { if (appUser) setName(appUser.name); }, [appUser]);

  async function saveName(event: FormEvent) {
    event.preventDefault();
    setNameState({ busy: true, ok: "", error: "" });
    try { await updateName(name); setNameState({ busy: false, ok: "Nombre actualizado.", error: "" }); }
    catch (cause) { setNameState({ busy: false, ok: "", error: messageOf(cause, "No se pudo guardar.") }); }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (password !== confirmation) { setPassState({ busy: false, ok: "", error: "Las contraseñas no coinciden." }); return; }
    setPassState({ busy: true, ok: "", error: "" });
    try { await updatePassword(password); setPassword(""); setConfirmation(""); setPassState({ busy: false, ok: "Contraseña actualizada.", error: "" }); }
    catch (cause) { setPassState({ busy: false, ok: "", error: messageOf(cause, "No se pudo actualizar la contraseña.") }); }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader eyebrow="Cuenta" title="Mi cuenta" description="Tu nombre visible y tu contraseña. Los permisos los administra el equipo de CBDEVS." />
      <section className="panel p-6">
        <h2 className="text-lg font-semibold">Perfil</h2>
        <form className="mt-5 space-y-4" onSubmit={saveName}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block"><span className="label">Nombre visible</span><input className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} /></label>
            <label className="block"><span className="label">Correo</span><input className="input cursor-not-allowed opacity-60" value={appUser?.email ?? ""} readOnly aria-readonly="true" /></label>
          </div>
          <ErrorBanner>{nameState.error}</ErrorBanner>
          <SuccessBanner>{nameState.ok}</SuccessBanner>
          <button className="btn-primary" disabled={nameState.busy}><Save size={16} aria-hidden />{nameState.busy ? "Guardando…" : "Guardar"}</button>
        </form>
      </section>
      <section className="panel p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold"><KeyRound size={18} className="text-cb-amber" aria-hidden />Contraseña</h2>
        <form className="mt-5 space-y-4" onSubmit={savePassword}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="acc-pass">Nueva contraseña</label><PasswordInput id="acc-pass" value={password} onChange={setPassword} autoComplete="new-password" minLength={MIN_PASSWORD} /></div>
            <div><label className="label" htmlFor="acc-confirm">Confirmar contraseña</label><PasswordInput id="acc-confirm" value={confirmation} onChange={setConfirmation} autoComplete="new-password" minLength={MIN_PASSWORD} /></div>
          </div>
          <ErrorBanner>{passState.error}</ErrorBanner>
          <SuccessBanner>{passState.ok}</SuccessBanner>
          <button className="btn-ghost" disabled={passState.busy}>{passState.busy ? "Actualizando…" : "Cambiar contraseña"}</button>
        </form>
      </section>
    </div>
  );
}

export default function AccountPage() {
  return <Guard><Account /></Guard>;
}
