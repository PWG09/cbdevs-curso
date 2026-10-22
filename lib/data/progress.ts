import { db, requireUser } from "@/lib/data/session";
import { toAppError } from "@/lib/errors";

/** IDs of lessons the signed-in student completed, grouped by course. */
export async function getMyCompletedLessons(courseIds: string[]): Promise<Map<string, Set<string>>> {
  const result = new Map<string, Set<string>>();
  if (!courseIds.length) return result;
  const user = await requireUser();
  const { data, error } = await db().from("cbdevs_course_progress")
    .select("course_id, lesson_id")
    .eq("user_id", user.id).eq("completed", true).in("course_id", courseIds).limit(5000);
  if (error) throw toAppError(error, "No se pudo cargar tu progreso.");
  for (const row of (data ?? []) as Array<{ course_id: string; lesson_id: string }>) {
    const set = result.get(row.course_id) ?? new Set<string>();
    set.add(row.lesson_id);
    result.set(row.course_id, set);
  }
  return result;
}

/**
 * Marks a lesson complete or incomplete for the signed-in user. The organization is taken
 * from the lesson row (readable only when enrolled); RLS re-validates enrollment and tenant.
 */
export async function setLessonCompleted(courseId: string, phaseId: string, lessonId: string, completed: boolean): Promise<void> {
  const user = await requireUser();
  const { data: lesson, error: lessonError } = await db().from("cbdevs_course_lessons")
    .select("organization_id").eq("id", lessonId).eq("course_id", courseId).eq("phase_id", phaseId).maybeSingle();
  if (lessonError || !lesson) throw toAppError(lessonError, "No se encontró la lección.");
  const now = new Date().toISOString();
  const { error } = await db().from("cbdevs_course_progress").upsert({
    organization_id: lesson.organization_id,
    course_id: courseId,
    phase_id: phaseId,
    lesson_id: lessonId,
    user_id: user.id,
    completed,
    completed_at: completed ? now : null,
    updated_at: now,
  }, { onConflict: "user_id,lesson_id" });
  if (error) throw toAppError(error, "No se pudo guardar tu progreso.");
}
