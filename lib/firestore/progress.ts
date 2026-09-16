import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import type { LessonProgress } from "@/types/progress";

export async function getLessonProgress(
  userId: string,
  lessonId: string
): Promise<LessonProgress | null> {
  const snap = await getDoc(doc(db, "progress", `${userId}_${lessonId}`));
  if (!snap.exists()) return null;

  return {
    id: snap.id,
    ...snap.data(),
  } as LessonProgress;
}

export async function setLessonCompleted(
  userId: string,
  courseId: string,
  phaseId: string,
  lessonId: string,
  completed: boolean
): Promise<void> {
  await setDoc(
    doc(db, "progress", `${userId}_${lessonId}`),
    {
      userId,
      courseId,
      phaseId,
      lessonId,
      completed,
      completedAt: completed ? serverTimestamp() : null,
    },
    { merge: true }
  );
}

export async function getCourseProgress(
  userId: string,
  courseId: string
): Promise<LessonProgress[]> {
  const snap = await getDocs(
    query(
      collection(db, "progress"),
      where("userId", "==", userId),
      where("courseId", "==", courseId)
    )
  );

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as LessonProgress[];
}
