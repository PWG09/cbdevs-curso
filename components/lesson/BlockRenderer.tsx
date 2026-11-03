"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Download, ExternalLink, Eye, EyeOff, FileText, HelpCircle, Lightbulb, XCircle } from "lucide-react";
import CodeView from "@/components/lesson/CodeView";
import { sanitizeLessonHtml } from "@/lib/sanitize";
import { parseVideoUrl } from "@/lib/video";
import { isStorageObjectPath, safeExternalUrl } from "@/lib/safe-url";
import { signAssetPaths } from "@/lib/data/storage";
import type { ExerciseSolution, LessonBlock } from "@/types/course";

/** Signs every private file referenced by the blocks in a single request. */
export function useSignedAssets(blocks: LessonBlock[]): Map<string, string> {
  const paths = useMemo(() => blocks.flatMap((b) => {
    if (b.type === "download" && isStorageObjectPath(b.data.path || b.data.url)) return [b.data.path || b.data.url];
    if (b.type === "video" && isStorageObjectPath(b.data.path || b.data.url)) return [b.data.path || b.data.url];
    return [];
  }), [blocks]);
  const key = paths.join("|");
  const [signed, setSigned] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    if (!paths.length) { setSigned(new Map()); return; }
    let active = true;
    void signAssetPaths(paths).then((map) => { if (active) setSigned(map); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return signed;
}

function TextBlock({ html }: { html: string }) {
  const [clean, setClean] = useState("");
  useEffect(() => { setClean(sanitizeLessonHtml(html)); }, [html]);
  if (!clean) return null;
  return <div className="lesson-prose" dangerouslySetInnerHTML={{ __html: clean }} />;
}

function VideoBlock({ data, signed }: { data: Extract<LessonBlock, { type: "video" }>["data"]; signed: Map<string, string> }) {
  const stored = data.path || data.url;
  const source = isStorageObjectPath(stored) ? (signed.get(stored) ? { kind: "file" as const, src: signed.get(stored)! } : { kind: "none" as const }) : parseVideoUrl(data.url);
  return (
    <figure className="space-y-3">
      {data.title && <h3 className="text-lg font-semibold">{data.title}</h3>}
      <div className="overflow-hidden rounded-xl border border-cb-line bg-black">
        {source.kind === "embed" && (
          <iframe title={data.title || "Video de la lección"} src={source.src} className="aspect-video w-full" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen loading="lazy" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" />
        )}
        {source.kind === "file" && <video src={source.src} controls preload="metadata" className="aspect-video w-full" />}
        {source.kind === "none" && <div className="grid aspect-video place-items-center text-sm text-cb-muted">Video no disponible</div>}
      </div>
      {data.description && <figcaption className="whitespace-pre-line text-sm leading-6 text-cb-muted">{data.description}</figcaption>}
    </figure>
  );
}

function ExerciseBlock({ data, solution }: { data: Extract<LessonBlock, { type: "exercise" }>["data"]; solution?: ExerciseSolution }) {
  const [show, setShow] = useState(false);
  const available = Boolean(solution?.released && solution.code);
  return (
    <div className="rounded-xl border border-cb-teal/25 bg-cb-teal/[.04] p-5">
      <div className="flex items-center gap-2 text-cb-teal"><Lightbulb size={18} aria-hidden /><span className="font-mono text-[11px] uppercase tracking-[.18em]">Ejercicio</span></div>
      <p className="mt-3 whitespace-pre-line leading-7 text-slate-200">{data.challenge || "Ejercicio sin descripción."}</p>
      {available ? (
        <div className="mt-4 space-y-3">
          <button type="button" className="btn-ghost" onClick={() => setShow((v) => !v)} aria-expanded={show}>{show ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}{show ? "Ocultar solución" : "Ver solución"}</button>
          {show && <CodeView code={solution!.code} language="javascript" title="Solución" />}
        </div>
      ) : <p className="mt-4 text-xs text-cb-muted">Intenta resolverlo por tu cuenta. La solución se publicará más adelante.</p>}
    </div>
  );
}

function QuizBlock({ id, data }: { id: string; data: Extract<LessonBlock, { type: "quiz" }>["data"] }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const options = data.options.filter((o) => o.trim());
  if (!data.question || options.length < 2) return null;
  const correct = selected === data.correct;
  const feedback = selected !== null ? data.feedback[selected]?.trim() : "";
  return (
    <fieldset className="rounded-xl border border-cb-line bg-cb-bg p-5">
      <legend className="sr-only">Pregunta de repaso</legend>
      <div className="flex items-center gap-2 text-cb-amber"><HelpCircle size={18} aria-hidden /><span className="mono-label">Comprueba lo aprendido</span></div>
      <p className="mt-3 font-semibold leading-7">{data.question}</p>
      <div className="mt-4 space-y-2">
        {data.options.map((option, index) => option.trim() && (
          <label key={index} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${selected === index ? (checked ? (correct ? "border-emerald-400/60 bg-emerald-500/10" : "border-red-400/60 bg-red-500/10") : "border-cb-amber/60 bg-cb-amber/5") : "border-cb-line hover:border-slate-500"}`}>
            <input type="radio" className="accent-[#f2a950]" name={`quiz-${id}`} checked={selected === index} onChange={() => { setSelected(index); setChecked(false); }} />
            <span>{option}</span>
          </label>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-ghost" disabled={selected === null} onClick={() => setChecked(true)}>Comprobar</button>
        {checked && selected !== null && (
          <span className={`flex items-center gap-1.5 text-sm ${correct ? "text-emerald-300" : "text-red-300"}`} role="status">
            {correct ? <CheckCircle2 size={16} aria-hidden /> : <XCircle size={16} aria-hidden />}
            {feedback || (correct ? "¡Correcto!" : "Revisa tu respuesta e inténtalo de nuevo.")}
          </span>
        )}
      </div>
    </fieldset>
  );
}

function DownloadBlock({ data, signed }: { data: Extract<LessonBlock, { type: "download" }>["data"]; signed: Map<string, string> }) {
  const stored = data.path || data.url;
  const href = isStorageObjectPath(stored) ? signed.get(stored) : safeExternalUrl(data.url);
  const isFile = isStorageObjectPath(stored);
  const label = data.name || "Recurso";
  if (!href) return <div className="flex items-center gap-3 rounded-xl border border-dashed border-cb-line p-4 text-sm text-cb-muted"><FileText size={18} aria-hidden />{label} (no disponible)</div>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 rounded-xl border border-cb-line bg-cb-bg p-4 transition hover:border-cb-amber/60">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-cb-panel2 text-cb-amber">{isFile ? <Download size={18} aria-hidden /> : <ExternalLink size={18} aria-hidden />}</div>
      <div className="min-w-0 flex-1"><div className="truncate font-semibold">{label}</div><div className="text-xs text-cb-muted">{isFile ? "Descargar archivo" : "Abrir enlace externo"}</div></div>
    </a>
  );
}

export default function BlockRenderer({ block, solutions = {}, signed }: { block: LessonBlock; solutions?: Record<string, ExerciseSolution>; signed: Map<string, string> }) {
  switch (block.type) {
    case "text": return <TextBlock html={block.data.html} />;
    case "video": return <VideoBlock data={block.data} signed={signed} />;
    case "code": return block.data.code ? <CodeView code={block.data.code} language={block.data.language} /> : null;
    case "exercise": return <ExerciseBlock data={block.data} solution={solutions[block.id]} />;
    case "quiz": return <QuizBlock id={block.id} data={block.data} />;
    case "download": return <DownloadBlock data={block.data} signed={signed} />;
  }
}

export function LessonBody({ blocks, solutions }: { blocks: LessonBlock[]; solutions?: Record<string, ExerciseSolution> }) {
  const signed = useSignedAssets(blocks);
  if (!blocks.length) return <p className="text-sm text-cb-muted">Esta lección todavía no tiene contenido.</p>;
  return <div className="space-y-8">{blocks.map((block) => <BlockRenderer key={block.id} block={block} solutions={solutions} signed={signed} />)}</div>;
}
