/**
 * Ornaments from the wedding invitation's design system, so the memories app
 * shares its visual language: lotus divider, kolam texture, arch edge,
 * mandala watermark and the woven zari band.
 */

const GOLD = "#C5A15B";
const GOLD_SOFT = "#DCC58E";
const ROSE = "#E8D4CF";

/** Small lotus between two fading gold hairlines — the section divider. */
export function LotusDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-4 text-gold ${className}`} aria-hidden>
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/60 sm:w-24" />
      <svg viewBox="0 0 48 24" className="h-5 w-10">
        <path d="M24 2 C28 8 28 14 24 20 C20 14 20 8 24 2 Z" fill={ROSE} stroke={GOLD} strokeWidth={0.9} />
        <path d="M24 20 C17 18 12 13 11 7 C17 9 21 13 24 20 Z" fill="none" stroke={GOLD} strokeWidth={0.9} />
        <path d="M24 20 C31 18 36 13 37 7 C31 9 27 13 24 20 Z" fill="none" stroke={GOLD} strokeWidth={0.9} />
        <path d="M24 20 C16 21 8 18 3 13 M24 20 C32 21 40 18 45 13" fill="none" stroke={GOLD} strokeWidth={0.7} strokeOpacity={0.7} />
      </svg>
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/60 sm:w-24" />
    </div>
  );
}

/** Kolam (rangoli) line pattern, used as a faint texture. */
export function KolamTexture({ className = "", id = "kolam" }: { className?: string; id?: string }) {
  return (
    <svg className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} aria-hidden>
      <defs>
        <pattern id={id} width={64} height={64} patternUnits="userSpaceOnUse">
          <g fill="none" stroke={GOLD_SOFT} strokeWidth={0.8}>
            <path d="M32 6 C46 6 58 18 58 32 C58 46 46 58 32 58 C18 58 6 46 6 32 C6 18 18 6 32 6 Z" />
            <path d="M32 18 L46 32 L32 46 L18 32 Z" />
            <path d="M0 0 C10 10 10 22 0 32 M64 0 C54 10 54 22 64 32 M0 64 C10 54 10 42 0 32 M64 64 C54 54 54 42 64 32" />
          </g>
          <g fill={GOLD_SOFT}>
            <circle cx={32} cy={32} r={1.5} />
            <circle cx={0} cy={0} r={1.2} />
            <circle cx={64} cy={0} r={1.2} />
            <circle cx={0} cy={64} r={1.2} />
            <circle cx={64} cy={64} r={1.2} />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Scalloped arch edge where a dark section meets a light one. */
export function ArchEdge({ color, flip = false }: { color: string; flip?: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1440 28"
      preserveAspectRatio="none"
      className={`pointer-events-none absolute inset-x-0 h-4 w-full sm:h-6 ${flip ? "top-0 -translate-y-[calc(100%-1px)] rotate-180" : "bottom-0 translate-y-[calc(100%-1px)]"}`}
    >
      <path
        fill={color}
        d={`M0 0 H1440 V4 ${Array.from({ length: 24 }, (_, k) => `Q${1440 - k * 60 - 30} 28 ${1440 - (k + 1) * 60} 4`).join(" ")} Z`}
      />
    </svg>
  );
}

/** Large line mandala used as a faint watermark; draws in currentColor. */
export function Mandala({ className = "" }: { className?: string }) {
  const rings = [
    { r: 60, n: 12, len: 46, w: 14 },
    { r: 120, n: 16, len: 64, w: 18 },
    { r: 200, n: 24, len: 80, w: 20 },
    { r: 300, n: 32, len: 96, w: 22 },
  ];
  return (
    <svg viewBox="-420 -420 840 840" className={className} aria-hidden fill="none" stroke="currentColor" strokeWidth={1.2}>
      {rings.map(({ r, n, len, w }) => (
        <g key={r}>
          <circle r={r} />
          {Array.from({ length: n }, (_, k) => (
            <path
              key={k}
              transform={`rotate(${(360 / n) * k + (r % 2 ? 0 : 180 / n)}) translate(0 ${-r})`}
              d={`M0 0 C${w} ${-len * 0.3} ${w * 0.6} ${-len * 0.8} 0 ${-len} C${-w * 0.6} ${-len * 0.8} ${-w} ${-len * 0.3} 0 0 Z M0 ${-len * 0.25} V${-len * 0.75}`}
            />
          ))}
        </g>
      ))}
      <circle r={396} strokeDasharray="1 7" strokeLinecap="round" strokeWidth={3} />
      <circle r={410} />
    </svg>
  );
}

/** A woven gold zari border: twin rules with a row of diamonds and dots between them. */
export function ZariBand({ id, className = "" }: { id: string; className?: string }) {
  return (
    <svg aria-hidden className={`absolute inset-x-0 h-[14px] w-full ${className}`} preserveAspectRatio="none">
      <defs>
        <pattern id={id} width="18" height="14" patternUnits="userSpaceOnUse">
          <path d="M9 2.5 13 7l-4 4.5L5 7z" fill="none" stroke={GOLD} strokeWidth="0.9" />
          <circle cx="9" cy="7" r="1" fill={GOLD} />
          <circle cx="0" cy="7" r="1.1" fill={GOLD} />
          <circle cx="18" cy="7" r="1.1" fill={GOLD} />
        </pattern>
      </defs>
      <rect width="100%" height="1" y="0.5" fill={GOLD} opacity="0.85" />
      <rect width="100%" height="14" fill={`url(#${id})`} opacity="0.8" />
      <rect width="100%" height="1" y="12.5" fill={GOLD} opacity="0.85" />
    </svg>
  );
}

/** The small watercolour Ganesha shown above the invocation. */
export function Ganesha({ className = "h-12" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element -- small decorative icon
  return <img src="/images/ganesha.webp" alt="" width={320} height={417} className={`mx-auto w-auto ${className}`} />;
}
