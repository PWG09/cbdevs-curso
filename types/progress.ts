export interface LessonProgress {
  id: string;
  userId: string;
  courseId: string;
  phaseId: string;
  lessonId: string;
  completed: boolean;
  completedAt?: unknown;
  updatedAt?: unknown;
}
