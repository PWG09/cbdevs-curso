import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import type { Lesson } from "@/types/course";

export async function getLessons(moduleId: string) {
  const snap = await getDocs(
    query(
      collection(db, "lessons"),
      where("moduleId", "==", moduleId),
      orderBy("order", "asc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lesson));
}

export async function getLessonsByCourse(courseId: string) {
  const snap = await getDocs(
    query(collection(db, "lessons"), where("courseId", "==", courseId), orderBy("order", "asc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lesson));
}

export async function createLesson(input: Omit<Lesson, "id" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(collection(db, "lessons"), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateLesson(id: string, input: Partial<Lesson>) {
  await updateDoc(doc(db, "lessons", id), {
    ...input,
    updatedAt: serverTimestamp()
  });
}

export async function deleteLesson(id: string) {
  await deleteDoc(doc(db, "lessons", id));
}
