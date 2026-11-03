"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, ChevronRight, EyeOff, FileText, Globe, Layers, Pencil, Plus, Save, Trash2, Users, X } from "lucide-react";
import Guard from "@/components/Guard";
import CoverInput from "@/components/CoverInput";
import { ConfirmButton, EmptyState, ErrorBanner, Field, PageHeader, Pill, Skeleton, SuccessBanner } from "@/components/ui";
import { createLesson, createPhase, deleteCourse, deleteLesson, deletePhase, getCourse, getCourseOutline, swapOrder, updateCourse, updatePhase } from "@/lib/data/courses";
import { listRoster } from "@/lib/data/enrollments";
import { IMAGE_TYPES, removeCourseAsset, uploadCourseAsset } from "@/lib/data/storage";
import { messageOf } from "@/lib/errors";
import { nextSortOrder } from "@/lib/progress";
import { plural } from "@/lib/format";
import { useAuth } from "@/providers/auth";
import type { Course, CourseOutline } from "@/types/course";

type PhaseWithLessons = CourseOutline["phases"][number];

function CourseDetails({ course, onSaved }: { course: Course; onSaved: (course: Course) => void }) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [price, setPrice] = useState(String(course.price));
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const dirty = title !== course.title || description !== course.description || Number(price) !== course.price || cover !== null;

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setSaved("");
    try {
      let thumbnail = course.thumbnail;
      if (cover) thumbnail = await uploadCourseAsset(cover, course.id, IMAGE_TYPES);
      await updateCourse(course.id, { title, description, price: Number(price), thumbnail });
      if (cover && course.thumbnail && course.thumbnail !== thumbnail) await removeCourseAsset(course.thumbnail).catch(() => undefined);
      setCover(null);
      setSaved("Cambios guardados.");
      onSaved({ ...course, title: title.trim(), description: description.trim(), price: Number(price), thumbnail });
    } catch (cause) {
      setError(messageOf(cause, "No se pudo guardar el curso."));
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={save} className="panel space-y-5 p-6">
      <div className="flex items-center gap-2"><Pencil size={16} className="text-cb-amber" aria-hidden /><h2 className="text-lg font-semibold">Información del curso</h2></div>
      <Field label="Título"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} /></Field>
      <Field label="Descripción"><textarea className="input min-h-[110px]" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} /></Field>
      <Field label="Precio (MXN)" hint="Informativo; el acceso se otorga por inscripción."><input className="input max-w-[200px]" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
      <CoverInput file={cover} onChange={setCover} currentUrl={course.thumbnailUrl} title={course.title} />
      <ErrorBanner>{error}</ErrorBanner>
      <SuccessBanner>{!dirty && saved}</SuccessBanner>
      <div className="flex justify-end border-t border-cb-line pt-5"><button className="btn-primary" disabled={busy || !dirty}><Save size={16} aria-hidden />{busy ? "Guardando…" : "Guardar cambios"}</button></div>
    </form>
  );
}

function AddInline({ placeholder, buttonLabel, onAdd }: { placeholder: string; buttonLabel: string; onAdd: (title: string) => Promise<void> }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form className="flex gap-2" onSubmit={async (e) => {
      e.preventDefault();
      if (!value.trim()) return;
      setBusy(true);
      try { await onAdd(value); setValue(""); } finally { setBusy(false); }
    }}>
      <input className="input" placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} maxLength={200} aria-label={placeholder} />
      <button className="btn-ghost shrink-0" disabled={busy || !value.trim()}><Plus size={15} aria-hidden /><span className="hidden sm:inline">{buttonLabel}</span></button>
    </form>
  );
}

function PhaseCard({ course, phase, index, total, isAdmin, onMove, onChanged, onError }: { course: Course; phase: PhaseWithLessons; index: number; total: number; isAdmin: boolean; onMove: (direction: -1 | 1) => Promise<void>; onChanged: () => Promise<void>; onError: (msg: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(phase.title);
  const [description, setDescription] = useState(phase.description);
  const [busy, setBusy] = useState(false);
  const run = async (action: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    try { await action(); await onChanged(); } catch (cause) { onError(messageOf(cause, fallback)); } finally { setBusy(false); }
  };
  const lessons = phase.lessons;

  return (
    <section id={`phase-${phase.id}`} className="panel overflow-hidden" aria-label={`Fase ${index + 1}: ${phase.title}`}>
      <div className="flex flex-col gap-3 border-b border-cb-line bg-cb-panel2/50 p-4 sm:flex-row sm:items-start">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cb-amber/10 font-mono text-sm font-bold text-cb-amber">{index + 1}</div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); void run(() => updatePhase(course.id, phase.id, { title, description }).then(() => setEditing(false)), "No se pudo actualizar la fase."); }}>
              <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} aria-label="Título de la fase" />
              <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="Descripción de la fase (opcional)" aria-label="Descripción de la fase" />
              <div className="flex gap-2"><button className="btn-primary" disabled={busy}><Save size={15} aria-hidden />Guardar</button><button type="button" className="btn-ghost" onClick={() => { setEditing(false); setTitle(phase.title); setDescription(phase.description); }}><X size={15} aria-hidden />Cancelar</button></div>
            </form>
          ) : (
            <>
              <h3 className="font-semibold">{phase.title}</h3>
              {phase.description && <p className="mt-0.5 text-sm text-cb-muted">{phase.description}</p>}
              <p className="mt-1 text-xs text-slate-500">{plural(lessons.length, "lección", "lecciones")}</p>
            </>
          )}
        </div>
        {!editing && (
          <div className="flex gap-1.5">
            <button type="button" className="btn-icon" onClick={() => setEditing(true)} aria-label="Editar fase" title="Editar fase"><Pencil size={15} /></button>
            <button type="button" className="btn-icon" disabled={busy || index === 0} onClick={() => void run(() => onMove(-1), "No se pudo reordenar.")} aria-label="Subir fase" title="Subir"><ArrowUp size={15} /></button>
            <button type="button" className="btn-icon" disabled={busy || index === total - 1} onClick={() => void run(() => onMove(1), "No se pudo reordenar.")} aria-label="Bajar fase" title="Bajar"><ArrowDown size={15} /></button>
            {isAdmin && <ConfirmButton className="btn-icon hover:border-red-400/60 hover:text-red-300" title="Eliminar fase" confirmLabel="¿Eliminar?" onConfirm={() => run(() => deletePhase(course.id, phase.id), "No se pudo eliminar la fase.")}><Trash2 size={15} /></ConfirmButton>}
          </div>
        )}
      </div>

      <ul className="divide-y divide-cb-line">
        {lessons.map((lesson, lessonIndex) => (
          <li key={lesson.id} className="flex items-center gap-3 px-4 py-3">
            <span className="w-6 shrink-0 text-center font-mono text-xs text-slate-500">{index + 1}.{lessonIndex + 1}</span>
            <Link href={`/courses/${course.id}/phases/${phase.id}/lessons/${lesson.id}`} className="group min-w-0 flex-1">
              <div className="truncate text-sm font-medium group-hover:text-cb-amber">{lesson.title}</div>
              <div className="text-xs text-slate-500">{lesson.blockCount ? plural(lesson.blockCount, "bloque") : "Sin contenido"}</div>
            </Link>
            <div className="flex gap-1.5">
              <button type="button" className="btn-icon h-8 w-8" disabled={busy || lessonIndex === 0} aria-label="Subir lección" title="Subir" onClick={() => void run(() => swapOrder("lesson", lesson.id, lessons[lessonIndex - 1].id), "No se pudo reordenar.")}><ArrowUp size={14} /></button>
              <button type="button" className="btn-icon h-8 w-8" disabled={busy || lessonIndex === lessons.length - 1} aria-label="Bajar lección" title="Bajar" onClick={() => void run(() => swapOrder("lesson", lesson.id, lessons[lessonIndex + 1].id), "No se pudo reordenar.")}><ArrowDown size={14} /></button>
              {isAdmin && <ConfirmButton className="btn-icon h-8 w-8 hover:border-red-400/60 hover:text-red-300" title="Eliminar lección" confirmLabel="¿Sí?" onConfirm={() => run(() => deleteLesson(course.id, phase.id, lesson.id), "No se pudo eliminar la lección.")}><Trash2 size={14} /></ConfirmButton>}
              <Link href={`/courses/${course.id}/phases/${phase.id}/lessons/${lesson.id}`} className="btn-icon h-8 w-8" aria-label={`Editar ${lesson.title}`}><ChevronRight size={15} /></Link>
            </div>
          </li>
        ))}
        {lessons.length === 0 && <li className="px-4 py-4 text-sm text-cb-muted">Esta fase aún no tiene lecciones.</li>}
      </ul>
      <div className="border-t border-cb-line p-3">
        <AddInline placeholder="Título de la nueva lección" buttonLabel="Agregar lección" onAdd={(value) => run(() => createLesson(course.id, phase.id, { title: value, description: "", order: nextSortOrder(lessons) }), "No se pudo crear la lección.")} />
      </div>
    </section>
  );
}

function CourseManager() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const { appUser } = useAuth();
  const isAdmin = appUser?.role === "admin";
  const [course, setCourse] = useState<Course | null | undefined>(undefined);
  const [outline, setOutline] = useState<CourseOutline>({ phases: [] });
  const [studentCount, setStudentCount] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadOutline = useCallback(async () => setOutline(await getCourseOutline(courseId, true)), [courseId]);

  useEffect(() => {
    let active = true;
    Promise.all([getCourse(courseId), getCourseOutline(courseId, true), listRoster().catch(() => [])]).then(([c, o, roster]) => {
      if (!active) return;
      setCourse(c);
      setOutline(o);
      setStudentCount(roster.filter((r) => r.enrollment.courseId === courseId).length);
    }).catch((cause) => { if (active) { setError(messageOf(cause, "No se pudo cargar el curso.")); setCourse(null); } });
    return () => { active = false; };
  }, [courseId]);

  async function movePhase(phaseId: string, direction: -1 | 1) {
    const index = outline.phases.findIndex((p) => p.id === phaseId);
    const target = outline.phases[index + direction];
    if (target) await swapOrder("phase", phaseId, target.id);
  }

  async function togglePublished() {
    if (!course) return;
    setBusy(true); setError("");
    try {
      await updateCourse(course.id, { published: !course.published });
      setCourse({ ...course, published: !course.published });
    } catch (cause) { setError(messageOf(cause, "No se pudo cambiar el estado.")); } finally { setBusy(false); }
  }

  if (course === undefined) return <div className="space-y-5" aria-busy="true"><Skeleton className="h-24" /><Skeleton className="h-96" /></div>;
  if (!course) return <EmptyState icon={BookOpen} title="Curso no encontrado" description={error || "El curso no existe o no tienes acceso a él."} action={<Link className="btn-ghost" href="/courses">Volver a cursos</Link>} />;

  const lessonCount = outline.phases.reduce((sum, p) => sum + p.lessons.length, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        back={<Link className="inline-flex items-center gap-1.5 text-sm text-cb-muted hover:text-white" href="/courses"><ArrowLeft size={15} aria-hidden />Cursos</Link>}
        eyebrow="Curso"
        title={course.title}
        actions={<>
          {course.published ? <Pill tone="success">Publicado</Pill> : <Pill tone="warning">Borrador</Pill>}
          <button type="button" className={course.published ? "btn-ghost" : "btn-primary"} disabled={busy || (!course.published && lessonCount === 0)} onClick={togglePublished} title={!course.published && lessonCount === 0 ? "Agrega al menos una lección antes de publicar" : undefined}>
            {course.published ? <><EyeOff size={16} aria-hidden />Pasar a borrador</> : <><Globe size={16} aria-hidden />Publicar</>}
          </button>
        </>}
      />
      {!course.published && <p className="-mt-4 text-sm text-cb-muted">Los alumnos inscritos solo pueden ver el contenido cuando el curso está publicado.</p>}

      <div className="grid gap-4 sm:grid-cols-3">
        {[{ icon: Layers, label: "Fases", value: outline.phases.length }, { icon: FileText, label: "Lecciones", value: lessonCount }, { icon: Users, label: "Alumnos inscritos", value: studentCount }].map(({ icon: Icon, label, value }) => (
          <div key={label} className="panel flex items-center gap-4 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-cb-panel2 text-cb-amber"><Icon size={18} aria-hidden /></div>
            <div><div className="text-xl font-bold">{value}</div><div className="text-sm text-cb-muted">{label}</div></div>
          </div>
        ))}
      </div>

      <ErrorBanner>{error}</ErrorBanner>

      <div className="grid gap-8 xl:grid-cols-[1.25fr_.75fr]">
        <div className="space-y-4">
          <div className="flex items-end justify-between"><div><div className="mono-label">Temario</div><h2 className="mt-1 text-xl font-semibold">Fases y lecciones</h2></div></div>
          {outline.phases.length === 0 && <EmptyState icon={Layers} title="Empieza por la primera fase" description="Divide el curso en fases (módulos) y agrega lecciones dentro de cada una." />}
          {outline.phases.map((phase, index) => (
            <PhaseCard key={`${phase.id}-${phase.title}-${phase.description}`} course={course} phase={phase} index={index} total={outline.phases.length} isAdmin={isAdmin} onMove={(direction) => movePhase(phase.id, direction)} onChanged={async () => { setError(""); await loadOutline(); }} onError={setError} />
          ))}
          <div className="panel p-4">
            <div className="mb-2 text-sm font-medium">Nueva fase</div>
            <AddInline placeholder="Título de la fase" buttonLabel="Agregar fase" onAdd={async (value) => {
              setError("");
              try { await createPhase(course.id, { title: value, description: "", order: nextSortOrder(outline.phases) }); await loadOutline(); }
              catch (cause) { setError(messageOf(cause, "No se pudo crear la fase.")); }
            }} />
          </div>
        </div>

        <div className="space-y-6">
          <CourseDetails course={course} onSaved={(updated) => setCourse((current) => current && { ...updated, thumbnailUrl: updated.thumbnail === current.thumbnail ? current.thumbnailUrl : undefined })} />
          {isAdmin && (
            <section className="panel border-red-500/20 p-6">
              <h2 className="text-lg font-semibold text-red-200">Zona de riesgo</h2>
              <p className="mt-1 text-sm text-cb-muted">Eliminar el curso borra sus fases, lecciones, inscripciones y progreso. No se puede deshacer.</p>
              <ConfirmButton className="btn-danger mt-4" confirmLabel="Confirmar: eliminar definitivamente" onConfirm={async () => {
                try { await deleteCourse(course.id); router.replace("/courses"); } catch (cause) { setError(messageOf(cause, "No se pudo eliminar el curso.")); }
              }}><Trash2 size={16} aria-hidden />Eliminar curso</ConfirmButton>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CoursePage() {
  return <Guard roles={["admin", "empleado"]}><CourseManager /></Guard>;
}
