"use client";

import { useMemo, useRef } from "react";
import { highlight } from "@/components/lesson/CodeView";

/** Textarea with a synchronized Prism-highlighted layer underneath. Tab inserts two spaces. */
export default function CodeEditor({ value, onChange, language, label, minHeight = 220 }: { value: string; onChange: (value: string) => void; language: string; label: string; minHeight?: number }) {
  const layer = useRef<HTMLPreElement>(null);
  const html = useMemo(() => highlight(value, language), [value, language]);
  return (
    <div className="code-surface relative overflow-hidden rounded-xl border border-cb-line bg-[#0a1519] focus-within:border-cb-amber" style={{ minHeight }}>
      <pre ref={layer} aria-hidden className="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words p-4" dangerouslySetInnerHTML={{ __html: `${html}\n` }} />
      <textarea
        aria-label={label}
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => { if (layer.current) { layer.current.scrollTop = e.currentTarget.scrollTop; } }}
        onKeyDown={(e) => {
          if (e.key !== "Tab" || e.shiftKey) return;
          e.preventDefault();
          const el = e.currentTarget;
          const { selectionStart: start, selectionEnd: end } = el;
          const next = `${value.slice(0, start)}  ${value.slice(end)}`;
          onChange(next);
          requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 2; });
        }}
        className="relative block w-full resize-y whitespace-pre-wrap break-words bg-transparent p-4 text-transparent caret-white outline-none"
        style={{ minHeight, fontFamily: "inherit", fontSize: "inherit", lineHeight: "inherit" }}
      />
    </div>
  );
}
