import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import type { Course } from "@/types/course";

export async function getCourse(courseId: string) {
  const snap = await getDoc(doc(db, "courses", courseId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Course;
}

export async function getAllCourses() {
  const snap = await getDocs(query(collection(db, "courses"), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course));
}

export async function getEmployeeCourses(uid: string) {
  const snap = await getDocs(
    query(collection(db, "courses"), where("createdBy", "==", uid), orderBy("createdAt", "desc"))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Course));
}

export async function createCourse(input: Omit<Course, "id" | "createdAt" | "updatedAt">) {
  const ref = await addDoc(collection(db, "courses"), {
    ...input,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}

export async function updateCourse(courseId: string, input: Partial<Course>) {
  await updateDoc(doc(db, "courses", courseId), {
    ...input,
    updatedAt: serverTimestamp()
  });
}

export async function deleteCourse(courseId: string) {
  await deleteDoc(doc(db, "courses", courseId));
}
