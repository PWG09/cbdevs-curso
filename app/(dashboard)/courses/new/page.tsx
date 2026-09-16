"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCourse } from "@/lib/firestore/courses";
import { uploadCourseFile } from "@/lib/firebase/storage";
import { useAuth } from "@/providers/auth-provider";

export default function NewCoursePage() {
  const router = useRouter();
  const { appUser } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!appUser || !["admin", "empleado"].includes(appUser.role)) return;
    try {
      const id = await createCourse({
        title: title.trim(),
        description: description.trim(),
        price: Number(price) || 0,
        published: false,
        createdBy: appUser.uid,
        thumbnailUrl: thumbnailUrl || null,
      });
      router.push(`/courses/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el curso.");
    }
  }

  async function uploadThumbnail(file?: File) {
    if (!file || !appUser) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadCourseFile(file, `course-thumbnails/${appUser.uid}/${Date.now()}-${file.name}`);
      setThumbnailUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="editor-page">
      <div className="top-actions">
        <div>
          <p className="eyebrow">CBDEVS · Crear</p>
          <h1>Crear curso</h1>
          <p className="muted">Primero crea la ficha del curso. Después podrás construir sus fases y lecciones.</p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <form className="card course-form" onSubmit={submit}>
        <div className="field">
          <label>Título del curso</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej. ..." required />
        </div>
        <div className="field">
          <label>Descripción</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="¿Qué aprenderá el alumno?" />
        </div>
        <div className="form-grid">
          <div className="field">
            <label>Precio</label>
            <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div className="field">
            <label>Imagen de portada</label>
            <input type="file" accept="image/*" onChange={(e) => uploadThumbnail(e.target.files?.[0])} />
            {uploading && <span className="muted">Subiendo imagen...</span>}
            {thumbnailUrl && <img className="thumbnail-preview" src={thumbnailUrl} alt="Portada" />}
          </div>
        </div>
        <div className="notice">El curso se creará como <strong>borrador</strong>. Podrás publicarlo cuando esté listo.</div>
        <button className="btn btn-primary" disabled={uploading}>{uploading ? "Subiendo..." : "Crear curso y empezar"}</button>
      </form>
    </div>
  );
}
