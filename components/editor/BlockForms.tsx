"use client";

import { useId, useState } from "react";
import { CheckCircle2, FileUp, Plus, Trash2, XCircle } from "lucide-react";
import RichTextEditor from "@/components/editor/RichTextEditor";
import CodeEditor from "@/components/editor/CodeEditor";
import { ErrorBanner, Field } from "@/components/ui";
import { CODE_LANGUAGES } from "@/lib/blocks";
import { parseVideoUrl } from "@/lib/video";
import { isStorageObjectPath, safeExternalUrl } from "@/lib/safe-url";
import { RESOURCE_ACCEPT, RESOURCE_TYPES, uploadCourseAsset } from "@/lib/data/storage";
import { messageOf } from "@/lib/errors";
import type { LessonBlock } from "@/types/course";

type DataOf<T extends LessonBlock["type"]> = Extract<LessonBlock, { type: T }>["data"];
type FormProps<T extends LessonBlock["type"]> = { data: DataOf<T>; onChange: (patch: Partial<DataOf<T>>) => void };

function UrlStatus({ ok, okText, badText }: { ok: boolean; okText: string; badText: string }) {
  return ok
    ? <span className="mt-1.5 flex items-center gap-1 text-xs text-emerald-300"><CheckCircle2 size={13} aria-hidden />{okText}</span>
    : <span className="mt-1.5 flex items-center gap-1 text-xs text-cb-amber"><XCircle size={13} aria-hidden />{badText}</span>;
}

export function TextForm({ data, onChange }: FormProps<"text">) {
  return <RichTextEditor value={data.html} onChange={(html) => onChange({ html })} label="Contenido de lectura" />;
}

export function VideoForm({ data, onChange }: FormProps<"video">) {
  const source = parseVideoUrl(data.url);
  return (
    <div className="space-y-4">
      <Field label="URL del video">
        <input className="input" placeholder="https://www.youtube.com/watch?v=… o https://vimeo.com/…" value={data.url} onChange={(e) => onChange({ url: e.target.value, path: undefined })} maxLength={2048} />
        {data.url && <UrlStatus ok={source.kind !== "none"} okText={source.kind === "embed" ? `Video de ${source.provider === "youtube" ? "YouTube" : "Vimeo"} listo` : "Archivo de video listo"} badText="Usa un enlace https de YouTube, Vimeo o un archivo .mp4/.webm" />}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Título (opcional)"><input className="input" value={data.title} onChange={(e) => onChange({ title: e.target.value })} maxLength={300} /></Field>
        <Field label="Descripción (opcional)"><input className="input" value={data.description} onChange={(e) => onChange({ description: e.target.value })} maxLength={5000} /></Field>
      </div>
    </div>
  );
}

export function CodeForm({ data, onChange }: FormProps<"code">) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-3 text-sm"><span className="text-cb-muted">Lenguaje</span>
        <select className="input w-auto" value={data.language} onChange={(e) => onChange({ language: e.target.value })}>
          {CODE_LANGUAGES.map((lang) => <option key={lang} value={lang}>{lang}</option>)}
        </select>
      </label>
      <CodeEditor value={data.code} onChange={(code) => onChange({ code })} language={data.language} label="Código de ejemplo" />
    </div>
  );
}

export function ExerciseForm({ data, onChange }: FormProps<"exercise">) {
  return (
    <div className="space-y-4">
      <Field label="Enunciado del reto"><textarea className="input min-h-[110px]" value={data.challenge} onChange={(e) => onChange({ challenge: e.target.value })} maxLength={20000} placeholder="Describe qué debe construir o resolver el alumno." /></Field>
      <div>
        <span className="label">Solución</span>
        <CodeEditor value={data.solutionCode ?? ""} onChange={(solutionCode) => onChange({ solutionCode })} language="javascript" label="Código de la solución" minHeight={160} />
        <span className="mt-1.5 block text-xs text-cb-muted">Se guarda por separado. Los alumnos solo la ven cuando la liberas.</span>
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-3 rounded-xl border border-cb-line bg-cb-bg px-3 py-2 text-sm">
        <input type="checkbox" className="h-4 w-4 accent-[#f2a950]" checked={data.solutionReleased} onChange={(e) => onChange({ solutionReleased: e.target.checked })} />
        Liberar solución a los alumnos
      </label>
    </div>
  );
}

export function QuizForm({ data, onChange }: FormProps<"quiz">) {
  const group = useId();
  const options = data.options.length ? data.options : ["", ""];
  const feedback = options.map((_, i) => data.feedback[i] ?? "");
  const setOption = (index: number, value: string) => { const next = [...options]; next[index] = value; onChange({ options: next }); };
  const setFeedback = (index: number, value: string) => { const next = [...feedback]; next[index] = value; onChange({ feedback: next }); };
  const remove = (index: number) => {
    const nextOptions = options.filter((_, i) => i !== index);
    const nextFeedback = feedback.filter((_, i) => i !== index);
    const correct = data.correct === index ? 0 : data.correct > index ? data.correct - 1 : data.correct;
    onChange({ options: nextOptions, feedback: nextFeedback, correct });
  };
  return (
    <div className="space-y-4">
      <Field label="Pregunta"><input className="input" value={data.question} onChange={(e) => onChange({ question: e.target.value })} maxLength={2000} /></Field>
      <fieldset className="space-y-2">
        <legend className="label">Opciones (marca la correcta)</legend>
        {options.map((option, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-cb-line bg-cb-bg p-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-center">
            <input type="radio" className="h-4 w-4 accent-[#f2a950]" name={`correct-${group}`} checked={data.correct === index} onChange={() => onChange({ correct: index })} aria-label={`Marcar opción ${index + 1} como correcta`} />
            <input className="input" placeholder={`Opción ${index + 1}`} value={option} onChange={(e) => setOption(index, e.target.value)} maxLength={2000} />
            <input className="input" placeholder="Retroalimentación (opcional)" value={feedback[index]} onChange={(e) => setFeedback(index, e.target.value)} maxLength={2000} />
            <button type="button" className="btn-icon" disabled={options.length <= 2} onClick={() => remove(index)} aria-label={`Quitar opción ${index + 1}`}><Trash2 size={14} /></button>
          </div>
        ))}
      </fieldset>
      <button type="button" className="btn-ghost" disabled={options.length >= 6} onClick={() => onChange({ options: [...options, ""], feedback: [...feedback, ""] })}><Plus size={15} aria-hidden />Agregar opción</button>
    </div>
  );
}

export function DownloadForm({ data, onChange, courseId }: FormProps<"download"> & { courseId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hasFile = isStorageObjectPath(data.path);
  const fileName = hasFile ? data.path.split("/").pop()?.replace(/^[0-9a-f-]{36}-/i, "") : "";
  return (
    <div className="space-y-4">
      <Field label="Nombre del recurso"><input className="input" value={data.name} onChange={(e) => onChange({ name: e.target.value })} maxLength={300} placeholder="Ej. Plantilla del proyecto" /></Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="label">Subir archivo</span>
          <label className="btn-ghost w-full cursor-pointer"><FileUp size={16} aria-hidden />{busy ? "Subiendo…" : hasFile ? "Reemplazar archivo" : "Elegir archivo"}
            <input type="file" className="sr-only" accept={RESOURCE_ACCEPT} disabled={busy} onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setBusy(true); setError("");
              try {
                const path = await uploadCourseAsset(file, courseId, RESOURCE_TYPES);
                onChange({ path, url: "", name: data.name || file.name });
              } catch (cause) { setError(messageOf(cause, "No se pudo subir el archivo.")); } finally { setBusy(false); }
            }} />
          </label>
          <span className="mt-1.5 block truncate text-xs text-cb-muted">{hasFile ? `Archivo: ${fileName}` : "PDF, ZIP, TXT o imagen · máx. 10 MB"}</span>
        </div>
        <Field label="…o enlace externo">
          <input className="input" placeholder="https://…" value={data.url} onChange={(e) => onChange({ url: e.target.value, path: "" })} maxLength={2048} disabled={hasFile} />
          {!hasFile && data.url && <UrlStatus ok={Boolean(safeExternalUrl(data.url))} okText="Enlace válido" badText="Solo se permiten enlaces https://" />}
        </Field>
      </div>
      {hasFile && <button type="button" className="text-xs text-cb-muted underline-offset-4 hover:text-white hover:underline" onClick={() => onChange({ path: "" })}>Quitar archivo y usar un enlace</button>}
      <ErrorBanner>{error}</ErrorBanner>
    </div>
  );
}
