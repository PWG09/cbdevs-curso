import "./globals.css";
import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/providers/auth";

export const metadata: Metadata = {
  title: { default: "CBDEVS Cursos", template: "%s · CBDEVS Cursos" },
  description: "Cursos grabados y estructurados por fases, con lecciones prácticas, ejercicios y seguimiento de progreso.",
};

export const viewport: Viewport = { themeColor: "#071014" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body><AuthProvider>{children}</AuthProvider></body>
    </html>
  );
}
