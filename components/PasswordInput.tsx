"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({ value, onChange, autoComplete, id, minLength }: { value: string; onChange: (value: string) => void; autoComplete: string; id: string; minLength?: number }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <input id={id} className="input pr-11" type={show ? "text" : "password"} autoComplete={autoComplete} value={value} onChange={(e) => onChange(e.target.value)} required minLength={minLength} maxLength={128} />
      <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-cb-muted hover:text-white" aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"} aria-pressed={show}>
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </span>
  );
}
