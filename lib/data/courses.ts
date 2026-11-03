import { db, requireStaffOrganization, requireUser } from "@/lib/data/session";
import { signAssetPaths } from "@/lib/data/storage";
import { AppError, toAppError } from "@/lib/errors";
import { normalizeBlocks, toPublicBlocks } from "@/lib/blocks";
import { isStorageObjectPath, safeExternalUrl } from "@/lib/safe-url";
import type { Course, CourseOutline, ExerciseSolution, Lesson, LessonBlock, LessonSummary, Phase } from "@/types/course";

type CourseRow = { id: string; organization_id: string; title: string; description: string | null; price: number | string | null; thumbnail: string | null; published: boolean; created_by: string; created_at: string; updated_at: string };
type PhaseRow = { id: string; course_id: string; title: string; description: string | null; sort_order: number };
type LessonRow = { id: string; course_id: string; phase_id: string; title: string; description: string | null; sort_order: number; blocks?: unknown; updated_at: string };
type SolutionRow = { block_id: string; code: string; released: boolean; updated_at: string };

const COURSE_COLUMNS = "id, organization_id, title, description, price, thumbnail, published, created_by, created_at, updated_at";

function mapCourse(r: CourseRow): Course {
  return {
    id: r.id,
    organizationId: r.organization_id,
    title: r.title,
    description: r.description ?? "",
    price: Number(r.price) || 0,
    thumbnail: r.thumbnail ?? "",
    published: Boolean(r.published),
    createdBy: r.created_by,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const mapPhase = (r: PhaseRow): Phase => ({ id: r.id, courseId: r.course_id, title: r.title, description: r.description ?? "", order: r.sort_order });

function mapLessonSummary(r: LessonRow): LessonSummary {
  return { id: r.id, courseId: r.course_id, phaseId: r.phase_id, title: r.title, description: r.description ?? "", order: r.sort_order, updatedAt: r.updated_at, blockCount: Array.isArray(r.blocks) ? r.blocks.length : undefined };
}

async function withThumbnails(courses: Course[]): Promise<Course[]> {
  const signed = await signAssetPaths(courses.map((c) => c.thumbnail).filter(isStorageObjectPath));
  return courses.map((c) => ({ ...c, thumbnailUrl: isStorageObjectPath(c.thumbnail) ? signed.get(c.thumbnail) : safeExternalUrl(c.thumbnail) }));
}

function cleanTitle(value: string, label: string, max = 200): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) throw new AppError(`${label} es obligatorio.`);
  if (trimmed.length > max) throw new AppError(`${label} admite como máximo ${max} caracteres.`);
  return trimmed;
}

function cleanPrice(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 9_999_999) throw new AppError("El precio debe ser un número entre 0 y 9,999,999.");
  return Math.round(value * 100) / 100;
}

// ---------------------------------------------------------------- courses

/** Courses visible to the viewer: staff see their organization's; students only enrolled + published. */
export async function listCourses(): Promise<Course[]> {
  const { data, error } = await db().from("cbdevs_courses").select(COURSE_COLUMNS).order("updated_at", { ascending: false }).limit(200);
  if (error) throw toAppError(error, "No se pudieron cargar los cursos.");
  return withThumbnails(((data ?? []) as CourseRow[]).map(mapCourse));
}

export async function getCourse(id: string): Promise<Course | null> {
  const { data, error } = await db().from("cbdevs_courses").select(COURSE_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw toAppError(error, "No se pudo cargar el curso.");
  return data ? (await withThumbnails([mapCourse(data as CourseRow)]))[0] : null;
}

export async function getCoursesByIds(ids: string[]): Promise<Course[]> {
  if (!ids.length) return [];
  const { data, error } = await db().from("cbdevs_courses").select(COURSE_COLUMNS).in("id", ids);
  if (error) throw toAppError(error, "No se pudieron cargar los cursos.");
  return withThumbnails(((data ?? []) as CourseRow[]).map(mapCourse));
}

export async function createCourse(input: { title: string; description: string; price: number; published: boolean }): Promise<string> {
  const user = await requireUser();
  const organization_id = await requireStaffOrganization();
  const { data, error } = await db().from("cbdevs_courses").insert({
    organization_id,
    title: cleanTitle(input.title, "El título"),
    description: input.description.trim().slice(0, 5000),
    price: cleanPrice(input.price),
    published: input.published,
    created_by: user.id,
  }).select("id").single();
  if (error || !data) throw toAppError(error, "No se pudo crear el curso.");
  return data.id as string;
}

export async function updateCourse(id: string, patch: Partial<Pick<Course, "title" | "description" | "price" | "thumbnail" | "published">>): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = cleanTitle(patch.title, "El título");
  if (patch.description !== undefined) row.description = patch.description.trim().slice(0, 5000);
  if (patch.price !== undefined) row.price = cleanPrice(patch.price);
  if (patch.published !== undefined) row.published = patch.published;
  if (patch.thumbnail !== undefined) {
    if (patch.thumbnail && !isStorageObjectPath(patch.thumbnail) && !safeExternalUrl(patch.thumbnail)) throw new AppError("La portada no es válida.");
    row.thumbnail = patch.thumbnail || null;
  }
  const { data, error } = await db().from("cbdevs_courses").update(row).eq("id", id).select("id");
  if (error) throw toAppError(error, "No se pudo guardar el curso.");
  if (!data?.length) throw new AppError("No tienes permiso para editar este curso.", "42501");
}

export async function deleteCourse(id: string): Promise<void> {
  const { data, error } = await db().from("cbdevs_courses").delete().eq("id", id).select("id");
  if (error) throw toAppError(error, "No se pudo eliminar el curso.");
  if (!data?.length) throw new AppError("Solo un administrador puede eliminar cursos.", "42501");
}

// ---------------------------------------------------------------- outline

/**
 * Phases with their lessons (metadata only) in one round trip per table.
 * `includeBlockCounts` fetches lesson blocks too (staff views) to show how much content each has.
 */
export async function getCourseOutline(courseId: string, includeBlockCounts = false): Promise<CourseOutline> {
  const [phaseResult, lessonResult] = await Promise.all([
    db().from("cbdevs_course_phases").select("id, course_id, title, description, sort_order").eq("course_id", courseId).order("sort_order").limit(200),
    db().from("cbdevs_course_lessons")
      .select(includeBlockCounts ? "id, course_id, phase_id, title, description, sort_order, updated_at, blocks" : "id, course_id, phase_id, title, description, sort_order, updated_at")
      .eq("course_id", courseId).order("sort_order").limit(2000),
  ]);
  if (phaseResult.error) throw toAppError(phaseResult.error, "No se pudo cargar el temario.");
  if (lessonResult.error) throw toAppError(lessonResult.error, "No se pudieron cargar las lecciones.");
  const lessons = ((lessonResult.data ?? []) as unknown as LessonRow[]).map(mapLessonSummary);
  return {
    phases: ((phaseResult.data ?? []) as PhaseRow[]).map((p) => ({ ...mapPhase(p), lessons: lessons.filter((l) => l.phaseId === p.id) })),
  };
}

export async function createPhase(courseId: string, input: { title: string; description: string; order: number }): Promise<string> {
  const course = await getCourse(courseId);
  if (!course) throw new AppError("Curso no encontrado.");
  const { data, error } = await db().from("cbdevs_course_phases").insert({
    organization_id: course.organizationId,
    course_id: courseId,
    title: cleanTitle(input.title, "El título de la fase"),
    description: input.description.trim().slice(0, 2000),
    sort_order: input.order,
  }).select("id").single();
  if (error || !data) throw toAppError(error, "No se pudo crear la fase.", { "23505": "Otra persona modificó el temario. Recarga e inténtalo de nuevo." });
  return data.id as string;
}

export async function updatePhase(courseId: string, id: string, patch: { title?: string; description?: string }): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = cleanTitle(patch.title, "El título de la fase");
  if (patch.description !== undefined) row.description = patch.description.trim().slice(0, 2000);
  const { error } = await db().from("cbdevs_course_phases").update(row).eq("id", id).eq("course_id", courseId);
  if (error) throw toAppError(error, "No se pudo actualizar la fase.");
}

export async function deletePhase(courseId: string, id: string): Promise<void> {
  const { data, error } = await db().from("cbdevs_course_phases").delete().eq("id", id).eq("course_id", courseId).select("id");
  if (error) throw toAppError(error, "No se pudo eliminar la fase.");
  if (!data?.length) throw new AppError("Solo un administrador puede eliminar fases.", "42501");
}

/** Swaps two phases or lessons atomically (database RPC that respects RLS). */
export async function swapOrder(kind: "phase" | "lesson", first: string, second: string): Promise<void> {
  const { error } = await db().rpc("cbdevs_swap_course_item_order", { p_kind: kind, p_first: first, p_second: second });
  if (error) throw toAppError(error, "No se pudo cambiar el orden.");
}

// ---------------------------------------------------------------- lessons

export async function createLesson(courseId: string, phaseId: string, input: { title: string; description: string; order: number }): Promise<string> {
  const course = await getCourse(courseId);
  if (!course) throw new AppError("Curso no encontrado.");
  const { data, error } = await db().from("cbdevs_course_lessons").insert({
    organization_id: course.organizationId,
    course_id: courseId,
    phase_id: phaseId,
    title: cleanTitle(input.title, "El título de la lección"),
    description: input.description.trim().slice(0, 2000),
    sort_order: input.order,
    blocks: [],
  }).select("id").single();
  if (error || !data) throw toAppError(error, "No se pudo crear la lección.", { "23505": "Otra persona modificó esta fase. Recarga e inténtalo de nuevo." });
  return data.id as string;
}

export async function getLesson(courseId: string, phaseId: string, id: string): Promise<Lesson | null> {
  const { data, error } = await db().from("cbdevs_course_lessons")
    .select("id, course_id, phase_id, title, description, sort_order, blocks, updated_at")
    .eq("id", id).eq("course_id", courseId).eq("phase_id", phaseId).maybeSingle();
  if (error) throw toAppError(error, "No se pudo cargar la lección.");
  if (!data) return null;
  const row = data as LessonRow;
  return { ...mapLessonSummary(row), blocks: normalizeBlocks(row.blocks) };
}

export async function saveLesson(courseId: string, phaseId: string, id: string, patch: { title?: string; description?: string; blocks?: LessonBlock[] }): Promise<void> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.title !== undefined) row.title = cleanTitle(patch.title, "El título de la lección");
  if (patch.description !== undefined) row.description = patch.description.trim().slice(0, 2000);
  // Solutions never go into the student-readable blocks column.
  if (patch.blocks !== undefined) row.blocks = toPublicBlocks(patch.blocks);
  const { data, error } = await db().from("cbdevs_course_lessons").update(row).eq("id", id).eq("course_id", courseId).eq("phase_id", phaseId).select("id");
  if (error) throw toAppError(error, "No se pudo guardar la lección.");
  if (!data?.length) throw new AppError("No tienes permiso para editar esta lección.", "42501");
}

export async function updateLessonMeta(courseId: string, phaseId: string, id: string, patch: { title?: string; description?: string }): Promise<void> {
  return saveLesson(courseId, phaseId, id, patch);
}

export async function deleteLesson(courseId: string, phaseId: string, id: string): Promise<void> {
  const { data, error } = await db().from("cbdevs_course_lessons").delete().eq("id", id).eq("course_id", courseId).eq("phase_id", phaseId).select("id");
  if (error) throw toAppError(error, "No se pudo eliminar la lección.");
  if (!data?.length) throw new AppError("Solo un administrador puede eliminar lecciones.", "42501");
}

// ---------------------------------------------------------------- exercise solutions

/** Staff get every solution; students only receive rows marked released (enforced by RLS). */
export async function getExerciseSolutions(courseId: string, phaseId: string, lessonId: string): Promise<Record<string, ExerciseSolution>> {
  const { data, error } = await db().from("cbdevs_exercise_solutions")
    .select("block_id, code, released, updated_at")
    .eq("course_id", courseId).eq("phase_id", phaseId).eq("lesson_id", lessonId).limit(200);
  if (error) throw toAppError(error, "No se pudieron cargar las soluciones.");
  return Object.fromEntries(((data ?? []) as SolutionRow[]).map((r) => [r.block_id, { id: r.block_id, code: r.code, released: r.released, updatedAt: r.updated_at }]));
}

/** `organizationId` must be the course's organization; RLS rejects any mismatch. */
export async function saveExerciseSolution(organizationId: string, courseId: string, phaseId: string, lessonId: string, blockId: string, code: string, released: boolean): Promise<void> {
  const user = await requireUser();
  const { error } = await db().from("cbdevs_exercise_solutions").upsert({
    organization_id: organizationId,
    course_id: courseId,
    phase_id: phaseId,
    lesson_id: lessonId,
    block_id: blockId.slice(0, 100),
    code: code.slice(0, 100_000),
    released,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }, { onConflict: "lesson_id,block_id" });
  if (error) throw toAppError(error, "No se pudo guardar la solución del ejercicio.");
}
