"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getStaffAccess } from "@/lib/data/session";
import { AppError, messageOf } from "@/lib/errors";
import type { AppUser } from "@/types/course";

export const MIN_PASSWORD = 12;

type RegisterResult = { needsConfirmation: boolean; user: AppUser | null };

type AuthContextValue = {
  authUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  /** Set when the user arrived from a password-recovery email link. */
  recovery: boolean;
  error: string;
  login: (email: string, password: string) => Promise<AppUser>;
  loginGoogle: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<RegisterResult>;
  requestReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AppUser | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const origin = () => (typeof window !== "undefined" ? window.location.origin : undefined);

async function resolveUser(user: User): Promise<AppUser> {
  const supabase = getSupabaseClient();
  const [{ data: profile, error: profileError }, staff] = await Promise.all([
    supabase.from("profiles").select("display_name, created_at").eq("id", user.id).maybeSingle(),
    getStaffAccess(user.id),
  ]);
  if (profileError) throw new AppError("No se pudo verificar tu perfil.");
  const metaName = typeof user.user_metadata?.display_name === "string" ? user.user_metadata.display_name : typeof user.user_metadata?.name === "string" ? user.user_metadata.name : "";
  return {
    id: user.id,
    name: profile?.display_name?.trim() || metaName.trim() || user.email?.split("@")[0] || "Usuario",
    email: user.email ?? "",
    role: staff?.role ?? "cliente",
    active: true,
    createdAt: profile?.created_at,
    organizationId: staff?.organizationId,
  };
}

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD) return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`;
  if (password.length > 128) return "La contraseña es demasiado larga.";
  return null;
}

function authErrorMessage(error: { code?: string; message?: string } | null, fallback: string): string {
  const code = error?.code ?? "";
  const message = error?.message ?? "";
  if (code === "weak_password" || /weak|pwned|leaked/i.test(message)) return "Esa contraseña es demasiado débil o aparece en filtraciones conocidas. Elige otra.";
  if (code === "user_already_exists" || /already registered/i.test(message)) return "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.";
  if (code === "email_not_confirmed" || /not confirmed/i.test(message)) return "Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.";
  if (code === "over_email_send_rate_limit" || code === "over_request_rate_limit" || /rate limit/i.test(message)) return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  if (code === "same_password") return "La nueva contraseña debe ser distinta de la actual.";
  return fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const [error, setError] = useState("");
  const version = useRef(0);

  const load = useCallback(async (user: User | null) => {
    const id = ++version.current;
    setAuthUser(user);
    if (!user) {
      setAppUser(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    try {
      const resolved = await resolveUser(user);
      if (version.current === id) { setAppUser(resolved); setError(""); }
      return resolved;
    } catch (cause) {
      if (version.current === id) { setAppUser(null); setError(messageOf(cause, "No se pudo verificar tu cuenta.")); }
      return null;
    } finally {
      if (version.current === id) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let supabase: ReturnType<typeof getSupabaseClient>;
    try {
      supabase = getSupabaseClient();
    } catch (cause) {
      setError(messageOf(cause, "La aplicación no está configurada."));
      setLoading(false);
      return;
    }
    if (typeof window !== "undefined" && /type=recovery/.test(window.location.hash)) setRecovery(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        // Defer: Supabase recommends not awaiting other calls inside this callback.
        setTimeout(() => { void load(session?.user ?? null); }, 0);
      }
    });
    return () => subscription.unsubscribe();
  }, [load]);

  const value = useMemo<AuthContextValue>(() => ({
    authUser, appUser, loading, recovery, error,
    login: async (email, password) => {
      const { data, error: signInError } = await getSupabaseClient().auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (signInError || !data.user) throw new AppError(authErrorMessage(signInError, "Correo o contraseña incorrectos."));
      const resolved = await load(data.user);
      if (!resolved) throw new AppError("No se pudo verificar tu cuenta. Inténtalo de nuevo.");
      return resolved;
    },
    loginGoogle: async () => {
      const { error: oauthError } = await getSupabaseClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${origin()}/my-courses` } });
      if (oauthError) throw new AppError("No se pudo iniciar sesión con Google. Inténtalo con correo y contraseña.");
    },
    register: async (name, email, password) => {
      const cleanName = name.trim().replace(/\s+/g, " ");
      if (cleanName.length < 2 || cleanName.length > 100) throw new AppError("El nombre debe tener entre 2 y 100 caracteres.");
      const passwordProblem = validatePassword(password);
      if (passwordProblem) throw new AppError(passwordProblem);
      // Public sign-up always creates a student; staff roles are only granted by administrators.
      const { data, error: signUpError } = await getSupabaseClient().auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { display_name: cleanName, name: cleanName }, emailRedirectTo: `${origin()}/my-courses` },
      });
      if (signUpError || !data.user) throw new AppError(authErrorMessage(signUpError, "No se pudo crear la cuenta."));
      if (!data.session) return { needsConfirmation: true, user: null };
      return { needsConfirmation: false, user: await load(data.user) };
    },
    requestReset: async (email) => {
      const { error: resetError } = await getSupabaseClient().auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${origin()}/reset` });
      if (resetError) throw new AppError(authErrorMessage(resetError, "No se pudo enviar el correo de recuperación."));
    },
    updatePassword: async (password) => {
      const problem = validatePassword(password);
      if (problem) throw new AppError(problem);
      const { error: updateError } = await getSupabaseClient().auth.updateUser({ password });
      if (updateError) throw new AppError(authErrorMessage(updateError, "No se pudo actualizar la contraseña. Solicita un enlace nuevo."));
      setRecovery(false);
    },
    updateName: async (name) => {
      const cleanName = name.trim().replace(/\s+/g, " ");
      if (cleanName.length < 2 || cleanName.length > 100) throw new AppError("El nombre debe tener entre 2 y 100 caracteres.");
      const supabase = getSupabaseClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new AppError("Tu sesión expiró. Vuelve a iniciar sesión.");
      const { error: profileError } = await supabase.from("profiles").update({ display_name: cleanName, updated_at: new Date().toISOString() }).eq("id", data.user.id);
      if (profileError) throw new AppError("No se pudo guardar tu nombre.");
      await supabase.auth.updateUser({ data: { display_name: cleanName } });
      setAppUser((current) => (current ? { ...current, name: cleanName } : current));
    },
    logout: async () => {
      await getSupabaseClient().auth.signOut();
      setAppUser(null);
      setAuthUser(null);
    },
    refreshUser: async () => {
      const { data } = await getSupabaseClient().auth.getUser();
      return load(data.user ?? null);
    },
  }), [authUser, appUser, loading, recovery, error, load]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

export const isStaff = (user: AppUser | null) => user?.role === "admin" || user?.role === "empleado";
