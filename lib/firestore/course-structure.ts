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
  writeBatch,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import type { CourseLesson, CoursePhase, LessonBlock } from "@/types/course";

export async function getPhases(courseId: string): Promise<CoursePhase[]> {
  const snap = await getDocs(
    query(collection(db, "courses", courseId, "phases"), orderBy("order", "asc"))
  );
  return snap.docs.map((d) => ({ id: d.id, courseId, ...d.data() } as CoursePhase));
}

export async function createPhase(courseId: string, title: string, description = "", order = 0) {
  const ref = await addDoc(collection(db, "courses", courseId, "phases"), {
    title,
    description,
    order,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePhase(courseId: string, phaseId: string, data: Partial<CoursePhase>) {
  await updateDoc(doc(db, "courses", courseId, "phases", phaseId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePhase(courseId: string, phaseId: string) {
  const phaseRef = doc(db, "courses", courseId, "phases", phaseId);
  const lessons = await getDocs(collection(phaseRef, "lessons"));
  const batch = writeBatch(db);
  lessons.docs.forEach((lesson) => batch.delete(lesson.ref));
  batch.delete(phaseRef);
  await batch.commit();
}

export async function reorderPhases(courseId: string, phases: CoursePhase[]) {
  const batch = writeBatch(db);
  phases.forEach((phase, index) => {
    batch.update(doc(db, "courses", courseId, "phases", phase.id), {
      order: index,
      updatedAt: serverTimestamp(),
    });
  });
  await batch.commit();
}

export async function getLessons(courseId: string, phaseId: string): Promise<CourseLesson[]> {
  const snap = await getDocs(
    query(
      collection(db, "courses", courseId, "phases", phaseId, "lessons"),
      orderBy("order", "asc")
    )
  );
  return snap.docs.map((d) => ({
    id: d.id,
    courseId,
    phaseId,
    ...d.data(),
  } as CourseLesson));
}

export async function getPublishedLessons(courseId: string, phaseId: string): Promise<CourseLesson[]> {
  const snap = await getDocs(
    query(
      collection(db, "courses", courseId, "phases", phaseId, "lessons"),
      where("published", "==", true),
      orderBy("order", "asc")
    )
  );
  return snap.docs.map((d) => ({
    id: d.id,
    courseId,
    phaseId,
    ...d.data(),
  } as CourseLesson));
}

export async function getLesson(courseId: string, phaseId: string, lessonId: string) {
  const snap = await getDoc(doc(db, "courses", courseId, "phases", phaseId, "lessons", lessonId));
  if (!snap.exists()) return null;
  return { id: snap.id, courseId, phaseId, ...snap.data() } as CourseLesson;
}

export async function createLesson(
  courseId: string,
  phaseId: string,
  title: string,
  description = "",
  order = 0
) {
  const ref = await addDoc(
    collection(db, "courses", courseId, "phases", phaseId, "lessons"),
    {
      title,
      description,
      order,
      published: false,
      blocks: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );
  return ref.id;
}

export async function updateLesson(
  courseId: string,
  phaseId: string,
  lessonId: string,
  data: Partial<CourseLesson>
) {
  await updateDoc(
    doc(db, "courses", courseId, "phases", phaseId, "lessons", lessonId),
    {
      ...data,
      updatedAt: serverTimestamp(),
    }
  );
}

export async function deleteLesson(courseId: string, phaseId: string, lessonId: string) {
  await deleteDoc(doc(db, "courses", courseId, "phases", phaseId, "lessons", lessonId));
}

export async function saveLessonBlocks(
  courseId: string,
  phaseId: string,
  lessonId: string,
  blocks: LessonBlock[]
) {
  await updateLesson(courseId, phaseId, lessonId, { blocks });
}
