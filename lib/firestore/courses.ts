import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client"; import type {Course,ExerciseSolution,Lesson,LessonBlock,Phase} from "@/types/course";
const courseRef=(id:string)=>doc(db,"courses",id); const phasesRef=(id:string)=>collection(db,"courses",id,"phases");
export async function listCourses(){const s=await getDocs(query(collection(db,"courses"),orderBy("title")));return s.docs.map(d=>({id:d.id,...d.data()} as Course));}
export async function getCourse(id:string){const s=await getDoc(courseRef(id));return s.exists()?({id:s.id,...s.data()} as Course):null;}
export async function createCourse(data:Omit<Course,"id"|"createdAt"|"updatedAt">){const clean={title:data.title.trim(),description:data.description?.trim()||"",price:Number.isFinite(data.price)?data.price:0,thumbnail:data.thumbnail||"",published:Boolean(data.published),createdBy:data.createdBy};return (await addDoc(collection(db,"courses"),{...clean,createdAt:serverTimestamp(),updatedAt:serverTimestamp()})).id;}
export async function updateCourse(id:string,data:Partial<Course>){await updateDoc(courseRef(id),{...data,updatedAt:serverTimestamp()});}
export async function deleteCourse(id:string){
  const phases=await getDocs(phasesRef(id));
  for(const ph of phases.docs){
    const lessons=await getDocs(collection(ph.ref,"lessons"));
    for(const lesson of lessons.docs){
      const solutions=await getDocs(collection(lesson.ref,"solutions"));
      for(const sol of solutions.docs) await deleteDoc(sol.ref);
      await deleteDoc(lesson.ref);
    }
    await deleteDoc(ph.ref);
  }
  await deleteDoc(courseRef(id));
}
export async function listPhases(courseId:string){const s=await getDocs(query(phasesRef(courseId),orderBy("order")));return s.docs.map(d=>({id:d.id,courseId,...d.data()} as Phase));}
export async function createPhase(courseId:string,data:Omit<Phase,"id"|"courseId">){return (await addDoc(phasesRef(courseId),{...data,title:data.title.trim(),description:data.description?.trim()||""})).id;}
export async function updatePhase(courseId:string,id:string,data:Partial<Phase>){await updateDoc(doc(db,"courses",courseId,"phases",id),data);}
export async function deletePhase(courseId:string,id:string){
  const phaseRef=doc(db,"courses",courseId,"phases",id); const lessons=await getDocs(collection(phaseRef,"lessons"));
  for(const lesson of lessons.docs){const solutions=await getDocs(collection(lesson.ref,"solutions"));for(const sol of solutions.docs)await deleteDoc(sol.ref);await deleteDoc(lesson.ref);}
  await deleteDoc(phaseRef);
}
export async function listLessons(courseId:string,phaseId:string){const s=await getDocs(query(collection(db,"courses",courseId,"phases",phaseId,"lessons"),orderBy("order")));return s.docs.map(d=>({id:d.id,courseId,phaseId,...d.data()} as Lesson));}
export async function createLesson(courseId:string,phaseId:string,data:Omit<Lesson,"id"|"courseId"|"phaseId">){return (await addDoc(collection(db,"courses",courseId,"phases",phaseId,"lessons"),{...data,title:data.title.trim(),description:data.description?.trim()||"",blocks:data.blocks||[],updatedAt:serverTimestamp()})).id;}
export async function getLesson(courseId:string,phaseId:string,id:string){const s=await getDoc(doc(db,"courses",courseId,"phases",phaseId,"lessons",id));return s.exists()?({id:s.id,courseId,phaseId,...s.data()} as Lesson):null;}
export async function saveLesson(courseId:string,phaseId:string,id:string,data:Partial<Lesson>){await updateDoc(doc(db,"courses",courseId,"phases",phaseId,"lessons",id),{...data,updatedAt:serverTimestamp()});}
export async function deleteLesson(courseId:string,phaseId:string,id:string){const r=doc(db,"courses",courseId,"phases",phaseId,"lessons",id);const sols=await getDocs(collection(r,"solutions"));for(const sol of sols.docs)await deleteDoc(sol.ref);await deleteDoc(r);}
const solutionsRef=(courseId:string,phaseId:string,lessonId:string)=>collection(db,"courses",courseId,"phases",phaseId,"lessons",lessonId,"solutions");
export async function getExerciseSolutions(courseId:string,phaseId:string,lessonId:string){const s=await getDocs(solutionsRef(courseId,phaseId,lessonId));return Object.fromEntries(s.docs.map(d=>[d.id,{id:d.id,...d.data()} as ExerciseSolution]));}
export async function getExerciseSolution(courseId:string,phaseId:string,lessonId:string,blockId:string){const s=await getDoc(doc(solutionsRef(courseId,phaseId,lessonId),blockId));return s.exists()?({id:s.id,...s.data()} as ExerciseSolution):null;}
export async function saveExerciseSolution(courseId:string,phaseId:string,lessonId:string,blockId:string,code:string,released:boolean){await setDoc(doc(solutionsRef(courseId,phaseId,lessonId),blockId),{code,released,updatedAt:serverTimestamp()},{merge:true});}
