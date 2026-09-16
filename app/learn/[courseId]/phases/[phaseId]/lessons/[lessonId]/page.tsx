"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getLesson, getPhases } from "@/lib/firestore/course-structure";
import { getCourse } from "@/lib/firestore/courses";
import { getUserEnrollments } from "@/lib/firestore/enrollments";
import { getLessonProgress, setLessonCompleted } from "@/lib/firestore/progress";
import { useAuth } from "@/providers/auth-provider";
import type { Course, CourseLesson, CoursePhase, LessonBlock } from "@/types/course";

export default function LearnLessonPage() {
  const params = useParams<{ courseId: string; phaseId: string; lessonId: string }>();
  const { appUser } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [phase, setPhase] = useState<CoursePhase | null>(null);
  const [lesson, setLesson] = useState<CourseLesson | null>(null);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!appUser) return;
    (async () => {
      try {
        const enrollments = await getUserEnrollments(appUser.uid);
        if (!enrollments.some((e) => e.courseId === params.courseId && e.active)) throw new Error("No estás inscrito en este curso.");
        const [c, l, ps] = await Promise.all([getCourse(params.courseId), getLesson(params.courseId, params.phaseId, params.lessonId), getPhases(params.courseId)]);
        if (!l || !l.published) throw new Error("Esta lección todavía no está publicada.");
        setCourse(c); setLesson(l); setPhase(ps.find((p) => p.id === params.phaseId) || null);
        const p = await getLessonProgress(appUser.uid, l.id);
        setCompleted(Boolean(p?.completed));
      } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar la lección."); }
    })();
  }, [appUser, params.courseId, params.phaseId, params.lessonId]);

  async function toggle() {
    if (!appUser || !lesson) return;
    const next = !completed;
    await setLessonCompleted(appUser.uid, params.courseId, params.phaseId, lesson.id, next);
    setCompleted(next);
  }

  if (error) return <div className="card"><div className="error">{error}</div></div>;
  if (!lesson || !course) return <p className="muted">Cargando lección...</p>;

  return (
    <div className="learn-page">
      <Link href={`/learn/${course.id}`} className="muted">← Curso</Link>
      <div className="card lesson-view-card">
        <div className="row between wrap"><div><span className="badge">{phase?.title}</span><h1>{lesson.title}</h1><p className="muted">{lesson.description}</p></div><button className={`btn ${completed ? "btn-teal" : ""}`} onClick={toggle}>{completed ? "✓ Completada" : "Marcar completada"}</button></div>
        <div className="student-content">{lesson.blocks.map((b) => <StudentBlock key={b.id} block={b} />)}</div>
      </div>
    </div>
  );
}

function StudentBlock({ block }: { block: LessonBlock }) {
  const d = block.data;
  if (block.type === "text") return <div className="student-block rich-output" dangerouslySetInnerHTML={{ __html: String(d.content || "") }} />;
  if (block.type === "video") {
    const url = String(d.url || "");
    const embed = url.includes("youtube.com/watch?v=") ? `https://www.youtube.com/embed/${url.split("v=")[1].split("&")[0]}` : url.includes("youtu.be/") ? `https://www.youtube.com/embed/${url.split("youtu.be/")[1].split("?")[0]}` : url.includes("vimeo.com/") ? `https://player.vimeo.com/video/${url.split("vimeo.com/")[1].split("?")[0]}` : url;
    return <div className="student-block"><h2>{String(d.title || "Video")}</h2>{url && (d.provider === "file" ? <video className="video" src={url} controls /> : <iframe className="video" src={embed} title={String(d.title || "Video")} allowFullScreen />)}{String(d.description || "") && <p className="muted">{String(d.description || "")}</p>}</div>;
  }
  if (block.type === "code") return <div className="student-block"><h2>{String(d.title || "")}</h2><pre className="code-output"><code>{String(d.code || "")}</code></pre></div>;
  if (block.type === "exercise") return <div className="student-block exercise-preview"><span className="badge">Ejercicio</span><h2>{String(d.title || "Reto práctico")}</h2><p>{String(d.description || "")}</p>{Boolean(d.solutionEnabled) && Boolean(d.solutionReleased) && <details><summary>Ver solución</summary><pre className="code-output"><code>{String(d.solutionCode || "")}</code></pre></details>}</div>;
  if (block.type === "quiz") return <div className="student-block"><span className="badge">Quiz</span><h2>{String(d.question || "")}</h2>{((d.options || []) as Record<string, unknown>[]).map((o) => <label className="quiz-answer" key={String(o.id)}><input type="radio" name={`quiz-${block.id}`} /> {String(o.text || "")}</label>)}</div>;
  return <div className="student-block"><span className="badge">Recurso</span><h2>{String(d.title || "")}</h2><p>{String(d.description || "")}</p><a className="btn btn-primary" href={String(d.source === "upload" ? d.fileUrl : d.externalUrl || "#")} target="_blank" rel="noreferrer">{d.source === "upload" ? `Descargar ${String(d.fileName || "archivo")}` : "Abrir recurso"}</a></div>;
}
