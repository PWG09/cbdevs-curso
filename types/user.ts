export type UserRole = "admin" | "empleado" | "cliente";

export interface AppUser {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  createdAt?: unknown;
}
