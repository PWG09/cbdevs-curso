import { describe, expect, it } from "vitest";
import { sanitizeLessonHtml } from "@/lib/sanitize";
import { parseVideoUrl } from "@/lib/video";
import { isStorageObjectPath, safeExternalUrl } from "@/lib/safe-url";
import { makeBlock, normalizeBlocks, toPublicBlocks } from "@/lib/blocks";
import { flattenOutline, neighbors, nextSortOrder, summarizeProgress } from "@/lib/progress";
import { toAppError } from "@/lib/errors";
import type { CourseOutline } from "@/types/course";

describe("sanitizeLessonHtml", () => {
  it("removes scripts, event handlers, iframes and styles", () => {
    const out = sanitizeLessonHtml(`<h2 onclick="x()">Hola</h2><script>alert(1)</script><img src=x onerror=alert(1)><iframe src="https://evil"></iframe><p style="color:red">t</p>`);
    expect(out).toBe("<h2>Hola</h2><p>t</p>");
  });

  it("drops javascript/data links and hardens https links", () => {
    const out = sanitizeLessonHtml(`<a href="javascript:alert(1)">a</a><a href="data:text/html,x">b</a><a href="https://cbdevs.com">c</a><a href="  JaVaScRiPt:alert(1)">d</a>`);
    expect(out).not.toMatch(/javascript|data:/i);
    expect(out).toContain('<a href="https://cbdevs.com" target="_blank" rel="noopener noreferrer nofollow">c</a>');
  });

  it("keeps basic formatting and handles non-strings", () => {
    expect(sanitizeLessonHtml("<ul><li><strong>a</strong> <em>b</em></li></ul>")).toBe("<ul><li><strong>a</strong> <em>b</em></li></ul>");
    expect(sanitizeLessonHtml(42)).toBe("");
    expect(sanitizeLessonHtml(undefined)).toBe("");
  });

  it("neutralizes mutation-XSS style payloads", () => {
    const out = sanitizeLessonHtml(`<svg><p><style><img src=x onerror=alert(1)></style></p></svg><math><mi><table><mglyph><style><img src=x onerror=alert(2)>`);
    expect(out).not.toMatch(/onerror|<img|<svg|<math|<style/i);
  });
});

describe("parseVideoUrl", () => {
  it("builds privacy-friendly embeds for YouTube and Vimeo", () => {
    expect(parseVideoUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({ kind: "embed", provider: "youtube", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0" });
    expect(parseVideoUrl("https://youtu.be/dQw4w9WgXcQ?t=10")).toMatchObject({ kind: "embed", provider: "youtube" });
    expect(parseVideoUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ")).toMatchObject({ kind: "embed" });
    expect(parseVideoUrl("https://vimeo.com/123456789")).toEqual({ kind: "embed", provider: "vimeo", src: "https://player.vimeo.com/video/123456789" });
  });

  it("rejects look-alike hosts, bad ids and non-https", () => {
    expect(parseVideoUrl("https://youtube.com.evil.net/watch?v=dQw4w9WgXcQ")).toEqual({ kind: "none" });
    expect(parseVideoUrl("https://www.youtube.com/watch?v=\"><script>")).toEqual({ kind: "none" });
    expect(parseVideoUrl("http://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({ kind: "none" });
    expect(parseVideoUrl("javascript:alert(1)")).toEqual({ kind: "none" });
  });

  it("accepts direct https video files", () => {
    expect(parseVideoUrl("https://cdn.example.com/clase.mp4")).toEqual({ kind: "file", src: "https://cdn.example.com/clase.mp4" });
  });
});

describe("urls", () => {
  it("accepts only clean https URLs", () => {
    expect(safeExternalUrl("https://a.com/x")).toBe("https://a.com/x");
    expect(safeExternalUrl("http://a.com")).toBeUndefined();
    expect(safeExternalUrl("https://u:p@a.com")).toBeUndefined();
    expect(safeExternalUrl({})).toBeUndefined();
  });

  it("recognizes organization-scoped storage paths only", () => {
    expect(isStorageObjectPath("2f1c4a9e-1b2c-4d3e-8f00-112233445566/course-files/x.pdf")).toBe(true);
    expect(isStorageObjectPath("2f1c4a9e-1b2c-4d3e-8f00-112233445566/../other/x.pdf")).toBe(false);
    expect(isStorageObjectPath("course-files/x.pdf")).toBe(false);
    expect(isStorageObjectPath("https://a.com/x.pdf")).toBe(false);
  });
});

describe("blocks", () => {
  it("normalizes untrusted JSON and drops unknown types", () => {
    const blocks = normalizeBlocks([
      { id: "1", type: "text", data: { html: "<p>x</p>" } },
      { id: "2", type: "evil", data: {} },
      { id: "3", type: "quiz", data: { question: "Q", options: ["a", "b"], correct: 7 } },
      "garbage",
      { id: "4", type: "exercise", data: { challenge: "c", solutionCode: "secret", solutionReleased: "yes" } },
    ]);
    expect(blocks.map((b) => b.type)).toEqual(["text", "quiz", "exercise"]);
    expect(blocks[1]).toMatchObject({ data: { correct: 0, feedback: [] } });
    expect(blocks[2].data).toEqual({ challenge: "c", solutionReleased: false });
    expect(normalizeBlocks(null)).toEqual([]);
  });

  it("never stores exercise solutions in public blocks", () => {
    const exercise = makeBlock("exercise");
    if (exercise.type !== "exercise") throw new Error("type");
    exercise.data.solutionCode = "console.log('respuesta')";
    const [publicBlock] = toPublicBlocks([exercise]);
    expect(JSON.stringify(publicBlock)).not.toContain("respuesta");
  });
});

describe("progress", () => {
  const outline: CourseOutline = {
    phases: [
      { id: "p2", courseId: "c", title: "Dos", description: "", order: 1, lessons: [{ id: "l3", courseId: "c", phaseId: "p2", title: "L3", description: "", order: 0 }] },
      { id: "p1", courseId: "c", title: "Uno", description: "", order: 0, lessons: [
        { id: "l2", courseId: "c", phaseId: "p1", title: "L2", description: "", order: 5 },
        { id: "l1", courseId: "c", phaseId: "p1", title: "L1", description: "", order: 1 },
      ] },
    ],
  };

  it("orders lessons by phase then lesson order", () => {
    expect(flattenOutline(outline).map((l) => l.id)).toEqual(["l1", "l2", "l3"]);
  });

  it("summarizes progress and finds the next lesson", () => {
    expect(summarizeProgress(outline, ["l1", "unrelated"])).toMatchObject({ total: 3, completed: 1, percent: 33, next: { id: "l2" } });
    expect(summarizeProgress(outline, ["l1", "l2", "l3"]).next).toBeNull();
    expect(summarizeProgress({ phases: [] }, []).percent).toBe(0);
  });

  it("finds neighbors across phases", () => {
    expect(neighbors(outline, "l2")).toMatchObject({ previous: { id: "l1" }, next: { id: "l3" }, position: 2, total: 3 });
    expect(neighbors(outline, "l1").previous).toBeNull();
  });

  it("computes the next sort order after gaps", () => {
    expect(nextSortOrder([{ order: 0 }, { order: 4 }])).toBe(5);
    expect(nextSortOrder([])).toBe(0);
  });
});

describe("errors", () => {
  it("maps database codes to safe messages without leaking internals", () => {
    const error = toAppError({ code: "42501", message: "new row violates row-level security policy for table cbdevs_courses" }, "fallback");
    expect(error.message).toBe("No tienes permiso para realizar esta acción.");
    expect(error.message).not.toContain("cbdevs_courses");
    expect(toAppError({ code: "XYZ" }, "Algo falló").message).toBe("Algo falló");
  });
});
