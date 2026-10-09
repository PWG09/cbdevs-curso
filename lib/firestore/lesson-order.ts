import { getSupabaseClient } from "@/lib/supabase/client";

export async function updateLessonOrder(courseId: string, phaseId: string, lessonId: string, order: number) {
  const { error } = await getSupabaseClient()
    .from("cbdevs_course_lessons")
    .update({ sort_order: order, updated_at: new Date().toISOString() })
    .eq("course_id", courseId)
    .eq("phase_id", phaseId)
    .eq("id", lessonId);
  if (error) throw new Error("No se pudo actualizar el orden de la lección.");
}
