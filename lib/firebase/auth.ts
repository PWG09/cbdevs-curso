import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { firebaseApp } from "./client";

export const auth = getAuth(firebaseApp);

export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function registerWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email.trim(), password);
}

export async function loginWithGoogle() {
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email.trim());
}

export async function logout() {
  return signOut(auth);
}

export async function deleteAuthenticatedUser() {
  if (auth.currentUser) {
    await deleteUser(auth.currentUser);
  }
}
