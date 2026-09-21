import {collection,doc,getDoc,getDocs,query,setDoc,serverTimestamp,where} from "firebase/firestore"; import {db} from "@/lib/firebase/client"; import type {Enrollment} from "@/types/course";
const id=(uid:string,courseId:string)=>`${uid}_${courseId}`;
export async function getEnrollment(uid:string,courseId:string){const s=await getDoc(doc(db,"enrollments",id(uid,courseId)));return s.exists()?({id:s.id,...s.data()} as Enrollment):null;}
export async function listUserEnrollments(uid:string){const s=await getDocs(query(collection(db,"enrollments"),where("userId","==",uid),where("active","==",true)));return s.docs.map(d=>({id:d.id,...d.data()} as Enrollment));}
export async function enrollUser(uid:string,courseId:string){await setDoc(doc(db,"enrollments",id(uid,courseId)),{userId:uid,courseId,active:true,enrolledAt:serverTimestamp()},{merge:true});}
export async function listEnrollments(courseId?:string){const q=courseId?query(collection(db,"enrollments"),where("courseId","==",courseId),where("active","==",true)):query(collection(db,"enrollments"),where("active","==",true));const s=await getDocs(q);return s.docs.map(d=>({id:d.id,...d.data()} as Enrollment));}
