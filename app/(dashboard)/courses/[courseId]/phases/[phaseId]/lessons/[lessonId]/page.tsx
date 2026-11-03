"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Code2, Copy, Download, Eye, FileText, HelpCircle, Lightbulb, Loader2, Pencil, PlayCircle, Trash2 } from "lucide-react";
import Guard from "@/components/Guard";
import { CodeForm, DownloadForm, ExerciseForm, QuizForm, TextForm, VideoForm } from "@/components/editor/BlockForms";
import { LessonBody } from "@/components/lesson/BlockRenderer";
import { ConfirmButton, EmptyState, ErrorBanner, Skeleton } from "@/components/ui";
import { getCourse, getExerciseSolutions, getLesson, saveExerciseSolution, saveLesson } from "@/lib/data/courses";
import { BLOCK_LABELS, createBlockId, makeBlock, toPublicBlocks } from "@/lib/blocks";
import { sanitizeLessonHtml } from "@/lib/sanitize";
import { messageOf } from "@/lib/errors";
import type { ExerciseSolution, LessonBlock, LessonBlockType } from "@/types/course";

const ICONS: Record<LessonBlockType, typeof FileText> = { text: FileText, video: PlayCircle, code: Code2, exercise: Lightbulb, quiz: HelpCircle, download: Download };
const AUTOSAVE_MS = 1200;

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";
type Snapshot = { content: string; solutions: Record<string, { code: string; released: boolean }> };

function contentKey(title: string, description: string, blocks: LessonBlock[]) {
  return JSON.stringify({ title, description, blocks: toPublicBlocks(blocks) });
}

function solutionsOf(blocks: LessonBlock[]): Snapshot["solutions"] {
  return Object.fromEntries(blocks.flatMap((b) => (b.type === "exercise" ? [[b.id, { code: b.data.solutionCode ?? "", released: b.data.solutionReleased }]] : [])));
}

function Editor() {
  const { courseId, phaseId, lessonId } = useParams<{ courseId: string; phaseId: string; lessonId: string }>();
  const [loaded, setLoaded] = useState<"loading" | "ready" | "missing">("loading");
  const [organizationId, setOrganizationId] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [preview, setPreview] = useState(false);
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const saved = useRef<Snapshot>({ content: "", solutions: {} });
  const saving = useRef(false);
  const pending = useRef(false);
  const latest = useRef({ title, description, blocks });
  latest.current = { title, description, blocks };

  useEffect(() => {
    let active = true;
    Promise.all([getLesson(courseId, phaseId, lessonId), getCourse(courseId), getExerciseSolutions(courseId, phaseId, lessonId)]).then(([lesson, course, solutions]) => {
      if (!active) return;
      if (!lesson || !course) { setLoaded("missing"); return; }
      const merged = lesson.blocks.map((b) => (b.type === "exercise" ? { ...b, data: { ...b.data, solutionCode: solutions[b.id]?.code ?? "", solutionReleased: solutions[b.id]?.released ?? b.data.solutionReleased } } : b));
      setOrganizationId(course.organizationId);
      setCourseTitle(course.title);
      setTitle(lesson.title);
      setDescription(lesson.description);
      setBlocks(merged);
      saved.current = { content: contentKey(lesson.title, lesson.description, merged), solutions: solutionsOf(merged) };
      setLoaded("ready");
    }).catch((cause) => { if (active) { setError(messageOf(cause, "No se pudo cargar la lección.")); setLoaded("missing"); } });
    return () => { active = false; };
  }, [courseId, phaseId, lessonId]);

  const dirty = loaded === "ready" && (contentKey(title, description, blocks) !== saved.current.content || JSON.stringify(solutionsOf(blocks)) !== JSON.stringify(saved.current.solutions));

  /** Saves the latest state; if edits arrive mid-save, runs once more afterwards. */
  const save = useCallback(async () => {
    if (saving.current) { pending.current = true; return; }
    saving.current = true;
    setState("saving");
    setError("");
    try {
      do {
        pending.current = false;
        const snap = latest.current;
        if (!snap.title.trim()) throw new Error("title");
        const cleanBlocks = snap.blocks.map((b) => (b.type === "text" ? { ...b, data: { html: sanitizeLessonHtml(b.data.html) } } : b));
        const key = contentKey(snap.title, snap.description, snap.blocks);
        if (key !== saved.current.content) {
          await saveLesson(courseId, phaseId, lessonId, { title: snap.title, description: snap.description, blocks: cleanBlocks });
          saved.current = { ...saved.current, content: key };
        }
        const next = solutionsOf(snap.blocks);
        for (const [blockId, solution] of Object.entries(next)) {
          const before = saved.current.solutions[blockId];
          if (before && before.code === solution.code && before.released === solution.released) continue;
          if (!before && !solution.code && !solution.released) continue;
          await saveExerciseSolution(organizationId, courseId, phaseId, lessonId, blockId, solution.code, solution.released);
          saved.current = { ...saved.current, solutions: { ...saved.current.solutions, [blockId]: solution } };
        }
        // Everything in `next` is now persisted (or empty); removed exercises no longer count as changes.
        saved.current = { ...saved.current, solutions: next };
      } while (pending.current);
      setState("saved");
    } catch (cause) {
      setState("error");
      setError(cause instanceof Error && cause.message === "title" ? "La lección necesita un título." : messageOf(cause, "No se pudo guardar. Tus cambios siguen en pantalla; inténtalo de nuevo."));
    } finally {
      saving.current = false;
    }
  }, [courseId, phaseId, lessonId, organizationId]);

  // Debounced autosave.
  useEffect(() => {
    if (!dirty) return;
    setState((s) => (s === "saving" ? s : "dirty"));
    const timer = window.setTimeout(() => { void save(); }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [dirty, title, description, blocks, save]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const update = (id: string, patch: Record<string, unknown>) =>
    setBlocks((list) => list.map((b) => (b.id === id ? ({ ...b, data: { ...b.data, ...patch } } as LessonBlock) : b)));
  const move = (index: number, dir: -1 | 1) => setBlocks((list) => {
    const target = index + dir;
    if (target < 0 || target >= list.length) return list;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const duplicate = (index: number) => setBlocks((list) => [...list.slice(0, index + 1), { ...list[index], id: createBlockId(), data: structuredClone(list[index].data) } as LessonBlock, ...list.slice(index + 1)]);
  const add = (type: LessonBlockType) => setBlocks((list) => [...list, makeBlock(type)]);

  const previewSolutions = useMemo<Record<string, ExerciseSolution>>(() => Object.fromEntries(blocks.flatMap((b) => (b.type === "exercise" && b.data.solutionReleased ? [[b.id, { id: b.id, code: b.data.solutionCode ?? "", released: true }]] : []))), [blocks]);

  if (loaded === "loading") return <div className="space-y-4" aria-busy="true"><Skeleton className="h-20" /><Skeleton className="h-96" /></div>;
  if (loaded === "missing") return <EmptyState icon={FileText} title="Lección no encontrada" description={error || "La lección no existe o no tienes acceso."} action={<Link className="btn-ghost" href={`/courses/${courseId}`}>Volver al curso</Link>} />;

  const status = {
    idle: { icon: CheckCircle2, text: "Sin cambios", cls: "text-cb-muted" },
    dirty: { icon: Pencil, text: "Cambios sin guardar", cls: "text-cb-amber" },
    saving: { icon: Loader2, text: "Guardando…", cls: "text-cb-amber" },
    saved: { icon: CheckCircle2, text: "Guardado", cls: "text-emerald-300" },
    error: { icon: AlertTriangle, text: "Error al guardar", cls: "text-red-300" },
  }[dirty && state !== "saving" && state !== "error" ? "dirty" : state];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <div className="sticky top-14 z-10 -mx-4 flex flex-wrap items-center gap-3 border-b border-cb-line bg-cb-bg/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-10 lg:px-10">
        <Link className="inline-flex items-center gap-1.5 text-sm text-cb-muted hover:text-white" href={`/courses/${courseId}#phase-${phaseId}`}><ArrowLeft size={15} aria-hidden /><span className="max-w-[200px] truncate">{courseTitle}</span></Link>
        <span className={`ml-auto flex items-center gap-1.5 text-xs ${status.cls}`} role="status" aria-live="polite"><StatusIcon size={14} className={state === "saving" ? "animate-spin" : ""} aria-hidden />{status.text}</span>
        <button type="button" className="btn-ghost" onClick={() => setPreview((v) => !v)} aria-pressed={preview}>{preview ? <><Pencil size={15} aria-hidden />Editar</> : <><Eye size={15} aria-hidden />Vista del alumno</>}</button>
        <button type="button" className="btn-primary" disabled={!dirty || state === "saving"} onClick={() => void save()}>Guardar</button>
      </div>

      <ErrorBanner>{error}</ErrorBanner>

      {preview ? (
        <article className="mx-auto max-w-3xl space-y-8">
          <header><div className="mono-label">Vista previa</div><h1 className="mt-2 text-3xl font-bold tracking-tight">{title || "Sin título"}</h1>{description && <p className="mt-2 text-cb-muted">{description}</p>}</header>
          <LessonBody blocks={blocks} solutions={previewSolutions} />
        </article>
      ) : (
        <div className="mx-auto max-w-4xl space-y-6">
          <section className="panel space-y-4 p-5">
            <label className="block"><span className="label">Título de la lección</span><input className="input text-lg font-semibold" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required /></label>
            <label className="block"><span className="label">Resumen (opcional)</span><textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} placeholder="Qué aprenderá el alumno en esta lección." /></label>
          </section>

          {blocks.length === 0 && <EmptyState icon={FileText} title="Lección vacía" description="Agrega bloques de lectura, video, código, ejercicios, quizzes o recursos descargables." />}

          {blocks.map((block, index) => {
            const Icon = ICONS[block.type];
            return (
              <section key={block.id} className="panel overflow-hidden" aria-label={`Bloque ${index + 1}: ${BLOCK_LABELS[block.type]}`}>
                <div className="flex items-center gap-2 border-b border-cb-line bg-cb-panel2/60 px-4 py-2.5">
                  <Icon size={16} className="text-cb-amber" aria-hidden />
                  <span className="text-sm font-semibold">{index + 1}. {BLOCK_LABELS[block.type]}</span>
                  <div className="ml-auto flex gap-1.5">
                    <button type="button" className="btn-icon h-8 w-8" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Subir bloque" title="Subir"><ArrowUp size={14} /></button>
                    <button type="button" className="btn-icon h-8 w-8" disabled={index === blocks.length - 1} onClick={() => move(index, 1)} aria-label="Bajar bloque" title="Bajar"><ArrowDown size={14} /></button>
                    <button type="button" className="btn-icon h-8 w-8" onClick={() => duplicate(index)} aria-label="Duplicar bloque" title="Duplicar"><Copy size={14} /></button>
                    <ConfirmButton className="btn-icon h-8 w-8 hover:border-red-400/60 hover:text-red-300" title="Eliminar bloque" confirmLabel="¿Sí?" onConfirm={() => setBlocks((list) => list.filter((b) => b.id !== block.id))}><Trash2 size={14} /></ConfirmButton>
                  </div>
                </div>
                <div className="p-4">
                  {block.type === "text" && <TextForm data={block.data} onChange={(p) => update(block.id, p)} />}
                  {block.type === "video" && <VideoForm data={block.data} onChange={(p) => update(block.id, p)} />}
                  {block.type === "code" && <CodeForm data={block.data} onChange={(p) => update(block.id, p)} />}
                  {block.type === "exercise" && <ExerciseForm data={block.data} onChange={(p) => update(block.id, p)} />}
                  {block.type === "quiz" && <QuizForm data={block.data} onChange={(p) => update(block.id, p)} />}
                  {block.type === "download" && <DownloadForm data={block.data} onChange={(p) => update(block.id, p)} courseId={courseId} />}
                </div>
              </section>
            );
          })}

          <section className="panel p-4">
            <div className="mb-3 text-sm font-medium">Agregar bloque</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {(Object.keys(BLOCK_LABELS) as LessonBlockType[]).map((type) => {
                const Icon = ICONS[type];
                return <button key={type} type="button" className="flex flex-col items-center gap-2 rounded-xl border border-cb-line bg-cb-bg p-3 text-xs font-medium text-slate-300 transition hover:border-cb-amber/60 hover:text-white" onClick={() => add(type)}><Icon size={18} className="text-cb-amber" aria-hidden />{BLOCK_LABELS[type]}</button>;
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default function LessonEditorPage() {
  return <Guard roles={["admin", "empleado"]}><Editor /></Guard>;
}
