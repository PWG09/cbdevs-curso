import type { UserRole } from "@/types/user";

export function canManageContent(role?: UserRole) {
  return role === "admin" || role === "empleado";
}

export function canManageUsers(role?: UserRole) {
  return role === "admin";
}

export function canEnroll(role?: UserRole) {
  return role === "admin";
}

export function canViewStudents(role?: UserRole) {
  return role === "admin" || role === "empleado";
}
