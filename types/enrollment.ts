export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  active: boolean;
  enrolledAt?: unknown;
  enrolledBy?: string;
}
