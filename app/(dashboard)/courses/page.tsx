"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAllCourses, getEmployeeCourses } from "@/lib/firestore/courses";
import { getUserEnrollments } from "@/lib/firestore/enrollments";
import { useAuth } from "@/providers/auth-provider";
import type { Course } from "@/types/course";

export default function CoursesPage() {
  const { appUser } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!appUser) return;

    (async () => {
      try {
        if (appUser.role === "admin") {
          setCourses(await getAllCourses());
        } else if (appUser.role === "empleado") {
          setCourses(await getEmployeeCourses(appUser.uid));
        } else {
          const enrollments = await getUserEnrollments(appUser.uid);
          const result: Course[] = [];
          for (const enrollment of enrollments) {
            const res = await import("@/lib/firestore/courses").then(m => m.getCourse(enrollment.courseId));
            if (res) result.push(res);
          }
          setCourses(result);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los cursos.");
      }
    })();
  }, [appUser]);

  return (
    <>
      <div className="top-actions">
        <div>
          <h1>Cursos</h1>
          <p className="muted">
            {appUser?.role === "cliente" ? "Tus cursos inscritos." : "Administración de contenido."}
          </p>
        </div>
        {(appUser?.role === "admin" || appUser?.role === "empleado") && (
          <Link href="/courses/new" className="btn btn-primary">Nuevo curso</Link>
        )}
      </div>

      {error && <div className="error">{error}</div>}

      <div className="grid grid-2">
        {courses.map(course => (
          <div className="card" key={course.id}>
            <span className={`badge ${course.published ? "badge-teal" : ""}`}>
              {course.published ? "Publicado" : "Borrador"}
            </span>
            <h2>{course.title}</h2>
            <p className="muted">{course.description}</p>
            <div className="row between">
              <strong>${course.price}</strong>
              <Link className="btn" href={
                appUser?.role === "cliente"
                  ? `/learn/${course.id}`
                  : `/courses/${course.id}`
              }>
                {appUser?.role === "cliente" ? "Continuar" : "Administrar"}
              </Link>
            </div>
          </div>
        ))}
      </div>

      {!courses.length && !error && (
        <div className="card"><p className="muted">No hay cursos disponibles.</p></div>
      )}
    </>
  );
}
