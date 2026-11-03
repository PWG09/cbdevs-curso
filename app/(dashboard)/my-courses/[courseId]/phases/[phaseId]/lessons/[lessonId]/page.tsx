"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronDown, Circle, ListTree, Lock, PartyPopper, PlayCircle } from "lucide-react";
import Guard from "@/components/Guard";
import { LessonBody } from "@/components/lesson/BlockRenderer";
import { EmptyState, ErrorBanner, ProgressBar, Skeleton } from "@/components/ui";
import { getExerciseSolutions, getLesson } from "@/lib/data/courses";
import { loadMyCourse, type LearnerCourse } from "@/lib/data/learner";
import { setLessonCompleted } from "@/lib/data/progress";
import { messageOf } from "@/lib/errors";
import { neighbors, summarizeProgress } from "@/lib/progress";
import { lessonHref } from "@/lib/routes";
import type { ExerciseSolution, Lesson } from "@/types/course";

function Outline({ data, currentId, completed }: { data: LearnerCourse; currentId: string; completed: Set<string> }) {
  return (
    <nav aria-label="Temario del curso" className="space-y-4">
      {data.outline.phases.map((phase, phaseIndex) => (
        <div key={phase.id}>
          <div className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{phaseIndex + 1}. {phase.title}</div>
          <ul className="mt-1.5 space-y-0.5">
            {phase.lessons.map((lesson) => {
              const current = lesson.id === currentId;
              const done = completed.has(lesson.id);
              return (
                <li key={lesson.id}>
                  <Link href={lessonHref(data.course.id, phase.id, lesson.id)} aria-current={current ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition ${current ? "bg-cb-amber/10 text-cb-amber" : "text-slate-300 hover:bg-cb-panel2"}`}>
                    {done ? <Check size={15} className="shrink-0 text-emerald-300" aria-label="Completada" /> : current ? <PlayCircle size={15} className="shrink-0" aria-hidden /> : <Circle size={15} className="shrink-0 text-slate-600" aria-hidden />}
                    <span className="min-w-0 truncate">{lesson.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Player() {
  const { courseId, phaseId, lessonId } = useParams<{ courseId: string; phaseId: string; lessonId: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<LearnerCourse | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [solutions, setSolutions] = useState<Record<string, ExerciseSolution>>({});
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"loading" | "ready" | "locked" | "missing">("loading");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(false);

  // Course outline/progress loads once per course; lesson content per lesson.
  useEffect(() => {
    let active = true;
    loadMyCourse(courseId).then((result) => {
      if (!active) return;
      if (result.status !== "ok") { setStatus("locked"); return; }
      setCourse(result.data);
      setCompleted(new Set(result.data.completed));
    }).catch((cause) => { if (active) { setError(messageOf(cause, "No se pudo abrir el curso.")); setStatus("missing"); } });
    return () => { active = false; };
  }, [courseId]);

  useEffect(() => {
    let active = true;
    setLesson(null);
    setOutlineOpen(false);
    Promise.all([getLesson(courseId, phaseId, lessonId), getExerciseSolutions(courseId, phaseId, lessonId).catch(() => ({}))]).then(([l, s]) => {
      if (!active) return;
      if (!l) { setStatus((st) => (st === "locked" ? st : "missing")); return; }
      setLesson(l);
      setSolutions(s);
      setStatus((st) => (st === "locked" ? st : "ready"));
      window.scrollTo({ top: 0 });
    }).catch((cause) => { if (active) { setError(messageOf(cause, "No se pudo abrir la lección.")); setStatus("missing"); } });
    return () => { active = false; };
  }, [courseId, phaseId, lessonId]);

  const nav = useMemo(() => (course ? neighbors(course.outline, lessonId) : null), [course, lessonId]);
  const progress = useMemo(() => (course ? summarizeProgress(course.outline, completed) : null), [course, completed]);
  const isDone = completed.has(lessonId);

  async function markComplete(goNext: boolean) {
    setSaving(true);
    setError("");
    const next = new Set(completed);
    if (isDone && !goNext) next.delete(lessonId); else next.add(lessonId);
    setCompleted(next);
    try {
      if (!(isDone && goNext)) await setLessonCompleted(courseId, phaseId, lessonId, next.has(lessonId));
      if (goNext && nav?.next) router.push(lessonHref(courseId, nav.next.phaseId, nav.next.id));
    } catch (cause) {
      setCompleted(completed);
      setError(messageOf(cause, "No se pudo guardar tu progreso."));
    } finally { setSaving(false); }
  }

  const back = <Link className="inline-flex items-center gap-1.5 text-sm text-cb-muted hover:text-white" href={`/my-courses/${courseId}`}><ArrowLeft size={15} aria-hidden />{course?.course.title ?? "Volver al curso"}</Link>;

  if (status === "locked") return <div className="space-y-6"><Link className="inline-flex items-center gap-1.5 text-sm text-cb-muted hover:text-white" href="/my-courses"><ArrowLeft size={15} aria-hidden />Mis cursos</Link><EmptyState icon={Lock} title="No tienes acceso a esta lección" description="La lección pertenece a un curso que no está disponible para tu cuenta." /></div>;
  if (status === "missing") return <div className="space-y-6">{back}<ErrorBanner>{error}</ErrorBanner>{!error && <EmptyState icon={ListTree} title="Lección no encontrada" description="Puede que se haya movido o eliminado." />}</div>;
  if (!lesson || !course || !nav || !progress) return <div className="grid gap-6 lg:grid-cols-[1fr_280px]" aria-busy="true"><Skeleton className="h-[480px]" /><Skeleton className="hidden h-[480px] lg:block" /></div>;

  const finishedCourse = progress.total > 0 && progress.completed === progress.total;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <article className="min-w-0 space-y-8">
        <header className="space-y-3">
          {back}
          <div className="text-xs font-medium text-cb-muted">Lección {nav.position} de {nav.total} · {course.outline.phases.find((p) => p.id === phaseId)?.title}</div>
          <h1 className="text-3xl font-bold tracking-tight">{lesson.title}</h1>
          {lesson.description && <p className="text-lg leading-8 text-cb-muted">{lesson.description}</p>}
        </header>

        <button type="button" className="btn-ghost w-full justify-between lg:hidden" onClick={() => setOutlineOpen((v) => !v)} aria-expanded={outlineOpen}>
          <span className="flex items-center gap-2"><ListTree size={16} aria-hidden />Temario · {progress.percent}%</span><ChevronDown size={16} className={`transition ${outlineOpen ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {outlineOpen && <div className="panel p-3 lg:hidden"><Outline data={course} currentId={lessonId} completed={completed} /></div>}

        <LessonBody blocks={lesson.blocks} solutions={solutions} />

        <ErrorBanner>{error}</ErrorBanner>

        <footer className="panel space-y-5 p-5">
          {finishedCourse && isDone && !nav.next ? (
            <div className="flex items-center gap-3 text-emerald-300"><PartyPopper size={22} aria-hidden /><div><div className="font-semibold">¡Completaste el curso!</div><div className="text-sm text-cb-muted">Puedes repasar cualquier lección cuando quieras.</div></div></div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {isDone ? <span className="flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 size={18} aria-hidden />Lección completada</span> : <span className="text-sm text-cb-muted">¿Terminaste esta lección?</span>}
              <div className="flex flex-wrap gap-2 sm:ml-auto">
                <button type="button" className="btn-ghost" disabled={saving} onClick={() => void markComplete(false)}>{isDone ? "Marcar como pendiente" : "Marcar como completada"}</button>
                {nav.next && <button type="button" className="btn-primary" disabled={saving} onClick={() => void markComplete(true)}>{isDone ? "Siguiente lección" : "Completar y continuar"}<ArrowRight size={16} aria-hidden /></button>}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-cb-line pt-4 text-sm">
            {nav.previous ? <Link className="inline-flex min-w-0 items-center gap-1.5 text-cb-muted hover:text-white" href={lessonHref(courseId, nav.previous.phaseId, nav.previous.id)}><ArrowLeft size={15} className="shrink-0" aria-hidden /><span className="truncate">{nav.previous.title}</span></Link> : <span />}
            {nav.next && <Link className="inline-flex min-w-0 items-center gap-1.5 text-cb-muted hover:text-white" href={lessonHref(courseId, nav.next.phaseId, nav.next.id)}><span className="truncate">{nav.next.title}</span><ArrowRight size={15} className="shrink-0" aria-hidden /></Link>}
          </div>
        </footer>
      </article>

      <aside className="hidden lg:block">
        <div className="panel sticky top-8 max-h-[calc(100vh-4rem)] overflow-y-auto p-4 scrollbar">
          <div className="mb-4 px-2">
            <div className="mb-2 flex justify-between text-xs"><span className="text-cb-muted">Tu avance</span><span className="font-semibold">{progress.percent}%</span></div>
            <ProgressBar value={progress.percent} label="Avance del curso" size="sm" />
          </div>
          <Outline data={course} currentId={lessonId} completed={completed} />
        </div>
      </aside>
    </div>
  );
}

export default function LessonPage() {
  return <Guard roles={["cliente"]}><Player /></Guard>;
}
