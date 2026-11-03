import Link from "next/link";
import { Brand } from "@/components/ui";

export default function AuthCard({ eyebrow, title, description, children, footer }: { eyebrow: string; title: string; description?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-cb-bg px-4 py-10">
      <div className="pointer-events-none absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-cb-amber/5 blur-3xl" aria-hidden />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center"><Link href="/" aria-label="Inicio"><Brand className="justify-center" /></Link></div>
        <section className="panel p-6 sm:p-8">
          <div className="mono-label">{eyebrow}</div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight">{title}</h1>
          {description && <p className="mt-1.5 text-sm text-cb-muted">{description}</p>}
          <div className="mt-6">{children}</div>
        </section>
        {footer && <div className="mt-5 text-center text-sm text-cb-muted">{footer}</div>}
      </div>
    </main>
  );
}
