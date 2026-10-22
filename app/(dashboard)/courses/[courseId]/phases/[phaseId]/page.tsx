"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Guard from "@/components/Guard";

/** Phases are managed inside the course page; keep old links working. */
function PhaseRedirect() {
  const { courseId, phaseId } = useParams<{ courseId: string; phaseId: string }>();
  const router = useRouter();
  useEffect(() => { router.replace(`/courses/${courseId}#phase-${phaseId}`); }, [courseId, phaseId, router]);
  return null;
}

export default function PhasePage() {
  return <Guard roles={["admin", "empleado"]}><PhaseRedirect /></Guard>;
}
