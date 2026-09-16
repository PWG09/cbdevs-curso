"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getCourse } from "@/lib/firestore/courses";
import { getUserEnrollments } from "@/lib/firestore/enrollments";
import { getPublishedLessons, getPhases } from "@/lib/firestore/course-structure";
import { useAuth } from "@/providers/auth-provider";
import type { Course, CourseLesson, CoursePhase } from "@/types/course";

export default function LearnCoursePage() {
  const params = useParams<{ courseId: string }>();
  const { appUser } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [phases, setPhases] = useState<CoursePhase[]>([]);
  const [lessons, setLessons] = useState<Record<string, CourseLesson[]>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!appUser) return;
    (async () => {
      try {
        const enrollments = await getUserEnrollments(appUser.uid);
        if (!enrollments.some((e) => e.courseId === params.courseId && e.active)) throw new Error("No estás inscrito en este curso.");
        const c = await getCourse(params.courseId);
        const ps = await getPhases(params.courseId);
        const map: Record<string, CourseLesson[]> = {};
        for (const p of ps) map[p.id] = await getPublishedLessons(params.courseId, p.id);
        setCourse(c); setPhases(ps); setLessons(map);
      } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cargar el curso."); }
    })();
  }, [appUser, params.courseId]);

  if (error) return <div className="card"><div className="error">{error}</div><Link href="/courses" className="btn">Volver</Link></div>;
  if (!course) return <p className="muted">Cargando curso...</p>;

  return (
    <>
      <Link href="/courses" className="muted">← Mis cursos</Link>
      <h1>{course.title}</h1><p className="muted">{course.description}</p>
      <div className="grid">
        {phases.map((phase, pi) => (
          <div className="card" key={phase.id}>
            <span className="badge">Fase {pi + 1}</span><h2>{phase.title}</h2><p className="muted">{phase.description}</p>
            <div className="list">
              {(lessons[phase.id] || []).map((lesson, i) => (
                <Link className="list-item" href={`/learn/${course.id}/phases/${phase.id}/lessons/${lesson.id}`} key={lesson.id}>
                  <span className="badge">#{i + 1}</span><strong style={{ marginLeft: 8 }}>{lesson.title}</strong>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
