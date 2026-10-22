import { safeExternalUrl } from "@/lib/safe-url";

export type VideoSource =
  | { kind: "embed"; provider: "youtube" | "vimeo"; src: string }
  | { kind: "file"; src: string }
  | { kind: "none" };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;
const VIMEO_ID = /^\d{5,12}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

/**
 * Converts a lesson video URL into a safe embed. Only YouTube, Vimeo and direct https
 * video files are supported; hostnames are matched exactly and IDs are validated so the
 * resulting iframe src can never point anywhere else.
 */
export function parseVideoUrl(value: unknown): VideoSource {
  const safe = safeExternalUrl(value);
  if (!safe) return { kind: "none" };
  const url = new URL(safe);
  const host = url.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.has(host)) {
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.split("/")[1] ?? null;
    else if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const match = /^\/(?:embed|shorts|live)\/([^/]+)/.exec(url.pathname);
      id = match?.[1] ?? null;
    }
    return id && YOUTUBE_ID.test(id) ? { kind: "embed", provider: "youtube", src: `https://www.youtube-nocookie.com/embed/${id}?rel=0` } : { kind: "none" };
  }

  if (VIMEO_HOSTS.has(host)) {
    const id = url.pathname.split("/").filter(Boolean).find((part) => VIMEO_ID.test(part));
    return id ? { kind: "embed", provider: "vimeo", src: `https://player.vimeo.com/video/${id}` } : { kind: "none" };
  }

  if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) return { kind: "file", src: safe };
  return { kind: "none" };
}
