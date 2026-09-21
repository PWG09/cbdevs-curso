"use client";
import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { auth } from "@/lib/firebase/client";
import { createClientUser, getUser } from "@/lib/firestore/users";
import { createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, signOut, User } from "firebase/auth";
import type { AppUser } from "@/types/course";

type C={firebaseUser:User|null;appUser:AppUser|null;loading:boolean;login:(e:string,p:string)=>Promise<AppUser>;loginGoogle:()=>Promise<AppUser>;register:(n:string,e:string,p:string)=>Promise<AppUser>;reset:(e:string)=>Promise<void>;logout:()=>Promise<void>;refreshUser:()=>Promise<AppUser|null>};
const AuthContext=createContext<C|null>(null);

async function resolveUser(user:User, allowClientProvisioning=false, nameOverride=""):Promise<AppUser>{
  let appUser=await getUser(user.uid);
  if(!appUser && allowClientProvisioning){
    await createClientUser(user.uid,nameOverride || user.displayName || "Cliente",user.email || "");
    appUser=await getUser(user.uid);
  }
  if(!appUser) throw new Error("Tu cuenta de Firebase no tiene un documento válido en users/{uid}. Pide al administrador que la configure desde cbdevs-admin.");
  if(!appUser.active) throw new Error("Tu cuenta está inactiva.");
  return appUser;
}

export function AuthProvider({children}:{children:ReactNode}){
 const [firebaseUser,setFirebaseUser]=useState<User|null>(null); const [appUser,setAppUser]=useState<AppUser|null>(null); const [loading,setLoading]=useState(true);
 useEffect(()=>{let mounted=true; const unsub=onAuthStateChanged(auth,async user=>{ if(!mounted)return; setFirebaseUser(user); if(!user){setAppUser(null);setLoading(false);return;} try{const u=await resolveUser(user,false); if(mounted)setAppUser(u);}catch{if(mounted)setAppUser(null);} finally{if(mounted)setLoading(false);} }); return()=>{mounted=false;unsub();};},[]);
 const value=useMemo<C>(()=>({firebaseUser,appUser,loading,
  login:async(e,p)=>{const c=await signInWithEmailAndPassword(auth,e.trim(),p);const u=await resolveUser(c.user,false);setAppUser(u);return u;},
  loginGoogle:async()=>{const c=await signInWithPopup(auth,new GoogleAuthProvider());const u=await resolveUser(c.user,true);setAppUser(u);return u;},
  register:async(n,e,p)=>{const c=await createUserWithEmailAndPassword(auth,e.trim(),p);try{await createClientUser(c.user.uid,n,e);const u=await getUser(c.user.uid);if(!u)throw new Error("No se pudo crear el perfil de cliente.");setAppUser(u);return u;}catch(err){await signOut(auth);throw err;}},
  reset:e=>sendPasswordResetEmail(auth,e.trim()),
  logout:()=>signOut(auth),
  refreshUser:async()=>{if(!auth.currentUser){setAppUser(null);return null;}const u=await getUser(auth.currentUser.uid);setAppUser(u);return u;}
 }),[firebaseUser,appUser,loading]);
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const c=useContext(AuthContext);if(!c)throw new Error("useAuth must be used inside AuthProvider");return c;}
