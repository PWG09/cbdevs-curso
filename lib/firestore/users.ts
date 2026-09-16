import {doc,getDoc,setDoc,serverTimestamp} from "firebase/firestore"; import {db} from "@/lib/firebase/client"; import type {AppUser} from "@/types/course";
export async function getUser(uid:string){const s=await getDoc(doc(db,"users",uid)); return s.exists()?({id:s.id,...s.data()} as AppUser):null}
export async function createClientUser(uid:string,name:string,email:string){await setDoc(doc(db,"users",uid),{id:uid,name,email,role:"cliente",active:true,createdAt:serverTimestamp()})}
