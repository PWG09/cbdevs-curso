"use client";

import { useEffect, useState } from "react";
import { getAllCourses, getEmployeeCourses } from "@/lib/firestore/courses";
import { getCourseEnrollments, setEnrollment } from "@/lib/firestore/enrollments";
import { getCourseProgress } from "@/lib/firestore/progress";
import { useAuth } from "@/providers/auth-provider";
import { db } from "@/lib/firebase/firestore";
import { collection, getDocs, query, where } from "firebase/firestore";
import type { Course } from "@/types/course";
import type { AppUser } from "@/types/user";

export default function StudentsPage() {
  const { appUser } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [clients, setClients] = useState<AppUser[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [enrolled, setEnrolled] = useState<string[]>([]);
  const [progressCount, setProgressCount] = useState<Record<string, number>>({});
  const [error, setError] = useState("");

  async function load() {
    if (!appUser) return;

    const courseList = appUser.role === "admin"
      ? await getAllCourses()
      : await getEmployeeCourses(appUser.uid);

    setCourses(courseList);

    const snap = await getDocs(
      query(collection(db, "users"), where("role", "==", "cliente"))
    );
    setClients(snap.docs.map(d => d.data() as AppUser));
  }

  async function loadEnrollments(courseId: string) {
    const rows = await getCourseEnrollments(courseId);
    setEnrolled(rows.map(r => r.userId));

    const counts: Record<string, number> = {};
    for (const row of rows) {
      const p = await getCourseProgress(row.userId, courseId);
      counts[row.userId] = p.filter((x) => x.completed === true).length;
    }
    setProgressCount(counts);
  }

  useEffect(() => { load().catch(e => setError(e.message)); }, [appUser]);

  useEffect(() => {
    if (selectedCourse) loadEnrollments(selectedCourse).catch(e => setError(e.message));
  }, [selectedCourse]);

  async function enroll() {
    if (!appUser || appUser.role !== "admin" || !selectedCourse || !selectedClient) return;
    await setEnrollment(selectedClient, selectedCourse, appUser.uid, true);
    await loadEnrollments(selectedCourse);
  }

  return (
    <>
      <h1>Alumnos</h1>
      <p className="muted">Inscripciones y progreso por curso.</p>

      {error && <div className="error">{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="grid grid-3">
          <div className="field">
            <label>Curso</label>
            <select value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
              <option value="">Selecciona un curso</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          {appUser?.role === "admin" && (
            <>
              <div className="field">
                <label>Cliente</label>
                <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
                  <option value="">Selecciona un cliente</option>
                  {clients.map(c => <option key={c.uid} value={c.uid}>{c.name || c.email}</option>)}
                </select>
              </div>
              <div style={{ alignSelf: "end", marginBottom: 15 }}>
                <button className="btn btn-primary" onClick={enroll}>Inscribir alumno</button>
              </div>
            </>
          )}
        </div>
      </div>

      {selectedCourse && (
        <div className="card">
          <h2>Alumnos inscritos</h2>
          <div className="list">
            {enrolled.map(uid => {
              const client = clients.find(c => c.uid === uid);
              return (
                <div className="list-item" key={uid}>
                  <div className="row between">
                    <div>
                      <strong>{client?.name || client?.email || uid}</strong>
                      <div className="muted">{client?.email}</div>
                    </div>
                    <span className="badge badge-teal">
                      {progressCount[uid] ?? 0} completadas
                    </span>
                  </div>
                </div>
              );
            })}
            {!enrolled.length && <p className="muted">No hay alumnos inscritos.</p>}
          </div>
        </div>
      )}
    </>
  );
}
