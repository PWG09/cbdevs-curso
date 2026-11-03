export type Role = "admin" | "empleado" | "cliente";
export type LessonBlockType = "text" | "video" | "code" | "exercise" | "quiz" | "download";

export interface Course {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  price: number;
  /** Either a storage object path inside the private bucket or an https URL. */
  thumbnail: string;
  /** Short-lived signed URL (or validated https URL) ready to render. */
  thumbnailUrl?: string;
  published: boolean;
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Phase {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
}

export interface Lesson {
  id: string;
  courseId: string;
  phaseId: string;
  title: string;
  description: string;
  order: number;
  blocks: LessonBlock[];
  updatedAt?: string;
}

/** Lesson metadata without blocks, used for outlines and navigation. */
export type LessonSummary = Omit<Lesson, "blocks"> & { blockCount?: number };

export interface TextBlockData { html: string }
export interface VideoBlockData { url: string; title: string; description: string; path?: string }
export interface CodeBlockData { language: string; code: string }
/** `solutionCode` exists only in the staff editor; it is stored separately and never in lesson blocks. */
export interface ExerciseBlockData { challenge: string; solutionReleased: boolean; solutionCode?: string }
export interface QuizBlockData { question: string; options: string[]; correct: number; feedback: string[] }
export interface DownloadBlockData { name: string; url: string; path: string }

export type LessonBlock =
  | { id: string; type: "text"; data: TextBlockData }
  | { id: string; type: "video"; data: VideoBlockData }
  | { id: string; type: "code"; data: CodeBlockData }
  | { id: string; type: "exercise"; data: ExerciseBlockData }
  | { id: string; type: "quiz"; data: QuizBlockData }
  | { id: string; type: "download"; data: DownloadBlockData };

export interface ExerciseSolution { id: string; code: string; released: boolean; updatedAt?: string }

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt?: string;
  organizationId?: string;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  enrolledAt?: string;
  active: boolean;
}

export interface Progress {
  id: string;
  userId: string;
  courseId: string;
  phaseId: string;
  lessonId: string;
  completed: boolean;
  completedAt?: string;
}

export interface CourseOutline {
  phases: Array<Phase & { lessons: LessonSummary[] }>;
}
