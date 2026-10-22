import { db, requireUser } from "@/lib/data/session";
import { AppError, toAppError } from "@/lib/errors";
import type { Enrollment } from "@/types/course";

type EnrollmentRow = { id: string; user_id: string; course_id: string; enrolled_at: string; active: boolean };
type ProfileRow = { id: string; display_name: string | null; email: string | null };

const map = (r: EnrollmentRow): Enrollment => ({ id: r.id, userId: r.user_id, courseId: r.course_id, enrolledAt: r.enrolled_at, active: r.active });

/** The signed-in student's active enrollments. */
export async function listMyEnrollments(): Promise<Enrollment[]> {
  const user = await requireUser();
  const { data, error } = await db().from("cbdevs_course_enrollments")
    .select("id, user_id, course_id, enrolled_at, active")
    .eq("user_id", user.id).eq("active", true).order("enrolled_at", { ascending: false }).limit(200);
  if (error) throw toAppError(error, "No se pudieron cargar tus cursos.");
  return ((data ?? []) as EnrollmentRow[]).map(map);
}

export async function hasActiveEnrollment(courseId: string): Promise<boolean> {
  const user = await requireUser();
  const { data, error } = await db().from("cbdevs_course_enrollments")
    .select("id").eq("user_id", user.id).eq("course_id", courseId).eq("active", true).maybeSingle();
  if (error) throw toAppError(error, "No se pudo verificar tu inscripción.");
  return Boolean(data);
}

/** Staff: enroll an existing account by exact email (authorized and audited in the database). */
export async function enrollByEmail(courseId: string, email: string): Promise<void> {
  const value = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) || value.length > 254) throw new AppError("Escribe un correo válido.");
  const { error } = await db().rpc("cbdevs_enroll_course_student", { p_course_id: courseId, p_email: value });
  if (error) {
    throw toAppError(error, "No se pudo inscribir al alumno.", {
      P0002: "No hay ninguna cuenta registrada con ese correo. Pide al alumno que se registre primero.",
      "22023": "Escribe un correo válido.",
      "42501": "No tienes permiso para inscribir alumnos en este curso.",
    });
  }
}

export async function setEnrollmentActive(enrollmentId: string, active: boolean): Promise<void> {
  const { data, error } = await db().from("cbdevs_course_enrollments").update({ active }).eq("id", enrollmentId).select("id");
  if (error) throw toAppError(error, active ? "No se pudo reactivar la inscripción." : "No se pudo dar de baja la inscripción.");
  if (!data?.length) throw new AppError("No tienes permiso para modificar esta inscripción.", "42501");
}

export interface RosterEntry {
  enrollment: Enrollment;
  name: string;
  email: string;
  completed: number;
  total: number;
  percent: number;
  lastActivity?: string;
}

/**
 * Staff roster: enrollments with student names and progress, built with a fixed number of
 * queries (no per-student requests). RLS limits every table to the staff organization.
 */
export async function listRoster(options: { includeInactive?: boolean } = {}): Promise<RosterEntry[]> {
  let query = db().from("cbdevs_course_enrollments").select("id, user_id, course_id, enrolled_at, active").order("enrolled_at", { ascending: false }).limit(1000);
  if (!options.includeInactive) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) throw toAppError(error, "No se pudieron cargar las inscripciones.");
  const enrollments = ((data ?? []) as EnrollmentRow[]).map(map);
  if (!enrollments.length) return [];

  const userIds = [...new Set(enrollments.map((e) => e.userId))];
  const courseIds = [...new Set(enrollments.map((e) => e.courseId))];
  const [profiles, lessons, progress] = await Promise.all([
    db().from("profiles").select("id, display_name, email").in("id", userIds),
    db().from("cbdevs_course_lessons").select("id, course_id").in("course_id", courseIds).limit(5000),
    db().from("cbdevs_course_progress").select("user_id, course_id, lesson_id, completed, updated_at").in("course_id", courseIds).eq("completed", true).limit(10000),
  ]);
  if (profiles.error) throw toAppError(profiles.error, "No se pudieron cargar los alumnos.");
  if (lessons.error) throw toAppError(lessons.error, "No se pudo calcular el avance.");
  if (progress.error) throw toAppError(progress.error, "No se pudo calcular el avance.");

  const profileById = new Map(((profiles.data ?? []) as ProfileRow[]).map((p) => [p.id, p]));
  const lessonsByCourse = new Map<string, Set<string>>();
  for (const l of (lessons.data ?? []) as Array<{ id: string; course_id: string }>) {
    const set = lessonsByCourse.get(l.course_id) ?? new Set<string>();
    set.add(l.id);
    lessonsByCourse.set(l.course_id, set);
  }
  const doneByKey = new Map<string, { count: number; last?: string }>();
  for (const p of (progress.data ?? []) as Array<{ user_id: string; course_id: string; lesson_id: string; updated_at: string }>) {
    if (!lessonsByCourse.get(p.course_id)?.has(p.lesson_id)) continue;
    const key = `${p.user_id}:${p.course_id}`;
    const entry = doneByKey.get(key) ?? { count: 0 };
    entry.count += 1;
    if (!entry.last || p.updated_at > entry.last) entry.last = p.updated_at;
    doneByKey.set(key, entry);
  }

  return enrollments.map((enrollment) => {
    const profile = profileById.get(enrollment.userId);
    const total = lessonsByCourse.get(enrollment.courseId)?.size ?? 0;
    const done = doneByKey.get(`${enrollment.userId}:${enrollment.courseId}`);
    const completed = Math.min(done?.count ?? 0, total);
    return {
      enrollment,
      name: profile?.display_name?.trim() || profile?.email?.split("@")[0] || "Alumno",
      email: profile?.email ?? "",
      completed,
      total,
      percent: total ? Math.round((completed / total) * 100) : 0,
      lastActivity: done?.last,
    };
  });
}
