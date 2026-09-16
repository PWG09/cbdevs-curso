import {collection,doc,getDoc,getDocs,addDoc,updateDoc,deleteDoc,query,orderBy,serverTimestamp} from "firebase/firestore"; import {db} from "@/lib/firebase/client"; import type {Course,Phase,Lesson} from "@/types/course";
export async function listCourses(){const s=await getDocs(query(collection(db,"courses"),orderBy("title")));return s.docs.map(d=>({id:d.id,...d.data()} as Course))}
export async function getCourse(id:string){const s=await getDoc(doc(db,"courses",id));return s.exists()?({id:s.id,...s.data()} as Course):null}
export async function createCourse(data:Omit<Course,"id"|"createdAt"|"updatedAt">){return (await addDoc(collection(db,"courses"),{...data,createdAt:serverTimestamp(),updatedAt:serverTimestamp()})).id}
export async function updateCourse(id:string,data:Partial<Course>){await updateDoc(doc(db,"courses",id),{...data,updatedAt:serverTimestamp()})}
export async function deleteCourse(id:string){await deleteDoc(doc(db,"courses",id))}
export async function listPhases(courseId:string){const s=await getDocs(query(collection(db,"courses",courseId,"phases"),orderBy("order")));return s.docs.map(d=>({id:d.id,courseId,...d.data()} as Phase))}
export async function createPhase(courseId:string,data:Omit<Phase,"id"|"courseId">){return (await addDoc(collection(db,"courses",courseId,"phases"),data)).id}
export async function updatePhase(courseId:string,id:string,data:Partial<Phase>){await updateDoc(doc(db,"courses",courseId,"phases",id),data)}
export async function deletePhase(courseId:string,id:string){await deleteDoc(doc(db,"courses",courseId,"phases",id))}
export async function listLessons(courseId:string,phaseId:string){const s=await getDocs(query(collection(db,"courses",courseId,"phases",phaseId,"lessons"),orderBy("order")));return s.docs.map(d=>({id:d.id,courseId,phaseId,...d.data()} as Lesson))}
export async function createLesson(courseId:string,phaseId:string,data:Omit<Lesson,"id"|"courseId"|"phaseId">){return (await addDoc(collection(db,"courses",courseId,"phases",phaseId,"lessons"),data)).id}
export async function getLesson(courseId:string,phaseId:string,id:string){const s=await getDoc(doc(db,"courses",courseId,"phases",phaseId,"lessons",id));return s.exists()?({id:s.id,courseId,phaseId,...s.data()} as Lesson):null}
export async function saveLesson(courseId:string,phaseId:string,id:string,data:Partial<Lesson>){await updateDoc(doc(db,"courses",courseId,"phases",phaseId,"lessons",id),{...data,updatedAt:serverTimestamp()})}
export async function deleteLesson(courseId:string,phaseId:string,id:string){await deleteDoc(doc(db,"courses",courseId,"phases",phaseId,"lessons",id))}
