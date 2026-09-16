import type { UserRole } from "@/types/user";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  empleado: "Empleado",
  cliente: "Cliente"
};
