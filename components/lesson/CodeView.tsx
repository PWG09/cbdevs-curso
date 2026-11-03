"use client";

import { useMemo, useState } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-python";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import { Check, Copy } from "lucide-react";

const ALIASES: Record<string, string> = { html: "markup", xml: "markup", js: "javascript", ts: "typescript", sh: "bash", shell: "bash" };

/** Prism output escapes the source, so the highlighted markup is safe to inject. */
export function highlight(code: string, language: string): string {
  const key = ALIASES[language] ?? language;
  const grammar = Prism.languages[key] ?? Prism.languages.javascript;
  return Prism.highlight(code, grammar, key);
}

export default function CodeView({ code, language, title }: { code: string; language: string; title?: string }) {
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => highlight(code, language), [code, language]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  }
  return (
    <div className="overflow-hidden rounded-xl border border-cb-line bg-[#0a1519]">
      <div className="flex items-center justify-between border-b border-cb-line px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-wider text-cb-muted">{title ?? language}</span>
        <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-cb-muted transition hover:bg-cb-panel2 hover:text-white" aria-label="Copiar código">
          {copied ? <><Check size={13} aria-hidden /> Copiado</> : <><Copy size={13} aria-hidden /> Copiar</>}
        </button>
      </div>
      <pre className="code-surface scrollbar m-0 overflow-x-auto p-4"><code dangerouslySetInnerHTML={{ __html: html || " " }} /></pre>
    </div>
  );
}
