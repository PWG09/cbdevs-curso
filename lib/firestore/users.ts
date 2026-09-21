import { collection, doc, getDoc, getDocs, query, where, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { AppUser } from "@/types/course";

export async function getUser(uid:string):Promise<AppUser|null>{ const s=await getDoc(doc(db,"users",uid)); return s.exists()?({id:s.id,...s.data()} as AppUser):null; }
export async function createClientUser(uid:string,name:string,email:string){ await setDoc(doc(db,"users",uid),{id:uid,name:name.trim(),email:email.trim().toLowerCase(),role:"cliente",active:true,createdAt:serverTimestamp()}); }
export async function listClients():Promise<AppUser[]>{ const s=await getDocs(query(collection(db,"users"),where("role","==","cliente"))); return s.docs.map(d=>({id:d.id,...d.data()} as AppUser)); }
