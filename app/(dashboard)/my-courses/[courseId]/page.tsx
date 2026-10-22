"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Circle, Lock, PlayCircle, RotateCcw } from "lucide-react";
import Guard from "@/components/Guard";
import CourseCover from "@/components/CourseCover";
import { EmptyState, ErrorBanner, ProgressBar, Skeleton } from "@/components/ui";
import { loadMyCourse, type LearnerCourseResult } from "@/lib/data/learner";
import { messageOf } from "@/lib/errors";
import { plural } from "@/lib/format";
import { lessonHref } from "@/lib/routes";

function CourseOverview() {
  const { courseId } = useParams<{ courseId: string }>();
  const [result, setResult] = useState<LearnerCourseResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loadMyCourse(courseId).then((r) => { if (active) setResult(r); }).catch((cause) => { if (active) setError(messageOf(cause, "No se pudo abrir el curso.")); });
    return () => { active = false; };
  }, [courseId]);

  const back = <Link className="inline-flex items-center gap-1.5 text-sm text-cb-muted hover:text-white" href="/my-courses"><ArrowLeft size={15} aria-hidden />Mis cursos</Link>;
  if (error) return <div className="space-y-4">{back}<ErrorBanner>{error}</ErrorBanner></div>;
  if (!result) return <div className="space-y-5" aria-busy="true"><Skeleton className="h-56" /><Skeleton className="h-80" /></div>;
  if (result.status !== "ok") {
    return <div className="space-y-6">{back}<EmptyState icon={Lock} title={result.status === "not-enrolled" ? "No tienes acceso a este curso" : "Curso no disponible por ahora"} description={result.status === "not-enrolled" ? "Este curso no está asignado a tu cuenta. Si crees que es un error, contacta al equipo de CBDEVS." : "El equipo está actualizando este curso. Vuelve a intentarlo más tarde."} /></div>;
  }

  const { course, outline, progress, completed } = result.data;
  const first = progress.next ?? null;
  const done = progress.total > 0 && progress.completed === progress.total;

  return (
    <div className="space-y-8">
      {back}
      <section className="panel overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_380px]">
          <div className="p-6 sm:p-8">
            <div className="mono-label">Curso</div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">{course.title}</h1>
            {course.description && <p className="mt-3 whitespace-pre-line leading-7 text-cb-muted">{course.description}</p>}
            <div className="mt-6 max-w-lg">
              <div className="mb-2 flex justify-between text-sm"><span className="text-cb-muted">{progress.completed} de {plural(progress.total, "lección", "lecciones")} completadas</span><span className="font-semibold">{progress.percent}%</span></div>
              <ProgressBar value={progress.percent} label="Avance del curso" />
            </div>
            <div className="mt-6">
              {first ? (
                <Link className="btn-primary" href={lessonHref(course.id, first.phaseId, first.id)}><PlayCircle size={17} aria-hidden />{progress.completed ? "Continuar con la siguiente lección" : "Empezar el curso"}</Link>
              ) : done ? (
                <span className="inline-flex items-center gap-2 text-sm font-medium text-emerald-300"><Check size={17} aria-hidden />¡Terminaste este curso!</span>
              ) : <span className="text-sm text-cb-muted">Este curso aún no tiene lecciones.</span>}
            </div>
          </div>
          <div className="hidden border-l border-cb-line lg:block"><CourseCover src={course.thumbnailUrl} title={course.title} className="h-full" /></div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Contenido del curso</h2>
        {outline.phases.map((phase, phaseIndex) => {
          const phaseDone = phase.lessons.filter((l) => completed.has(l.id)).length;
          return (
            <div key={phase.id} className="panel overflow-hidden">
              <div className="flex items-start gap-3 border-b border-cb-line bg-cb-panel2/50 p-4">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cb-amber/10 font-mono text-sm font-bold text-cb-amber">{phaseIndex + 1}</div>
                <div className="min-w-0 flex-1"><h3 className="font-semibold">{phase.title}</h3>{phase.description && <p className="mt-0.5 text-sm text-cb-muted">{phase.description}</p>}</div>
                <span className="shrink-0 text-xs text-cb-muted">{phaseDone}/{phase.lessons.length}</span>
              </div>
              <ul className="divide-y divide-cb-line">
                {phase.lessons.map((lesson, lessonIndex) => {
                  const isDone = completed.has(lesson.id);
                  const isNext = progress.next?.id === lesson.id;
                  return (
                    <li key={lesson.id}>
                      <Link href={lessonHref(course.id, phase.id, lesson.id)} className={`flex items-center gap-3 px-4 py-3 transition hover:bg-cb-panel2/60 ${isNext ? "bg-cb-amber/5" : ""}`}>
                        {isDone ? <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-300" aria-label="Completada"><Check size={14} /></span> : isNext ? <PlayCircle size={22} className="shrink-0 text-cb-amber" aria-label="Siguiente" /> : <Circle size={22} className="shrink-0 text-slate-600" aria-hidden />}
                        <span className="w-8 shrink-0 font-mono text-xs text-slate-500">{phaseIndex + 1}.{lessonIndex + 1}</span>
                        <span className={`min-w-0 flex-1 truncate text-sm ${isDone ? "text-slate-400" : "font-medium"}`}>{lesson.title}</span>
                        {isDone && <RotateCcw size={14} className="shrink-0 text-slate-600" aria-hidden />}
                      </Link>
                    </li>
                  );
                })}
                {phase.lessons.length === 0 && <li className="px-4 py-3 text-sm text-cb-muted">Próximamente.</li>}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}

export default function MyCoursePage() {
  return <Guard roles={["cliente"]}><CourseOverview /></Guard>;
}
