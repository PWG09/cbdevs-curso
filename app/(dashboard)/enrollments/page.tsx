"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { RotateCcw, UserMinus, UserPlus } from "lucide-react";
import Guard from "@/components/Guard";
import { ConfirmButton, EmptyState, ErrorBanner, Field, PageHeader, Pill, Skeleton, SuccessBanner } from "@/components/ui";
import { listCourses } from "@/lib/data/courses";
import { enrollByEmail, listRoster, setEnrollmentActive, type RosterEntry } from "@/lib/data/enrollments";
import { messageOf } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import type { Course } from "@/types/course";

function Enrollments() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [rows, setRows] = useState<RosterEntry[] | null>(null);
  const [courseId, setCourseId] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [courseFilter, setCourseFilter] = useState("");

  const load = useCallback(async () => {
    const [c, r] = await Promise.all([listCourses(), listRoster({ includeInactive: true })]);
    setCourses(c);
    setRows(r);
  }, []);

  useEffect(() => { load().catch((cause) => { setError(messageOf(cause, "No se pudieron cargar las inscripciones.")); setRows([]); }); }, [load]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    try {
      await enrollByEmail(courseId, email);
      const title = courses.find((c) => c.id === courseId)?.title ?? "el curso";
      setNotice(`${email.trim().toLowerCase()} ya tiene acceso a “${title}”.`);
      setEmail("");
      await load();
    } catch (cause) { setError(messageOf(cause, "No se pudo inscribir al alumno.")); } finally { setBusy(false); }
  }

  async function toggle(entry: RosterEntry) {
    setError(""); setNotice("");
    try { await setEnrollmentActive(entry.enrollment.id, !entry.enrollment.active); await load(); }
    catch (cause) { setError(messageOf(cause, "No se pudo actualizar la inscripción.")); }
  }

  const titles = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const visible = (rows ?? []).filter((r) => (showInactive || r.enrollment.active) && (!courseFilter || r.enrollment.courseId === courseFilter));
  const selected = titles.get(courseId);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Acceso" title="Inscripciones" description="Da acceso a un curso con el correo de la cuenta del alumno. El alumno debe registrarse primero en CBDEVS Cursos." />

      <form onSubmit={submit} className="panel space-y-4 p-6">
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <Field label="Curso"><select className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)} required><option value="">Selecciona un curso</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}{c.published ? "" : " (borrador)"}</option>)}</select></Field>
          <Field label="Correo del alumno"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="alumno@correo.com" required maxLength={254} autoComplete="off" /></Field>
          <button className="btn-primary h-[42px]" disabled={busy || !courseId || !email.trim()}><UserPlus size={16} aria-hidden />{busy ? "Inscribiendo…" : "Inscribir"}</button>
        </div>
        {selected && !selected.published && <p className="text-xs text-cb-amber">Este curso es un borrador: el alumno lo verá cuando lo publiques.</p>}
        <ErrorBanner>{error}</ErrorBanner>
        <SuccessBanner>{notice}</SuccessBanner>
      </form>

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-cb-line p-4 sm:flex-row sm:items-center">
          <h2 className="font-semibold">Inscripciones</h2>
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:justify-end">
            <label><span className="sr-only">Filtrar por curso</span><select className="input sm:w-60" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}><option value="">Todos los cursos</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
            <label className="flex items-center gap-2 text-sm text-cb-muted"><input type="checkbox" className="h-4 w-4 accent-[#f2a950]" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />Mostrar bajas</label>
          </div>
        </div>
        {rows === null ? <div className="p-4"><Skeleton className="h-40" /></div> : visible.length === 0 ? (
          <div className="p-5"><EmptyState icon={UserPlus} title="Sin inscripciones" description="Las inscripciones que crees aparecerán aquí." /></div>
        ) : (
          <ul className="divide-y divide-cb-line">
            {visible.map((entry) => (
              <li key={entry.enrollment.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1"><div className="truncate font-medium">{entry.name}</div><div className="truncate text-xs text-cb-muted">{entry.email}</div></div>
                <div className="min-w-0 flex-1 text-sm"><div className="truncate">{titles.get(entry.enrollment.courseId)?.title ?? "Curso"}</div><div className="text-xs text-slate-500">Desde {formatDate(entry.enrollment.enrolledAt)} · {entry.percent}% completado</div></div>
                <div className="flex items-center gap-2">
                  {entry.enrollment.active ? <Pill tone="success">Activa</Pill> : <Pill>Baja</Pill>}
                  {entry.enrollment.active
                    ? <ConfirmButton className="btn-ghost px-3 py-2" confirmLabel="¿Dar de baja?" onConfirm={() => toggle(entry)}><UserMinus size={15} aria-hidden />Dar de baja</ConfirmButton>
                    : <button type="button" className="btn-ghost px-3 py-2" onClick={() => void toggle(entry)}><RotateCcw size={15} aria-hidden />Reactivar</button>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function EnrollmentsPage() {
  return <Guard roles={["admin", "empleado"]}><Enrollments /></Guard>;
}
