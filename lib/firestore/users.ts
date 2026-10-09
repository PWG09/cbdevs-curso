import {getSupabaseClient,getCurrentOrganization} from "@/lib/supabase/client";import type {AppUser} from "@/types/course";
const db=()=>getSupabaseClient();
async function profile(uid:string):Promise<AppUser|null>{
 const {data:p,error}=await db().from("profiles").select("id,display_name,avatar_url,created_at").eq("id",uid).maybeSingle();if(error)throw error;if(!p)return null;
 const {data:memberships}=await db().from("organization_members").select("organization_id,role,status").eq("user_id",uid).eq("status","active");
 let role:AppUser["role"]="cliente",organizationId:string|undefined;
 for(const m of memberships||[]){const {data:app}=await db().from("organization_apps").select("enabled").eq("organization_id",m.organization_id).eq("app_key","courses").maybeSingle();if(app?.enabled&&["owner","admin","manager"].includes(m.role)){role=m.role==="owner"||m.role==="admin"?"admin":"empleado";organizationId=m.organization_id;break;}}
 if(!organizationId){const {data:e}=await db().from("cbdevs_course_enrollments").select("organization_id").eq("user_id",uid).eq("active",true).limit(1).maybeSingle();organizationId=e?.organization_id||undefined;}
 const {data:{user}}=await db().auth.getUser();
 return {id:p.id,name:p.display_name||user?.user_metadata?.display_name||user?.email||"Usuario",email:user?.id===uid?(user.email||""):"",role,active:true,createdAt:p.created_at,organizationId};
}
export async function getUser(uid:string):Promise<AppUser|null>{return profile(uid);}
export async function createClientUser(uid:string,name:string,email:string){const {data:{user},error:authError}=await db().auth.getUser();if(authError||!user||user.id!==uid)throw new Error("No puedes editar otro perfil.");const {error}=await db().from("profiles").update({display_name:name.trim()}).eq("id",uid);if(error)throw error;}
export async function listClients():Promise<AppUser[]>{
 const organizationId=await getCurrentOrganization("courses");
 const {data:enrollments,error}=await db().from("cbdevs_course_enrollments").select("user_id").eq("organization_id",organizationId).eq("active",true);if(error)throw error;
 const ids=[...new Set((enrollments||[]).map(r=>r.user_id))];if(!ids.length)return[];
 const {data:profiles,error:profileError}=await db().from("profiles").select("id,display_name,avatar_url,created_at").in("id",ids);if(profileError)throw profileError;
 return (profiles||[]).map(p=>({id:p.id,name:p.display_name||"Alumno",email:"",role:"cliente",active:true,createdAt:p.created_at,organizationId}));
}
