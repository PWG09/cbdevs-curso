import Link from "next/link";
import { Brand } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-cb-bg p-5">
      <section className="panel w-full max-w-md p-8 text-center">
        <Brand />
        <div className="mt-6 font-mono text-5xl font-bold text-cb-amber">404</div>
        <h1 className="mt-3 text-xl font-bold">Página no encontrada</h1>
        <p className="mt-2 text-sm text-cb-muted">El enlace no existe o ya no está disponible.</p>
        <Link href="/" className="btn-primary mt-6">Ir al inicio</Link>
      </section>
    </main>
  );
}
