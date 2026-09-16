"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteCourse, getCourse, updateCourse } from "@/lib/firestore/courses";
import {
  createLesson,
  createPhase,
  deleteLesson,
  deletePhase,
  getLessons,
  getPhases,
  reorderPhases,
  updateLesson,
  updatePhase,
} from "@/lib/firestore/course-structure";
import { useAuth } from "@/providers/auth-provider";
import type { Course, CourseLesson, CoursePhase } from "@/types/course";

export default function CourseBuilderPage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const { appUser } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [phases, setPhases] = useState<CoursePhase[]>([]);
  const [lessons, setLessons] = useState<Record<string, CourseLesson[]>>({});
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [phaseTitle, setPhaseTitle] = useState("");
  const [phaseDescription, setPhaseDescription] = useState("");
  const [lessonDraft, setLessonDraft] = useState<Record<string, string>>({});
  const [editingPhase, setEditingPhase] = useState<string | null>(null);
  const [editingPhaseTitle, setEditingPhaseTitle] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const canEdit = appUser?.role === "admin" || appUser?.role === "empleado";


  async function load() {
    const c = await getCourse(params.courseId);
    setCourse(c);
    const ps = await getPhases(params.courseId);
    setPhases(ps);
    const map: Record<string, CourseLesson[]> = {};
    for (const p of ps) map[p.id] = await getLessons(params.courseId, p.id);
    setLessons(map);
    setOpen((current) => {
      const next = { ...current };
      ps.forEach((p) => { if (next[p.id] === undefined) next[p.id] = true; });
      return next;
    });
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [params.courseId]);

  async function addPhase(e: React.FormEvent) {
    e.preventDefault();
    if (!phaseTitle.trim()) return;
    setSaving(true);
    try {
      await createPhase(params.courseId, phaseTitle.trim(), phaseDescription.trim(), phases.length);
      setPhaseTitle("");
      setPhaseDescription("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la fase.");
    } finally { setSaving(false); }
  }

  async function addLesson(e: React.FormEvent, phase: CoursePhase) {
    e.preventDefault();
    const title = (lessonDraft[phase.id] || "").trim();
    if (!title) return;
    setSaving(true);
    try {
      await createLesson(params.courseId, phase.id, title, "", lessons[phase.id]?.length || 0);
      setLessonDraft((d) => ({ ...d, [phase.id]: "" }));
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear la lección.");
    } finally { setSaving(false); }
  }

  async function removePhase(phase: CoursePhase) {
    if (!confirm(`¿Eliminar "${phase.title}" y sus lecciones?`)) return;
    try { await deletePhase(params.courseId, phase.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar la fase."); }
  }

  async function removeLesson(phase: CoursePhase, lesson: CourseLesson) {
    if (!confirm(`¿Eliminar "${lesson.title}"?`)) return;
    try { await deleteLesson(params.courseId, phase.id, lesson.id); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo eliminar la lección."); }
  }

  async function movePhase(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= phases.length) return;
    const next = [...phases];
    [next[index], next[target]] = [next[target], next[index]];
    setPhases(next);
    try { await reorderPhases(params.courseId, next); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudo reordenar."); await load(); }
  }

  async function savePhaseTitle(phase: CoursePhase) {
    if (!editingPhaseTitle.trim()) return;
    try {
      await updatePhase(params.courseId, phase.id, { title: editingPhaseTitle.trim() });
      setEditingPhase(null);
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo guardar."); }
  }

  async function togglePublished() {
    if (!course) return;
    try {
      await updateCourse(params.courseId, { published: !course.published });
      setCourse({ ...course, published: !course.published });
    } catch (e) { setError(e instanceof Error ? e.message : "No se pudo cambiar el estado."); }
  }

  async function removeCourse() {
    if (!confirm("¿Eliminar este curso? Esta acción no se puede deshacer.")) return;
    await deleteCourse(params.courseId);
    router.push("/courses");
  }

  if (!canEdit) return <p className="muted">No tienes permiso para administrar este curso.</p>;

  if (!course) return <p className="muted">Cargando curso...</p>;

  return (
    <div className="editor-page">
      <div className="top-actions course-header">
        <div>
          <Link href="/courses" className="muted">← Cursos</Link>
          <p className="eyebrow">Constructor de curso</p>
          <h1>{course.title}</h1>
          <p className="muted">{course.description}</p>
          <span className={`badge ${course.published ? "badge-teal" : "badge-amber"}`}>
            {course.published ? "Publicado" : "Borrador"}
          </span>
        </div>
        <div className="row wrap">
          <Link href={`/courses/${params.courseId}/edit`} className="btn">Editar datos</Link>
          <button className="btn" onClick={togglePublished}>{course.published ? "Pasar a borrador" : "Publicar curso"}</button>
          {appUser?.role === "admin" && <button className="btn btn-danger" onClick={removeCourse}>Eliminar</button>}
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="builder-layout">
        <section>
          <div className="section-heading">
            <div>
              <h2>Contenido del curso</h2>
              <p className="muted">Organiza el curso en fases y lecciones.</p>
            </div>
            <span className="badge">{phases.length} fases</span>
          </div>

          <div className="phase-list">
            {phases.map((phase, index) => (
              <div className="phase-card" key={phase.id}>
                <div className="phase-head">
                  <button className="collapse-button" onClick={() => setOpen((o) => ({ ...o, [phase.id]: !o[phase.id] }))}>
                    {open[phase.id] ? "⌄" : "›"}
                  </button>
                  <span className="phase-number">{index + 1}</span>
                  <div className="phase-title-wrap">
                    {editingPhase === phase.id ? (
                      <div className="inline-edit">
                        <input value={editingPhaseTitle} onChange={(e) => setEditingPhaseTitle(e.target.value)} autoFocus />
                        <button className="btn btn-primary" onClick={() => savePhaseTitle(phase)}>Guardar</button>
                        <button className="btn" onClick={() => setEditingPhase(null)}>Cancelar</button>
                      </div>
                    ) : (
                      <>
                        <h3>{phase.title}</h3>
                        {phase.description && <p className="muted">{phase.description}</p>}
                      </>
                    )}
                  </div>
                  <div className="row">
                    <button className="icon-btn" title="Subir" onClick={() => movePhase(index, -1)} disabled={index === 0}>↑</button>
                    <button className="icon-btn" title="Bajar" onClick={() => movePhase(index, 1)} disabled={index === phases.length - 1}>↓</button>
                    <button className="icon-btn" title="Editar" onClick={() => { setEditingPhase(phase.id); setEditingPhaseTitle(phase.title); }}>✎</button>
                    <button className="icon-btn danger-text" title="Eliminar" onClick={() => removePhase(phase)}>×</button>
                  </div>
                </div>

                {open[phase.id] && (
                  <div className="phase-body">
                    {(lessons[phase.id] || []).map((lesson, li) => (
                      <div className="lesson-row" key={lesson.id}>
                        <span className="lesson-drag">⋮⋮</span>
                        <span className="lesson-number">{li + 1}</span>
                        <div className="lesson-info">
                          <strong>{lesson.title}</strong>
                          <span className="muted">{lesson.blocks?.length || 0} bloques</span>
                        </div>
                        <span className={`badge ${lesson.published ? "badge-teal" : ""}`}>{lesson.published ? "Publicado" : "Borrador"}</span>
                        <Link className="btn btn-primary" href={`/courses/${params.courseId}/phases/${phase.id}/lessons/${lesson.id}`}>Abrir editor</Link>
                        <button className="icon-btn danger-text" onClick={() => removeLesson(phase, lesson)}>×</button>
                      </div>
                    ))}

                    <form className="add-lesson" onSubmit={(e) => addLesson(e, phase)}>
                      <input
                        value={lessonDraft[phase.id] || ""}
                        onChange={(e) => setLessonDraft((d) => ({ ...d, [phase.id]: e.target.value }))}
                        placeholder="Nombre de la nueva lección..."
                      />
                      <button className="btn" disabled={saving}>+ Agregar lección</button>
                    </form>
                  </div>
                )}
              </div>
            ))}

            {!phases.length && (
              <div className="empty-builder">
                <div className="empty-icon">＋</div>
                <h3>Tu curso está vacío</h3>
                <p className="muted">Empieza agregando la primera fase.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="sticky-card card">
          <h3>+ Agregar fase</h3>
          <form onSubmit={addPhase}>
            <div className="field">
              <label>Nombre de la fase</label>
              <input value={phaseTitle} onChange={(e) => setPhaseTitle(e.target.value)} placeholder="Ej. Fase 1: Fundamentos" required />
            </div>
            <div className="field">
              <label>Descripción (opcional)</label>
              <textarea value={phaseDescription} onChange={(e) => setPhaseDescription(e.target.value)} placeholder="¿Qué aprenderá aquí?" />
            </div>
            <button className="btn btn-primary" disabled={saving}>Agregar fase</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
