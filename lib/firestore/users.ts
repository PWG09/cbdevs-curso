import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase/firestore";
import type { AppUser } from "@/types/user";

export async function getUserProfile(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;

  const data = snap.data();
  const role = data.role;

  if (role !== "admin" && role !== "empleado" && role !== "cliente") {
    throw new Error("La cuenta no tiene un rol válido en cbdevs-admin.");
  }

  return {
    uid: snap.id,
    email: String(data.email ?? ""),
    name: String(data.name ?? ""),
    role,
    active: data.active !== false,
    createdAt: data.createdAt,
  };
}

/**
 * Only used for public self-registration / first-time Google sign-in.
 * Never changes an existing admin or employee profile.
 */
export async function createClientProfile(user: User, name?: string): Promise<AppUser> {
  const ref = doc(db, "users", user.uid);
  const existing = await getDoc(ref);

  if (existing.exists()) {
    const profile = await getUserProfile(user.uid);
    if (!profile) throw new Error("No se pudo leer el perfil de usuario.");
    return profile;
  }

  const profile: AppUser = {
    uid: user.uid,
    email: user.email ?? "",
    name: (name ?? user.displayName ?? "").trim(),
    role: "cliente",
    active: true,
  };

  await setDoc(ref, {
    active: true,
    createdAt: serverTimestamp(),
    email: profile.email,
    name: profile.name,
    role: "cliente",
  });

  return profile;
}
