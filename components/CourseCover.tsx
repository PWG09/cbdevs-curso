import { BookOpen } from "lucide-react";

/** Course thumbnail, or a branded placeholder generated from the title. */
export default function CourseCover({ src, title, className = "" }: { src?: string; title: string; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- signed, short-lived URLs are not suitable for next/image caching
    return <img src={src} alt="" className={`aspect-[16/9] w-full object-cover ${className}`} loading="lazy" />;
  }
  const hue = [...title].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 40;
  return (
    <div className={`relative grid aspect-[16/9] w-full place-items-center overflow-hidden bg-gradient-to-br from-cb-panel2 to-cb-bg ${className}`} aria-hidden>
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full blur-2xl" style={{ background: `hsla(${25 + hue}, 85%, 60%, .18)` }} />
      <div className="absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-cb-teal/10 blur-2xl" />
      <BookOpen className="relative text-cb-amber/70" size={34} />
    </div>
  );
}
