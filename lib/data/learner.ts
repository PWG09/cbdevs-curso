import { getCourseOutline, getCoursesByIds } from "@/lib/data/courses";
import { hasActiveEnrollment, listMyEnrollments } from "@/lib/data/enrollments";
import { getMyCompletedLessons } from "@/lib/data/progress";
import { summarizeProgress, type CourseProgressSummary } from "@/lib/progress";
import type { Course, CourseOutline } from "@/types/course";

export interface LearnerCourse { course: Course; outline: CourseOutline; progress: CourseProgressSummary; completed: Set<string> }

/** The student's enrolled, published courses with outline and progress (a fixed number of queries per course). */
export async function loadMyCourses(): Promise<LearnerCourse[]> {
  const enrollments = await listMyEnrollments();
  const courseIds = enrollments.map((e) => e.courseId);
  const [courses, completedByCourse] = await Promise.all([getCoursesByIds(courseIds), getMyCompletedLessons(courseIds)]);
  const published = courses.filter((c) => c.published);
  const outlines = await Promise.all(published.map((c) => getCourseOutline(c.id)));
  const order = new Map(courseIds.map((id, i) => [id, i]));
  return published
    .map((course, i) => {
      const completed = completedByCourse.get(course.id) ?? new Set<string>();
      return { course, outline: outlines[i], completed, progress: summarizeProgress(outlines[i], completed) };
    })
    .sort((a, b) => (order.get(a.course.id) ?? 0) - (order.get(b.course.id) ?? 0));
}

export type LearnerCourseResult = { status: "ok"; data: LearnerCourse } | { status: "not-enrolled" | "unavailable" };

export async function loadMyCourse(courseId: string): Promise<LearnerCourseResult> {
  if (!(await hasActiveEnrollment(courseId))) return { status: "not-enrolled" };
  const [courses, completedByCourse] = await Promise.all([getCoursesByIds([courseId]), getMyCompletedLessons([courseId])]);
  const course = courses[0];
  // RLS hides unpublished courses from students even when enrolled.
  if (!course || !course.published) return { status: "unavailable" };
  const outline = await getCourseOutline(courseId);
  const completed = completedByCourse.get(courseId) ?? new Set<string>();
  return { status: "ok", data: { course, outline, completed, progress: summarizeProgress(outline, completed) } };
}
