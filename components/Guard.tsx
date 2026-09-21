"use client";
import { useEffect } from "react";
import { usePathname,useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth";
import type { Role } from "@/types/course";
export default function Guard({children,roles}:{children:React.ReactNode;roles?:Role[]}){
 const {loading,appUser}=useAuth(); const r=useRouter(); const path=usePathname();
 useEffect(()=>{if(loading)return;if(!appUser){if(path!=="/login"&&path!=="/register"&&path!=="/reset")r.replace("/login");return;} if(roles&&!roles.includes(appUser.role))r.replace(appUser.role==="cliente"?"/my-courses":"/courses");},[loading,appUser,roles,r,path]);
 if(loading)return <main className="shell"><div className="card"><p className="muted">Verificando sesión…</p></div></main>;
 if(!appUser)return null;
 return <>{children}</>;
}
