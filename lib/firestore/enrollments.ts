import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import type { Enrollment } from "@/types/enrollment";

export function enrollmentId(userId: string, courseId: string) {
  return `${userId}_${courseId}`;
}

export async function getEnrollment(userId: string, courseId: string) {
  const snap = await getDoc(doc(db, "enrollments", enrollmentId(userId, courseId)));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Enrollment) : null;
}

export async function getUserEnrollments(userId: string) {
  const snap = await getDocs(
    query(collection(db, "enrollments"), where("userId", "==", userId), where("active", "==", true))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Enrollment));
}

export async function getCourseEnrollments(courseId: string) {
  const snap = await getDocs(
    query(collection(db, "enrollments"), where("courseId", "==", courseId), where("active", "==", true))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Enrollment));
}

export async function setEnrollment(
  userId: string,
  courseId: string,
  enrolledBy: string,
  active = true
) {
  const id = enrollmentId(userId, courseId);
  await setDoc(doc(db, "enrollments", id), {
    userId,
    courseId,
    active,
    enrolledAt: serverTimestamp(),
    enrolledBy
  });
}

export async function deactivateEnrollment(userId: string, courseId: string) {
  await updateDoc(doc(db, "enrollments", enrollmentId(userId, courseId)), {
    active: false
  });
}
