import type { LessonBlock, LessonBlockType } from "@/types/course";

export const BLOCK_LABELS: Record<LessonBlockType, string> = {
  text: "Texto",
  video: "Video",
  code: "Código",
  exercise: "Ejercicio",
  quiz: "Quiz",
  download: "Recurso descargable",
};

export const CODE_LANGUAGES = ["javascript", "typescript", "jsx", "tsx", "html", "css", "json", "python", "bash", "sql"] as const;

const str = (value: unknown, max = 100_000) => (typeof value === "string" ? value.slice(0, max) : "");
const strArray = (value: unknown, max = 20) => (Array.isArray(value) ? value.slice(0, max).map((v) => str(v, 2000)) : []);

export function createBlockId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export function makeBlock(type: LessonBlockType): LessonBlock {
  const id = createBlockId();
  switch (type) {
    case "text": return { id, type, data: { html: "<p></p>" } };
    case "video": return { id, type, data: { url: "", title: "", description: "" } };
    case "code": return { id, type, data: { language: "javascript", code: "" } };
    case "exercise": return { id, type, data: { challenge: "", solutionReleased: false, solutionCode: "" } };
    case "quiz": return { id, type, data: { question: "", options: ["", ""], correct: 0, feedback: ["", ""] } };
    case "download": return { id, type, data: { name: "", url: "", path: "" } };
  }
}

/**
 * Coerces untrusted JSON from `cbdevs_course_lessons.blocks` into well-typed blocks.
 * Unknown block types are dropped; every field gets a safe default and a length bound.
 */
export function normalizeBlocks(raw: unknown): LessonBlock[] {
  if (!Array.isArray(raw)) return [];
  const blocks: LessonBlock[] = [];
  for (const item of raw.slice(0, 200)) {
    if (!item || typeof item !== "object") continue;
    const record = item as { id?: unknown; type?: unknown; data?: unknown };
    const id = str(record.id, 100) || createBlockId();
    const d = (record.data && typeof record.data === "object" ? record.data : {}) as Record<string, unknown>;
    switch (record.type) {
      case "text":
        blocks.push({ id, type: "text", data: { html: str(d.html) } });
        break;
      case "video":
        blocks.push({ id, type: "video", data: { url: str(d.url, 2048), title: str(d.title, 300), description: str(d.description, 5000), path: str(d.path, 1024) || undefined } });
        break;
      case "code":
        blocks.push({ id, type: "code", data: { language: str(d.language, 30) || "javascript", code: str(d.code) } });
        break;
      case "exercise":
        blocks.push({ id, type: "exercise", data: { challenge: str(d.challenge, 20_000), solutionReleased: d.solutionReleased === true } });
        break;
      case "quiz": {
        const options = strArray(d.options);
        const correct = Number.isInteger(d.correct) ? Number(d.correct) : 0;
        blocks.push({ id, type: "quiz", data: { question: str(d.question, 2000), options, correct: correct >= 0 && correct < options.length ? correct : 0, feedback: strArray(d.feedback) } });
        break;
      }
      case "download":
        blocks.push({ id, type: "download", data: { name: str(d.name, 300), url: str(d.url, 2048), path: str(d.path, 1024) } });
        break;
      default:
        break;
    }
  }
  return blocks;
}

/** Removes editor-only fields (exercise solutions) before blocks are saved where students can read them. */
export function toPublicBlocks(blocks: LessonBlock[]): LessonBlock[] {
  return blocks.map((block) => {
    if (block.type !== "exercise") return block;
    return { ...block, data: { challenge: block.data.challenge, solutionReleased: block.data.solutionReleased } };
  });
}
