"use client";

import { useEffect, useRef } from "react";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, RemoveFormatting } from "lucide-react";
import { safeExternalUrl } from "@/lib/safe-url";
import { sanitizeLessonHtml } from "@/lib/sanitize";

type Command = { icon: typeof Bold; label: string; run: () => void };

/**
 * Lightweight rich-text editor for lesson reading blocks. Content is sanitized on paste and
 * again before rendering for students, so pasted scripts or styles never survive.
 */
export default function RichTextEditor({ value, onChange, label }: { value: string; onChange: (html: string) => void; label: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (el && document.activeElement !== el && el.innerHTML !== value) el.innerHTML = sanitizeLessonHtml(value);
  }, [value]);

  const emit = () => onChange(ref.current?.innerHTML ?? "");
  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const commands: Command[] = [
    { icon: Heading2, label: "Título", run: () => exec("formatBlock", "h2") },
    { icon: Heading3, label: "Subtítulo", run: () => exec("formatBlock", "h3") },
    { icon: Bold, label: "Negrita", run: () => exec("bold") },
    { icon: Italic, label: "Cursiva", run: () => exec("italic") },
    { icon: List, label: "Lista", run: () => exec("insertUnorderedList") },
    { icon: ListOrdered, label: "Lista numerada", run: () => exec("insertOrderedList") },
    { icon: Quote, label: "Cita", run: () => exec("formatBlock", "blockquote") },
    { icon: Link2, label: "Enlace", run: () => {
      const input = window.prompt("URL del enlace (https://…)");
      if (!input) return;
      const url = safeExternalUrl(input);
      if (!url) { window.alert("Solo se permiten enlaces https://"); return; }
      exec("createLink", url);
    } },
    { icon: RemoveFormatting, label: "Texto normal", run: () => { exec("removeFormat"); exec("formatBlock", "p"); } },
  ];

  return (
    <div className="overflow-hidden rounded-xl border border-cb-line focus-within:border-cb-amber">
      <div className="flex flex-wrap gap-1 border-b border-cb-line bg-cb-panel2 p-1.5" role="toolbar" aria-label="Formato de texto">
        {commands.map(({ icon: Icon, label: name, run }) => (
          <button key={name} type="button" onMouseDown={(e) => e.preventDefault()} onClick={run} className="grid h-8 w-8 place-items-center rounded-md text-slate-300 transition hover:bg-cb-panel hover:text-white" title={name} aria-label={name}><Icon size={15} /></button>
        ))}
      </div>
      <div
        ref={ref}
        role="textbox"
        aria-multiline="true"
        aria-label={label}
        contentEditable
        suppressContentEditableWarning
        className="lesson-prose min-h-[180px] bg-cb-bg p-4 outline-none"
        onInput={emit}
        onBlur={emit}
        onPaste={(event) => {
          event.preventDefault();
          const html = event.clipboardData.getData("text/html");
          const text = event.clipboardData.getData("text/plain");
          if (html) document.execCommand("insertHTML", false, sanitizeLessonHtml(html));
          else document.execCommand("insertText", false, text);
          emit();
        }}
      />
    </div>
  );
}
