export type Role = "admin" | "empleado" | "cliente";
export type LessonBlockType = "text" | "video" | "code" | "exercise" | "quiz" | "download";
export interface Course { id:string; title:string; description:string; price:number; thumbnail?:string; published:boolean; createdBy:string; createdAt?:unknown; updatedAt?:unknown }
export interface Phase { id:string; courseId:string; title:string; description:string; order:number }
export interface Lesson { id:string; courseId:string; phaseId:string; title:string; description?:string; order:number; blocks:LessonBlock[]; updatedAt?:unknown }
export interface LessonBlock { id:string; type:LessonBlockType; data:Record<string, unknown> }
export interface AppUser { id:string; name:string; email:string; role:Role; active:boolean; createdAt?:unknown }
export interface Enrollment { id:string; userId:string; courseId:string; enrolledAt?:unknown; active:boolean }
export interface Progress { id:string; userId:string; courseId:string; phaseId:string; lessonId:string; completed:boolean; completedAt?:unknown }
