"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserPlus, Users } from "lucide-react";
import Guard from "@/components/Guard";
import { EmptyState, ErrorBanner, PageHeader, ProgressBar, Skeleton } from "@/components/ui";
import { listCourses } from "@/lib/data/courses";
import { listRoster, type RosterEntry } from "@/lib/data/enrollments";
import { messageOf } from "@/lib/errors";
import { formatDate, initialsFrom } from "@/lib/format";
import type { Course } from "@/types/course";

function Students() {
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [courseFilter, setCourseFilter] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([listRoster(), listCourses()]).then(([r, c]) => { if (active) { setRoster(r); setCourses(c); } })
      .catch((cause) => { if (active) { setError(messageOf(cause, "No se pudieron cargar los alumnos.")); setRoster([]); } });
    return () => { active = false; };
  }, []);

  const courseTitle = useMemo(() => new Map(courses.map((c) => [c.id, c.title])), [courses]);
  const visible = useMemo(() => (roster ?? []).filter((r) => {
    if (courseFilter && r.enrollment.courseId !== courseFilter) return false;
    const q = query.trim().toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  }), [roster, query, courseFilter]);
  const uniqueStudents = new Set((roster ?? []).map((r) => r.enrollment.userId)).size;
  const avg = roster?.length ? Math.round(roster.reduce((s, r) => s + r.percent, 0) / roster.length) : 0;
  const finished = (roster ?? []).filter((r) => r.total > 0 && r.completed === r.total).length;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Seguimiento" title="Alumnos" description="Avance de cada alumno en los cursos en los que está inscrito." actions={<Link className="btn-primary" href="/enrollments"><UserPlus size={16} aria-hidden />Inscribir alumno</Link>} />

      {roster && roster.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[["Alumnos", uniqueStudents], ["Avance promedio", `${avg}%`], ["Cursos terminados", finished]].map(([label, value]) => (
            <div key={label} className="panel p-5"><div className="text-2xl font-bold">{value}</div><div className="text-sm text-cb-muted">{label}</div></div>
          ))}
        </div>
      )}

      <ErrorBanner>{error}</ErrorBanner>

      {roster === null ? <Skeleton className="h-80" /> : roster.length === 0 && !error ? (
        <EmptyState icon={Users} title="Aún no hay alumnos inscritos" description="Inscribe a un alumno con el correo de su cuenta para que pueda acceder a un curso." action={<Link className="btn-primary" href="/enrollments"><UserPlus size={16} aria-hidden />Inscribir alumno</Link>} />
      ) : (
        <section className="panel overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-cb-line p-4 sm:flex-row">
            <label className="relative flex-1"><span className="sr-only">Buscar alumno</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cb-muted" aria-hidden /><input className="input pl-9" placeholder="Buscar por nombre o correo…" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
            <label><span className="sr-only">Filtrar por curso</span><select className="input sm:w-64" value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)}><option value="">Todos los cursos</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
          </div>
          {visible.length === 0 ? <p className="p-5 text-sm text-cb-muted">Ningún alumno coincide con el filtro.</p> : (
            <ul className="divide-y divide-cb-line">
              {visible.map((r) => (
                <li key={r.enrollment.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(140px,.8fr)] sm:items-center">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cb-panel2 font-mono text-xs text-cb-amber" aria-hidden>{initialsFrom(r.name)}</div>
                    <div className="min-w-0"><div className="truncate font-medium">{r.name}</div><div className="truncate text-xs text-cb-muted">{r.email}</div></div>
                  </div>
                  <div className="min-w-0 text-sm"><div className="truncate">{courseTitle.get(r.enrollment.courseId) ?? "Curso"}</div><div className="text-xs text-slate-500">Inscrito {formatDate(r.enrollment.enrolledAt)}{r.lastActivity ? ` · Última actividad ${formatDate(r.lastActivity)}` : ""}</div></div>
                  <div>
                    <div className="mb-1.5 flex justify-between text-xs"><span className="text-cb-muted">{r.completed}/{r.total} lecciones</span><span className="font-semibold">{r.percent}%</span></div>
                    <ProgressBar value={r.percent} label={`Avance de ${r.name}`} size="sm" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

export default function StudentsPage() {
  return <Guard roles={["admin", "empleado"]}><Students /></Guard>;
}
