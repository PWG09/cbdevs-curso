"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { AppUser } from "@/types/course";

type CompatUser = User & { uid: string };
type C = {
  firebaseUser: CompatUser | null;
  appUser: AppUser | null;
  loading: boolean;
  login: (email:string,password:string)=>Promise<AppUser>;
  loginGoogle: ()=>Promise<void>;
  register: (name:string,email:string,password:string)=>Promise<AppUser>;
  reset: (email:string)=>Promise<void>;
  logout: ()=>Promise<void>;
  refreshUser: ()=>Promise<AppUser|null>;
};
const AuthContext=createContext<C|null>(null);

async function resolveUser(user:User, nameOverride=""):Promise<AppUser> {
  const supabase=getSupabaseClient();
  const {data:profile,error:profileError}=await supabase.from("profiles").select("id,display_name,avatar_url,created_at").eq("id",user.id).maybeSingle();
  if(profileError) throw new Error("No se pudo verificar tu perfil en la base central.");
  if(!profile) throw new Error("Tu perfil no está listo. Cierra sesión e inténtalo de nuevo.");

  const {data:memberships,error:membershipError}=await supabase.from("organization_members").select("organization_id,role,status").eq("user_id",user.id).eq("status","active");
  if(membershipError) throw new Error("No se pudieron verificar tus permisos.");
  let role:AppUser["role"]="cliente";
  let organizationId:string|undefined;
  for(const membership of memberships||[]){
    const {data:app}=await supabase.from("organization_apps").select("enabled").eq("organization_id",membership.organization_id).eq("app_key","courses").maybeSingle();
    if(app?.enabled && ["owner","admin","manager"].includes(membership.role)){
      role=membership.role==="owner"||membership.role==="admin"?"admin":"empleado";
      organizationId=membership.organization_id;
      break;
    }
  }
  if(!organizationId){
    const {data:enrollment}=await supabase.from("cbdevs_course_enrollments").select("organization_id").eq("user_id",user.id).eq("active",true).limit(1).maybeSingle();
    organizationId=enrollment?.organization_id||undefined;
  }
  return {id:user.id,name:nameOverride||profile.display_name||String(user.user_metadata?.name||user.email||"Usuario"),email:user.email||"",role,active:true,createdAt:profile.created_at,organizationId};
}

export function AuthProvider({children}:{children:ReactNode}){
 const [firebaseUser,setFirebaseUser]=useState<CompatUser|null>(null);
 const [appUser,setAppUser]=useState<AppUser|null>(null);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  let mounted=true;
  const supabase=getSupabaseClient();
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
    const user=session?.user||null;
    if(!mounted)return;
    setFirebaseUser(user ? Object.assign(user, { uid: user.id }) : null);
    if(!user){setAppUser(null);setLoading(false);return;}
    setLoading(true);
    queueMicrotask(()=>resolveUser(user).then(p=>{if(mounted)setAppUser(p)}).catch(()=>{if(mounted)setAppUser(null)}).finally(()=>{if(mounted)setLoading(false)}));
  });
  void supabase.auth.getUser().then(({data:{user}})=>{
    if(!mounted)return;
    if(user){setFirebaseUser(Object.assign(user, { uid: user.id }));void resolveUser(user).then(setAppUser).catch(()=>setAppUser(null)).finally(()=>setLoading(false))}
    else setLoading(false);
  });
  return()=>{mounted=false;subscription.unsubscribe()};
 },[]);
 const value=useMemo<C>(()=>({
  firebaseUser,appUser,loading,
  login:async(email,password)=>{
   const supabase=getSupabaseClient();
   const {data,error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
   if(error||!data.user)throw new Error("Correo o contraseña incorrectos.");
   const p=await resolveUser(data.user);setAppUser(p);return p;
  },
  loginGoogle:async()=>{
   const supabase=getSupabaseClient();
   const {error}=await supabase.auth.signInWithOAuth({provider:"google",options:{redirectTo:typeof window!=="undefined"?window.location.origin+"/my-courses":undefined}});
   if(error)throw new Error("No se pudo iniciar sesión con Google. Revisa la configuración del proveedor en Supabase.");
  },
  register:async(name,email,password)=>{
   const supabase=getSupabaseClient();
   const {data,error}=await supabase.auth.signUp({email:email.trim().toLowerCase(),password,options:{data:{display_name:name.trim(),name:name.trim()}}});
   if(error||!data.user)throw new Error(error?.message||"No se pudo crear la cuenta.");
   if(!data.session)throw new Error("Cuenta creada. Revisa tu correo y confirma la cuenta antes de iniciar sesión.");
   const {error:profileError}=await supabase.from("profiles").update({display_name:name.trim()}).eq("id",data.user.id);
   if(profileError)throw new Error("La cuenta se creó, pero el perfil no se pudo completar. Intenta iniciar sesión o restablecer la contraseña.");
   const p=await resolveUser(data.user,name.trim());setAppUser(p);return p;
  },
  reset:async(email)=>{
   const supabase=getSupabaseClient();
   const {error}=await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:typeof window!=="undefined"?window.location.origin+"/reset":undefined});
   if(error)throw new Error("No se pudo enviar el correo de restablecimiento.");
  },
  logout:async()=>{const {error}=await getSupabaseClient().auth.signOut();if(error)throw error;setAppUser(null)},
  refreshUser:async()=>{const {data:{user}}=await getSupabaseClient().auth.getUser();if(!user){setAppUser(null);return null;}const p=await resolveUser(user);setAppUser(p);return p}
 }),[firebaseUser,appUser,loading]);
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const c=useContext(AuthContext);if(!c)throw new Error("useAuth must be used inside AuthProvider");return c;}
