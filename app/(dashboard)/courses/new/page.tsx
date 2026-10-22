"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import Guard from "@/components/Guard";
import CoverInput from "@/components/CoverInput";
import { ErrorBanner, Field, PageHeader } from "@/components/ui";
import { createCourse, updateCourse } from "@/lib/data/courses";
import { IMAGE_TYPES, uploadCourseAsset, validateUpload } from "@/lib/data/storage";
import { messageOf } from "@/lib/errors";

function NewCourse() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("0");
  const [cover, setCover] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (cover) validateUpload(cover, IMAGE_TYPES);
      const id = await createCourse({ title, description, price: Number(price), published: false });
      if (cover) {
        try {
          const path = await uploadCourseAsset(cover, id, IMAGE_TYPES);
          await updateCourse(id, { thumbnail: path });
        } catch {
          // The course exists; send the user there and let them retry the cover.
        }
      }
      router.replace(`/courses/${id}`);
    } catch (cause) {
      setError(messageOf(cause, "No se pudo crear el curso."));
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader back={<Link className="inline-flex items-center gap-1.5 text-sm text-cb-muted hover:text-white" href="/courses"><ArrowLeft size={15} aria-hidden />Cursos</Link>} eyebrow="Nuevo curso" title="Crear curso" description="Se crea como borrador. Podrás agregar fases y lecciones y publicarlo cuando esté listo." />
      <form onSubmit={submit} className="panel space-y-5 p-6">
        <Field label="Título"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} placeholder="Ej. Desarrollo web con Next.js" /></Field>
        <Field label="Descripción" hint="Qué aprenderá el alumno y para quién es el curso."><textarea className="input min-h-[120px]" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} /></Field>
        <Field label="Precio (MXN)" hint="Informativo. Usa 0 para cursos gratuitos."><input className="input max-w-[200px]" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
        <CoverInput file={cover} onChange={setCover} />
        <ErrorBanner>{error}</ErrorBanner>
        <div className="flex justify-end gap-3 border-t border-cb-line pt-5">
          <Link className="btn-ghost" href="/courses">Cancelar</Link>
          <button className="btn-primary" disabled={busy}><Plus size={16} aria-hidden />{busy ? "Creando…" : "Crear curso"}</button>
        </div>
      </form>
    </div>
  );
}

export default function NewCoursePage() {
  return <Guard roles={["admin", "empleado"]}><NewCourse /></Guard>;
}
