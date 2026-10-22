"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export function Brand({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className="font-mono text-lg font-bold tracking-tight">CB<span className="text-cb-amber">|</span>DEVS</span>
      <span className="text-sm font-medium text-cb-muted">Cursos</span>
    </span>
  );
}

export function PageHeader({ eyebrow, title, description, actions, back }: { eyebrow?: string; title: string; description?: string; actions?: React.ReactNode; back?: React.ReactNode }) {
  return (
    <div className="space-y-3">
      {back}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow && <div className="mono-label">{eyebrow}</div>}
          <h1 className="mt-1 break-words text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-cb-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function ProgressBar({ value, label, size = "md" }: { value: number; label: string; size?: "sm" | "md" }) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  return (
    <div className={`${size === "sm" ? "h-1.5" : "h-2.5"} overflow-hidden rounded-full bg-cb-panel2`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={clamped}>
      <div className={`h-full rounded-full transition-[width] duration-700 ${clamped === 100 ? "bg-emerald-400" : "bg-gradient-to-r from-cb-amber to-amber-300"}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function Pill({ tone = "neutral", children }: { tone?: "success" | "warning" | "neutral" | "danger" | "info"; children: React.ReactNode }) {
  const tones = {
    success: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    warning: "border-cb-amber/20 bg-cb-amber/10 text-cb-amber",
    danger: "border-red-400/20 bg-red-500/10 text-red-300",
    info: "border-cb-teal/20 bg-cb-teal/10 text-cb-teal",
    neutral: "border-cb-line bg-cb-panel2 text-cb-muted",
  };
  return <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-cb-line px-6 py-12 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-cb-panel2 text-cb-amber"><Icon size={22} aria-hidden /></div>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-cb-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3.5 text-sm text-red-200" role="alert">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden /><div>{children}</div>
    </div>
  );
}

export function SuccessBanner({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="flex items-start gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-sm text-emerald-200" role="status">
      <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden /><div>{children}</div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl border border-cb-line bg-cb-panel ${className}`} aria-hidden />;
}

export function LoadingGrid({ count = 3 }: { count?: number }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">{Array.from({ length: count }, (_, i) => <Skeleton key={i} className="h-64" />)}</div>;
}

/**
 * Two-step destructive button: the first click arms it, the second confirms. Disarms after 4s.
 * Avoids blocking `confirm()` dialogs while still preventing accidental deletes.
 */
export function ConfirmButton({ onConfirm, children, confirmLabel = "¿Confirmar?", className = "btn-danger", disabled, title }: { onConfirm: () => void | Promise<void>; children: React.ReactNode; confirmLabel?: string; className?: string; disabled?: boolean; title?: string }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(timer);
  }, [armed]);
  return (
    <button type="button" className={className} disabled={disabled || busy} title={title} aria-label={armed ? confirmLabel : title}
      onClick={async () => {
        if (!armed) { setArmed(true); return; }
        setBusy(true);
        try { await onConfirm(); } finally { setBusy(false); setArmed(false); }
      }}>
      {armed ? <span className="font-semibold">{confirmLabel}</span> : children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-cb-muted">{hint}</span>}
    </label>
  );
}
