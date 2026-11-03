type MaybeError = { code?: string; message?: string } | null | undefined;

/** Thrown by the data layer with a message that is safe to show to the user. */
export class AppError extends Error {
  constructor(message: string, readonly code?: string) {
    super(message);
    this.name = "AppError";
  }
}

const BY_CODE: Record<string, string> = {
  "42501": "No tienes permiso para realizar esta acción.",
  "28000": "Tu sesión expiró. Vuelve a iniciar sesión.",
  "23505": "Ya existe un registro con esos datos.",
  "23503": "El registro relacionado ya no existe.",
  "23514": "Algún dato no cumple las reglas permitidas.",
  "22023": "Algún dato no es válido.",
  P0002: "No se encontró el registro solicitado.",
  PGRST116: "No se encontró el registro solicitado.",
  PGRST202: "Falta aplicar una actualización de base de datos. Avisa al administrador.",
  PGRST301: "Tu sesión expiró. Vuelve a iniciar sesión.",
};

/**
 * Maps a Supabase/PostgREST error to a user-facing Spanish message. Raw database messages
 * are logged by code only and never shown, so internals (table names, policies) do not leak.
 */
export function toAppError(error: MaybeError, fallback: string, overrides: Record<string, string> = {}): AppError {
  const code = error?.code;
  if (code) console.error("[Cursos]", fallback, code);
  return new AppError((code && (overrides[code] ?? BY_CODE[code])) || fallback, code);
}

export function messageOf(error: unknown, fallback: string): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.name === "AppError") return error.message;
  return fallback;
}
