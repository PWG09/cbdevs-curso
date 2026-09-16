"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  getLesson,
  saveLessonBlocks,
  updateLesson,
} from "@/lib/firestore/course-structure";
import { uploadCourseFile } from "@/lib/firebase/storage";
import { useAuth } from "@/providers/auth-provider";
import type { CourseLesson, LessonBlock, LessonBlockType } from "@/types/course";

const labels: Record<LessonBlockType, { title: string; hint: string; icon: string }> = {
  text: { title: "Texto", hint: "Explicaciones y lectura", icon: "T" },
  video: { title: "Video", hint: "YouTube, Vimeo o archivo", icon: "▶" },
  code: { title: "Código", hint: "Ejemplos de programación", icon: "</>" },
  exercise: { title: "Ejercicio", hint: "Reto práctico", icon: "◆" },
  quiz: { title: "Quiz", hint: "Pregunta con respuestas", icon: "?" },
  resource: { title: "Recurso", hint: "Archivo o enlace", icon: "↧" },
};

function makeBlock(type: LessonBlockType, order: number): LessonBlock {
  const id = crypto.randomUUID();
  const data: Record<string, unknown> = {
    ...(type === "text" ? { content: "" } : {}),
    ...(type === "video" ? { title: "", description: "", url: "", provider: "youtube" } : {}),
    ...(type === "code" ? { title: "", language: "javascript", code: "" } : {}),
    ...(type === "exercise" ? {
      title: "",
      description: "",
      solutionEnabled: false,
      solutionReleased: false,
      solutionCode: "",
      solutionLanguage: "javascript",
    } : {}),
    ...(type === "quiz" ? {
      question: "",
      options: [
        { id: crypto.randomUUID(), text: "", correct: true, feedback: "" },
        { id: crypto.randomUUID(), text: "", correct: false, feedback: "" },
      ],
    } : {}),
    ...(type === "resource" ? {
      title: "",
      description: "",
      source: "external",
      fileUrl: "",
      externalUrl: "",
      fileName: "",
    } : {}),
  };
  return { id, type, order, data };
}

function move<T>(arr: T[], from: number, to: number) {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function BlockCard({
  block,
  index,
  blocks,
  setBlocks,
  uploadFile,
}: {
  block: LessonBlock;
  index: number;
  blocks: LessonBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<LessonBlock[]>>;
  uploadFile: (file: File, blockId: string, field: string) => Promise<string>;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const updateData = (patch: Record<string, unknown>) => {
    setBlocks((all) => all.map((b) => b.id === block.id ? { ...b, data: { ...b.data, ...patch } } : b));
  };
  const d = block.data;

  const changeOption = (id: string, patch: Record<string, unknown>) => {
    const options = Array.isArray(d.options) ? d.options as Record<string, unknown>[] : [];
    updateData({ options: options.map((o) => o.id === id ? { ...o, ...patch } : o) });
  };

  return (
    <div className={`notebook-block block-${block.type}`}>
      <div className="block-toolbar">
        <div className="block-label">
          <span className="block-grip">⋮⋮</span>
          <span className="block-icon">{labels[block.type].icon}</span>
          <strong>{labels[block.type].title}</strong>
        </div>
        <div className="row">
          <button className="icon-btn" onClick={() => setCollapsed(!collapsed)}>{collapsed ? "Mostrar" : "Ocultar"}</button>
          <button className="icon-btn" onClick={() => index > 0 && setBlocks((b) => move(b, index, index - 1))} disabled={index === 0}>↑</button>
          <button className="icon-btn" onClick={() => index < blocks.length - 1 && setBlocks((b) => move(b, index, index + 1))} disabled={index === blocks.length - 1}>↓</button>
          <button className="icon-btn" onClick={() => setBlocks((b) => [...b.slice(0, index + 1), { ...b[index], id: crypto.randomUUID(), order: index + 1 }, ...b.slice(index + 1).map((x) => ({ ...x, order: x.order + 1 }))])}>Duplicar</button>
          <button className="icon-btn danger-text" onClick={() => setBlocks((b) => b.filter((x) => x.id !== block.id))}>Eliminar</button>
        </div>
      </div>

      {!collapsed && (
        <div className="block-content">
          {block.type === "text" && (
            <div className="rich-editor">
              <div className="rich-toolbar">
                <button type="button" onClick={() => document.execCommand("bold")}>B</button>
                <button type="button" onClick={() => document.execCommand("italic")}>I</button>
                <button type="button" onClick={() => document.execCommand("insertUnorderedList")}>• Lista</button>
                <button type="button" onClick={() => document.execCommand("insertOrderedList")}>1. Lista</button>
                <button type="button" onClick={() => document.execCommand("formatBlock", false, "h2")}>Título</button>
              </div>
              <div
                className="rich-input"
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: String(d.content || "") }}
                onInput={(e) => updateData({ content: e.currentTarget.innerHTML })}
              />
            </div>
          )}

          {block.type === "video" && (
            <>
              <div className="form-grid">
                <div className="field"><label>Título</label><input value={String(d.title || "")} onChange={(e) => updateData({ title: e.target.value })} /></div>
                <div className="field"><label>URL del video</label><input value={String(d.url || "")} onChange={(e) => updateData({ url: e.target.value })} placeholder="https://..." /></div>
              </div>
              <div className="field"><label>Descripción (opcional)</label><textarea value={String(d.description || "")} onChange={(e) => updateData({ description: e.target.value })} /></div>
              <div className="notice">Pega un enlace de YouTube o Vimeo. También puedes subir un archivo de video.</div>
              <input type="file" accept="video/*" onChange={async (e) => e.target.files?.[0] && updateData({ url: await uploadFile(e.target.files[0], block.id, "video"), provider: "file" })} />
            </>
          )}

          {block.type === "code" && (
            <>
              <div className="form-grid">
                <div className="field"><label>Título (opcional)</label><input value={String(d.title || "")} onChange={(e) => updateData({ title: e.target.value })} /></div>
                <div className="field"><label>Lenguaje</label>
                  <select value={String(d.language || "javascript")} onChange={(e) => updateData({ language: e.target.value })}>
                    {["javascript","typescript","html","css","python","json","bash","sql","java","php","csharp","markdown"].map((x) => <option key={x}>{x}</option>)}
                  </select>
                </div>
              </div>
              <textarea className="code-editor" value={String(d.code || "")} onChange={(e) => updateData({ code: e.target.value })} spellCheck={false} placeholder="// Escribe el código aquí..." />
            </>
          )}

          {block.type === "exercise" && (
            <>
              <div className="field"><label>Título del ejercicio</label><input value={String(d.title || "")} onChange={(e) => updateData({ title: e.target.value })} /></div>
              <div className="field"><label>Descripción del reto</label><textarea value={String(d.description || "")} onChange={(e) => updateData({ description: e.target.value })} /></div>
              <label className="check-row"><input type="checkbox" checked={Boolean(d.solutionEnabled)} onChange={(e) => updateData({ solutionEnabled: e.target.checked })} /> Tiene solución</label>
              {Boolean(d.solutionEnabled) && (
                <div className="solution-box">
                  <div className="form-grid">
                    <div className="field"><label>Lenguaje</label><input value={String(d.solutionLanguage || "javascript")} onChange={(e) => updateData({ solutionLanguage: e.target.value })} /></div>
                    <label className="check-row solution-release"><input type="checkbox" checked={Boolean(d.solutionReleased)} onChange={(e) => updateData({ solutionReleased: e.target.checked })} /> Mostrar solución al alumno</label>
                  </div>
                  <textarea className="code-editor" value={String(d.solutionCode || "")} onChange={(e) => updateData({ solutionCode: e.target.value })} spellCheck={false} />
                </div>
              )}
            </>
          )}

          {block.type === "quiz" && (
            <>
              <div className="field"><label>Pregunta</label><textarea value={String(d.question || "")} onChange={(e) => updateData({ question: e.target.value })} /></div>
              <div className="quiz-options">
                {((d.options || []) as Record<string, unknown>[]).map((option, oi) => (
                  <div className="quiz-option-editor" key={String(option.id)}>
                    <input type="radio" name={`correct-${block.id}`} checked={Boolean(option.correct)} onChange={() => updateData({ options: ((d.options || []) as Record<string, unknown>[]).map((o) => ({ ...o, correct: o.id === option.id })) })} />
                    <input value={String(option.text || "")} onChange={(e) => changeOption(String(option.id), { text: e.target.value })} placeholder={`Respuesta ${oi + 1}`} />
                    <input value={String(option.feedback || "")} onChange={(e) => changeOption(String(option.id), { feedback: e.target.value })} placeholder="Retroalimentación (opcional)" />
                    <button className="icon-btn danger-text" onClick={() => updateData({ options: ((d.options || []) as Record<string, unknown>[]).filter((o) => o.id !== option.id) })}>×</button>
                  </div>
                ))}
                <button className="btn" onClick={() => updateData({ options: [...((d.options || []) as Record<string, unknown>[]), { id: crypto.randomUUID(), text: "", correct: false, feedback: "" }] })}>+ Agregar respuesta</button>
              </div>
            </>
          )}

          {block.type === "resource" && (
            <>
              <div className="field"><label>Nombre del recurso</label><input value={String(d.title || "")} onChange={(e) => updateData({ title: e.target.value })} /></div>
              <div className="field"><label>Descripción (opcional)</label><textarea value={String(d.description || "")} onChange={(e) => updateData({ description: e.target.value })} /></div>
              <div className="row wrap">
                <button className={`btn ${d.source === "external" ? "btn-teal" : ""}`} onClick={() => updateData({ source: "external" })}>Enlace externo</button>
                <button className={`btn ${d.source === "upload" ? "btn-teal" : ""}`} onClick={() => updateData({ source: "upload" })}>Subir archivo</button>
              </div>
              {d.source === "external" ? (
                <div className="field"><label>Enlace</label><input value={String(d.externalUrl || "")} onChange={(e) => updateData({ externalUrl: e.target.value })} placeholder="https://..." /></div>
              ) : (
                <div className="field"><label>Archivo</label><input type="file" onChange={async (e) => e.target.files?.[0] && updateData({ fileUrl: await uploadFile(e.target.files[0], block.id, "resource"), fileName: e.target.files[0].name })} /></div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function LessonEditorPage() {
  const params = useParams<{ courseId: string; phaseId: string; lessonId: string }>();
  const { appUser } = useAuth();
  const [lesson, setLesson] = useState<CourseLesson | null>(null);
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [menu, setMenu] = useState(false);
  const [preview, setPreview] = useState(false);
  const [status, setStatus] = useState("Cargando...");
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstLoad = useRef(true);

  useEffect(() => {
    getLesson(params.courseId, params.phaseId, params.lessonId)
      .then((l) => {
        setLesson(l);
        setTitle(l?.title || "");
        setDescription(l?.description || "");
        setBlocks(l?.blocks || []);
        setStatus("Listo");
        firstLoad.current = true;
      })
      .catch((e) => setError(e.message));
  }, [params.courseId, params.phaseId, params.lessonId]);

  async function save(nextBlocks = blocks, nextTitle = title, nextDescription = description) {
    if (!lesson) return;
    setStatus("Guardando...");
    try {
      await saveLessonBlocks(params.courseId, params.phaseId, params.lessonId, nextBlocks.map((b, i) => ({ ...b, order: i })));
      await updateLesson(params.courseId, params.phaseId, params.lessonId, { title: nextTitle, description: nextDescription });
      setStatus("Guardado ✓");
    } catch (e) {
      setStatus("No se pudo guardar");
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  }

  useEffect(() => {
    if (!lesson || firstLoad.current) {
      firstLoad.current = false;
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => save(), 700);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [blocks, title, description]);

  async function uploadFile(file: File, blockId: string, field: string) {
    setStatus("Subiendo...");
    const url = await uploadCourseFile(file, `course-files/${params.courseId}/${params.lessonId}/${blockId}-${file.name}`);
    setStatus("Guardado ✓");
    return url;
  }

  function addBlock(type: LessonBlockType) {
    const next = [...blocks, makeBlock(type, blocks.length)];
    setBlocks(next);
    setMenu(false);
  }

  const canEdit = appUser?.role === "admin" || appUser?.role === "empleado";

  if (!canEdit) return <p className="muted">No tienes permiso para editar esta lección.</p>;
  if (!lesson) return <p className="muted">Cargando editor...</p>;

  return (
    <div className="notebook-page">
      <div className="notebook-header">
        <div>
          <Link href={`/courses/${params.courseId}`} className="muted">← Volver al curso</Link>
          <div className="row wrap">
            <span className="eyebrow">Editor de lección</span>
            <span className="save-status">{status}</span>
          </div>
          <input className="lesson-title-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la lección" />
          <input className="lesson-description-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción breve (opcional)" />
        </div>
        <div className="row wrap">
          <button className="btn" onClick={() => setPreview(true)}>Vista previa</button>
          <button className="btn btn-primary" onClick={() => save()}>Guardar ahora</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="notebook-column">
        {blocks.map((block, index) => (
          <BlockCard key={block.id} block={block} index={index} blocks={blocks} setBlocks={setBlocks} uploadFile={uploadFile} />
        ))}

        <div className="add-block-area">
          <button className="add-block-button" onClick={() => setMenu(!menu)}>+ Agregar bloque</button>
          {menu && (
            <div className="block-menu">
              <div className="block-menu-title">¿Qué quieres agregar?</div>
              {(Object.keys(labels) as LessonBlockType[]).map((type) => (
                <button key={type} onClick={() => addBlock(type)}>
                  <span className="menu-icon">{labels[type].icon}</span>
                  <span><strong>{labels[type].title}</strong><small>{labels[type].hint}</small></span>
                </button>
              ))}
            </div>
          )}
        </div>

        {!blocks.length && <div className="empty-notebook"><div className="empty-icon">＋</div><h2>Empieza tu lección</h2><p className="muted">Agrega texto, videos, código, ejercicios, quizzes o recursos.</p></div>}
      </div>

      {preview && (
        <div className="preview-overlay">
          <div className="preview-window">
            <div className="preview-top"><div><span className="badge badge-teal">Vista previa del alumno</span><h2>{title}</h2></div><button className="icon-btn" onClick={() => setPreview(false)}>×</button></div>
            <div className="preview-content">
              {blocks.map((b) => <PreviewBlock key={b.id} block={b} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewBlock({ block }: { block: LessonBlock }) {
  const d = block.data;
  if (block.type === "text") return <div className="preview-block rich-output" dangerouslySetInnerHTML={{ __html: String(d.content || "") }} />;
  if (block.type === "video") {
    const url = String(d.url || "");
    const embed = url.includes("youtube.com/watch?v=") ? `https://www.youtube.com/embed/${url.split("v=")[1].split("&")[0]}` : url.includes("youtu.be/") ? `https://www.youtube.com/embed/${url.split("youtu.be/")[1].split("?")[0]}` : url.includes("vimeo.com/") ? `https://player.vimeo.com/video/${url.split("vimeo.com/")[1].split("?")[0]}` : url;
    return <div className="preview-block"><h3>{String(d.title || "Video")}</h3>{url && <iframe className="video" src={embed} title={String(d.title || "Video")} allowFullScreen={true} />}{String(d.description || "") && <p className="muted">{String(d.description || "")}</p>}</div>;
  }
  if (block.type === "code") return <div className="preview-block"><h3>{String(d.title || "")}</h3><pre className="code-output"><code>{String(d.code || "")}</code></pre><span className="badge">{String(d.language || "")}</span></div>;
  if (block.type === "exercise") return <div className="preview-block exercise-preview"><span className="badge">Ejercicio</span><h3>{String(d.title || "Reto práctico")}</h3><p>{String(d.description || "")}</p>{Boolean(d.solutionEnabled) && Boolean(d.solutionReleased) && <details><summary>Ver solución</summary><pre className="code-output"><code>{String(d.solutionCode || "")}</code></pre></details>}</div>;
  if (block.type === "quiz") return <div className="preview-block"><span className="badge">Quiz</span><h3>{String(d.question || "")}</h3>{((d.options || []) as Record<string, unknown>[]).map((o) => <label className="quiz-answer" key={String(o.id)}><input type="radio" name={`preview-${block.id}`} /> {String(o.text || "")}</label>)}</div>;
  return <div className="preview-block"><span className="badge">Recurso</span><h3>{String(d.title || "")}</h3><p>{String(d.description || "")}</p>{d.source === "upload" ? <a className="btn btn-primary" href={String(d.fileUrl || "#")} target="_blank">Descargar {String(d.fileName || "archivo")}</a> : <a className="btn btn-primary" href={String(d.externalUrl || "#")} target="_blank">Abrir recurso</a>}</div>;
}
