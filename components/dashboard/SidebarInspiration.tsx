"use client";

import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";

const MESSAGES = [
  "Small steps. Stronger understanding.",
  "Keep showing up for your future.",
  "One concept at a time.",
  "Your progress is worth the effort.",
  "Curious minds go further.",
  "Understanding grows with practice.",
];
const ROTATE_MS = 9000;
const MAX_IMAGES = 12;

/**
 * Student photo and a short encouragement for the bottom of the desktop sidebar.
 * Images come from public/sidebar-images (listed by /api/sidebar-images). With none, a plain blue tile is shown.
 * The image frame has a fixed aspect ratio, so swapping images never shifts the layout.
 */
export default function SidebarInspiration() {
  const [images, setImages] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let alive = true;
    // Random starting points are chosen after mount so server and client render the same first paint.
    /* eslint-disable react-hooks/set-state-in-effect */
    setOffset(Math.floor(Math.random() * MESSAGES.length));
    /* eslint-enable react-hooks/set-state-in-effect */
    fetch("/api/sidebar-images", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { images: [] }))
      .then((d: { images?: unknown }) => {
        if (!alive || !Array.isArray(d.images)) return;
        const list = d.images.filter((x): x is string => typeof x === "string").slice(0, MAX_IMAGES);
        setImages(list);
        setIndex(list.length ? Math.floor(Math.random() * list.length) : 0);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      setIndex((i) => i + 1);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, []);

  const active = images.length ? index % images.length : 0;
  const message = MESSAGES[(index + offset) % MESSAGES.length];
  const dropBroken = (src: string) => setImages((list) => list.filter((x) => x !== src));

  return (
    <section aria-label="Study inspiration" className="hidden overflow-hidden rounded-[20px] border border-line bg-card [@media(min-height:720px)]:block">
      <div className="relative aspect-[16/10] w-full bg-brand-soft">
        {images.length > 0 ? (
          images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={src} src={src} alt="" loading={i === active ? "eager" : "lazy"} decoding="async" onError={() => dropBroken(src)}
              className={`absolute inset-0 h-full w-full object-cover object-[center_30%] transition-opacity duration-700 ease-in-out ${i === active ? "opacity-100" : "opacity-0"}`} />
          ))
        ) : (
          <div className="flex h-full w-full items-center justify-center"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white"><GraduationCap className="h-5 w-5" aria-hidden /></span></div>
        )}
      </div>
      <div className="px-3.5 py-3">
        <p key={message} className="rm-fade-in font-ui text-[13.5px] font-semibold leading-snug text-ink">{message}</p>
        {images.length > 1 && (
          <div aria-hidden className="mt-2.5 flex gap-1">
            {images.map((src, i) => <span key={src} className={`h-1 rounded-full transition-all duration-300 ${i === active ? "w-4 bg-brand" : "w-1 bg-line-strong"}`} />)}
          </div>
        )}
      </div>
    </section>
  );
}
