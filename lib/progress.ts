import type { CourseOutline, LessonSummary } from "@/types/course";

export interface FlatLesson extends LessonSummary { phaseTitle: string; index: number }

/** Lessons of a course in reading order (phase order, then lesson order). */
export function flattenOutline(outline: CourseOutline): FlatLesson[] {
  const out: FlatLesson[] = [];
  const phases = [...outline.phases].sort((a, b) => a.order - b.order);
  for (const phase of phases) {
    for (const lesson of [...phase.lessons].sort((a, b) => a.order - b.order)) {
      out.push({ ...lesson, phaseTitle: phase.title, index: out.length });
    }
  }
  return out;
}

export interface CourseProgressSummary {
  total: number;
  completed: number;
  percent: number;
  /** First lesson not yet completed, or null when the course is finished/empty. */
  next: FlatLesson | null;
}

export function summarizeProgress(outline: CourseOutline, completedLessonIds: Iterable<string>): CourseProgressSummary {
  const lessons = flattenOutline(outline);
  const done = new Set(completedLessonIds);
  const completed = lessons.filter((l) => done.has(l.id)).length;
  return {
    total: lessons.length,
    completed,
    percent: lessons.length ? Math.round((completed / lessons.length) * 100) : 0,
    next: lessons.find((l) => !done.has(l.id)) ?? null,
  };
}

export function neighbors(outline: CourseOutline, lessonId: string): { previous: FlatLesson | null; next: FlatLesson | null; position: number; total: number } {
  const lessons = flattenOutline(outline);
  const index = lessons.findIndex((l) => l.id === lessonId);
  return {
    previous: index > 0 ? lessons[index - 1] : null,
    next: index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null,
    position: index + 1,
    total: lessons.length,
  };
}

/** Next free sort_order for a list, robust to gaps left by deletions. */
export function nextSortOrder(items: Array<{ order: number }>): number {
  return items.reduce((max, item) => Math.max(max, item.order), -1) + 1;
}
