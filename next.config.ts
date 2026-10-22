import type { NextConfig } from "next";

function supabaseOrigins(): string {
  const fallback = "https://rpfupihdsqxprhptxypv.supabase.co";
  let origin = fallback;
  try {
    origin = new URL(process.env.NEXT_PUBLIC_CBDEVS_SUPABASE_URL || fallback).origin;
  } catch {
    origin = fallback;
  }
  return `${origin} ${origin.replace(/^http/, "ws")}`;
}

const supabase = supabaseOrigins();
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  // Lesson videos are embedded only from these providers (see lib/video.ts).
  "frame-src https://www.youtube-nocookie.com https://player.vimeo.com",
  `connect-src 'self' ${supabase}`,
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: __dirname,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
