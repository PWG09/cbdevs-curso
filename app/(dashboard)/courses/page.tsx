"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, Eye, FilePen, Plus, Search, Users } from "lucide-react";
import Guard from "@/components/Guard";
import CourseCover from "@/components/CourseCover";
import { EmptyState, ErrorBanner, LoadingGrid, PageHeader, Pill } from "@/components/ui";
import { listCourses } from "@/lib/data/courses";
import { listRoster } from "@/lib/data/enrollments";
import { messageOf } from "@/lib/errors";
import { formatDate, formatPrice, plural } from "@/lib/format";
import type { Course } from "@/types/course";

function Courses() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [students, setStudents] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "published" | "draft">("all");

  useEffect(() => {
    let active = true;
    Promise.all([listCourses(), listRoster().catch(() => [])]).then(([list, roster]) => {
      if (!active) return;
      setCourses(list);
      const counts = new Map<string, number>();
      for (const entry of roster) counts.set(entry.enrollment.courseId, (counts.get(entry.enrollment.courseId) ?? 0) + 1);
      setStudents(counts);
    }).catch((cause) => { if (active) { setError(messageOf(cause, "No se pudieron cargar los cursos.")); setCourses([]); } });
    return () => { active = false; };
  }, []);

  const visible = useMemo(() => (courses ?? []).filter((c) => {
    if (filter === "published" && !c.published) return false;
    if (filter === "draft" && c.published) return false;
    return !query.trim() || c.title.toLowerCase().includes(query.trim().toLowerCase());
  }), [courses, query, filter]);

  const published = courses?.filter((c) => c.published).length ?? 0;
  const totalStudents = [...students.values()].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Administración" title="Cursos" description="Crea, organiza y publica el contenido de tus cursos." actions={<Link className="btn-primary" href="/courses/new"><Plus size={16} aria-hidden />Nuevo curso</Link>} />

      {courses && courses.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[{ icon: BookOpen, label: "Cursos", value: courses.length }, { icon: Eye, label: "Publicados", value: published }, { icon: Users, label: "Inscripciones activas", value: totalStudents }].map(({ icon: Icon, label, value }) => (
            <div key={label} className="panel flex items-center gap-4 p-5">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-cb-panel2 text-cb-amber"><Icon size={19} aria-hidden /></div>
              <div><div className="text-2xl font-bold">{value}</div><div className="text-sm text-cb-muted">{label}</div></div>
            </div>
          ))}
        </div>
      )}

      <ErrorBanner>{error}</ErrorBanner>

      {courses && courses.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Buscar curso</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-cb-muted" aria-hidden />
            <input className="input pl-9" placeholder="Buscar por título…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <div className="flex gap-1 rounded-xl border border-cb-line bg-cb-panel p-1" role="group" aria-label="Filtrar por estado">
            {([["all", "Todos"], ["published", "Publicados"], ["draft", "Borradores"]] as const).map(([value, label]) => (
              <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`rounded-lg px-3 py-1.5 text-sm transition ${filter === value ? "bg-cb-panel2 text-white" : "text-cb-muted hover:text-white"}`}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {courses === null ? <LoadingGrid /> : courses.length === 0 && !error ? (
        <EmptyState icon={BookOpen} title="Aún no hay cursos" description="Crea tu primer curso, organízalo en fases y lecciones, y publícalo cuando esté listo." action={<Link className="btn-primary" href="/courses/new"><Plus size={16} aria-hidden />Crear curso</Link>} />
      ) : visible.length === 0 ? <p className="text-sm text-cb-muted">Ningún curso coincide con la búsqueda.</p> : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`} className="panel group flex flex-col overflow-hidden transition hover:border-cb-amber/50">
              <div className="relative">
                <CourseCover src={course.thumbnailUrl} title={course.title} />
                <div className="absolute left-3 top-3">{course.published ? <Pill tone="success">Publicado</Pill> : <Pill tone="warning">Borrador</Pill>}</div>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="font-semibold leading-snug group-hover:text-cb-amber">{course.title}</h2>
                <p className="mt-1.5 line-clamp-2 text-sm text-cb-muted">{course.description || "Sin descripción."}</p>
                <div className="mt-auto flex items-center justify-between pt-4 text-xs text-cb-muted">
                  <span className="flex items-center gap-1.5"><Users size={13} aria-hidden />{plural(students.get(course.id) ?? 0, "alumno")}</span>
                  <span className="font-semibold text-slate-200">{formatPrice(course.price)}</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500"><FilePen size={12} aria-hidden />Actualizado {formatDate(course.updatedAt)}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CoursesPage() {
  return <Guard roles={["admin", "empleado"]}><Courses /></Guard>;
}
