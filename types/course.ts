export type LessonBlockType =
  | "text"
  | "video"
  | "code"
  | "exercise"
  | "quiz"
  | "resource";

export interface Course {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnailUrl?: string | null;
  thumbnail?: string;
  published: boolean;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CoursePhase {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CourseLesson {
  id: string;
  courseId: string;
  phaseId: string;
  title: string;
  description?: string;
  order: number;
  published: boolean;
  blocks: LessonBlock[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

/** Legacy shape kept for compatibility with older routes. */
export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  order: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Lesson {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  content?: string;
  videoUrl?: string;
  order: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface LessonBlock {
  id: string;
  type: LessonBlockType;
  order: number;
  data: Record<string, unknown>;
}

export interface TextBlockData {
  content: string;
}

export interface VideoBlockData {
  title: string;
  description: string;
  url: string;
  provider: "youtube" | "vimeo" | "file";
}

export interface CodeBlockData {
  title: string;
  language: string;
  code: string;
}

export interface ExerciseBlockData {
  title: string;
  description: string;
  solutionEnabled: boolean;
  solutionReleased: boolean;
  solutionCode: string;
  solutionLanguage: string;
}

export interface QuizOption {
  id: string;
  text: string;
  correct: boolean;
  feedback: string;
}

export interface QuizBlockData {
  question: string;
  options: QuizOption[];
}

export interface ResourceBlockData {
  title: string;
  description: string;
  source: "upload" | "external";
  fileUrl: string;
  externalUrl: string;
  fileName: string;
}
