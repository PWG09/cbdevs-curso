"use client";

import { useEffect, useState } from "react";
import { ImagePlus } from "lucide-react";
import CourseCover from "@/components/CourseCover";

/** Image picker with live preview for course covers (JPG/PNG/WebP, max 10 MB). */
export default function CoverInput({ file, onChange, currentUrl, title = "" }: { file: File | null; onChange: (file: File | null) => void; currentUrl?: string; title?: string }) {
  const [preview, setPreview] = useState<string | undefined>();
  useEffect(() => {
    if (!file) { setPreview(undefined); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <div>
      <span className="label">Portada</span>
      <div className="grid gap-4 sm:grid-cols-[220px_1fr] sm:items-center">
        <div className="overflow-hidden rounded-xl border border-cb-line"><CourseCover src={preview ?? currentUrl} title={title || "curso"} /></div>
        <div>
          <label className="btn-ghost cursor-pointer">
            <ImagePlus size={16} aria-hidden />{file || currentUrl ? "Cambiar imagen" : "Elegir imagen"}
            <input type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
          </label>
          <p className="mt-2 text-xs text-cb-muted">JPG, PNG o WebP · máximo 10 MB · proporción 16:9 recomendada.</p>
          {file && <p className="mt-1 truncate text-xs text-slate-300">{file.name}</p>}
        </div>
      </div>
    </div>
  );
}
