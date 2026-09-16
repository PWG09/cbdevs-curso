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
import type { CourseModule } from "@/types/course";

export async function getModules(courseId: string) {
  const snap = await getDocs(
    query(
      collection(db, "modules"),
      where("courseId", "==", courseId),
      orderBy("order", "asc")
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CourseModule));
}

export async function createModule(input: Omit<CourseModule, "id" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(collection(db, "modules"), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateModule(id: string, input: Partial<CourseModule>) {
  await updateDoc(doc(db, "modules", id), {
    ...input,
    updatedAt: serverTimestamp()
  });
}

export async function deleteModule(id: string) {
  await deleteDoc(doc(db, "modules", id));
}
