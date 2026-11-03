"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, GraduationCap, PlayCircle } from "lucide-react";
import Guard from "@/components/Guard";
import CourseCover from "@/components/CourseCover";
import { EmptyState, ErrorBanner, LoadingGrid, PageHeader, Pill, ProgressBar } from "@/components/ui";
import { loadMyCourses, type LearnerCourse } from "@/lib/data/learner";
import { messageOf } from "@/lib/errors";
import { plural } from "@/lib/format";
import { lessonHref } from "@/lib/routes";
import { useAuth } from "@/providers/auth";

function MyCourses() {
  const { appUser } = useAuth();
  const [items, setItems] = useState<LearnerCourse[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loadMyCourses().then((list) => { if (active) setItems(list); }).catch((cause) => { if (active) { setError(messageOf(cause, "No se pudieron cargar tus cursos.")); setItems([]); } });
    return () => { active = false; };
  }, []);

  const inProgress = items?.find((i) => i.progress.next && i.progress.completed > 0) ?? items?.find((i) => i.progress.next);
  const firstName = appUser?.name.split(" ")[0] ?? "";

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Aprendizaje" title={firstName ? `Hola, ${firstName}` : "Mis cursos"} description="Tus cursos y tu avance. Retoma justo donde te quedaste." />
      <ErrorBanner>{error}</ErrorBanner>

      {inProgress?.progress.next && (
        <section className="panel relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cb-amber/10 blur-3xl" aria-hidden />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="mono-label">Continuar</div>
              <h2 className="mt-1 truncate text-xl font-semibold">{inProgress.course.title}</h2>
              <p className="mt-1 truncate text-sm text-cb-muted">Siguiente: {inProgress.progress.next.title} · {inProgress.progress.next.phaseTitle}</p>
              <div className="mt-4 max-w-md"><ProgressBar value={inProgress.progress.percent} label="Avance del curso" /></div>
            </div>
            <Link className="btn-primary shrink-0" href={lessonHref(inProgress.course.id, inProgress.progress.next.phaseId, inProgress.progress.next.id)}><PlayCircle size={17} aria-hidden />{inProgress.progress.completed ? "Continuar" : "Empezar"}</Link>
          </div>
        </section>
      )}

      {items === null ? <LoadingGrid /> : items.length === 0 && !error ? (
        <EmptyState icon={GraduationCap} title="Aún no tienes cursos" description="Cuando el equipo de CBDEVS te inscriba en un curso, aparecerá aquí. Si ya lo compraste, escríbenos con el correo de esta cuenta." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map(({ course, progress }) => {
            const done = progress.total > 0 && progress.completed === progress.total;
            return (
              <Link key={course.id} href={`/my-courses/${course.id}`} className="panel group flex flex-col overflow-hidden transition hover:border-cb-amber/50">
                <div className="relative">
                  <CourseCover src={course.thumbnailUrl} title={course.title} />
                  {done && <div className="absolute left-3 top-3"><Pill tone="success"><CheckCircle2 size={12} aria-hidden />Completado</Pill></div>}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-semibold leading-snug group-hover:text-cb-amber">{course.title}</h2>
                  <p className="mt-1.5 line-clamp-2 text-sm text-cb-muted">{course.description}</p>
                  <div className="mt-auto pt-5">
                    <div className="mb-1.5 flex justify-between text-xs"><span className="text-cb-muted">{progress.completed} de {plural(progress.total, "lección", "lecciones")}</span><span className="font-semibold">{progress.percent}%</span></div>
                    <ProgressBar value={progress.percent} label={`Avance en ${course.title}`} size="sm" />
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-cb-amber">{done ? "Repasar" : progress.completed ? "Continuar" : "Empezar"} <ArrowRight size={14} aria-hidden /></span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MyCoursesPage() {
  return <Guard roles={["cliente"]}><MyCourses /></Guard>;
}
