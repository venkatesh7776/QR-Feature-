"use client";

import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

/** A photo that shimmers (ivory → faint gold → ivory) while loading, then fades in. */
export function FadeImage({ className = "", wrapperClassName = "", alt, ...props }: ImgHTMLAttributes<HTMLImageElement> & { wrapperClassName?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  // A cached image can finish before React attaches onLoad; catch that on mount.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete) setState(img.naturalWidth > 0 ? "ready" : "error");
  }, [props.src]);

  return (
    <span className={`relative block overflow-hidden bg-ivory-deep ${wrapperClassName}`}>
      {state !== "ready" && (
        <span aria-hidden className={`absolute inset-0 ${state === "loading" ? "memory-shimmer" : "grid place-items-center text-xs text-ink-muted"}`}>
          {state === "error" && "Photo unavailable"}
        </span>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URLs behind a redirect */}
      <img
        ref={ref}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setState("ready")}
        onError={() => setState("error")}
        className={`transition-opacity duration-700 ease-[var(--ease-silk)] ${state === "ready" ? "opacity-100" : "opacity-0"} ${className}`}
        {...props}
      />
    </span>
  );
}
