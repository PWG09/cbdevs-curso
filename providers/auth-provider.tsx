"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/lib/firebase/auth";
import { getUserProfile } from "@/lib/firestore/users";
import type { AppUser } from "@/types/user";

interface AuthContextValue {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  profileError: string;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  appUser: null,
  loading: true,
  profileError: "",
  refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState("");

  async function loadProfile(user: User | null) {
    setProfileError("");

    if (!user) {
      setAppUser(null);
      return;
    }

    try {
      const profile = await getUserProfile(user.uid);

      if (!profile) {
        setAppUser(null);
        setProfileError(
          "Esta cuenta de Firebase no tiene un usuario registrado en cbdevs-admin. Contacta al administrador."
        );
        return;
      }

      if (!profile.active) {
        setAppUser(null);
        setProfileError("Tu cuenta está desactivada. Contacta al administrador.");
        return;
      }

      setAppUser(profile);
    } catch (error) {
      setAppUser(null);
      setProfileError(
        error instanceof Error
          ? error.message
          : "No se pudo cargar tu perfil de usuario."
      );
    }
  }

  async function refreshUser() {
    await loadProfile(auth.currentUser);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      await loadProfile(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{ firebaseUser, appUser, loading, profileError, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
