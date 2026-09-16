"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getCourse, updateCourse } from "@/lib/firestore/courses";
import type { Course } from "@/types/course";

export default function EditCoursePage() {
  const params = useParams<{ courseId: string }>();
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [published, setPublished] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getCourse(params.courseId).then(c => {
      setCourse(c);
      if (c) {
        setTitle(c.title);
        setDescription(c.description);
        setPrice(String(c.price));
        setPublished(c.published);
      }
    }).catch(e => setError(e.message));
  }, [params.courseId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateCourse(params.courseId, {
        title, description, price: Number(price), published
      });
      router.push(`/courses/${params.courseId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo actualizar.");
    }
  }

  if (!course) return <p className="muted">Cargando...</p>;

  return (
    <>
      <h1>Editar curso</h1>
      <div className="card" style={{ maxWidth: 800 }}>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>Título</label><input value={title} onChange={e => setTitle(e.target.value)} required /></div>
          <div className="field"><label>Descripción</label><textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
          <div className="field"><label>Precio</label><input type="number" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} /></div>
          <label className="row" style={{ marginBottom: 16 }}>
            <input type="checkbox" checked={published} onChange={e => setPublished(e.target.checked)} />
            Publicado
          </label>
          <button className="btn btn-primary">Guardar cambios</button>
        </form>
      </div>
    </>
  );
}
