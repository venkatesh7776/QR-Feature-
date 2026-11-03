import Link from "next/link";
import { LockButton } from "./CoupleLogin";
import { wedding } from "../lib/wedding";
import { ArchEdge, Ganesha, KolamTexture, LotusDivider } from "./art/Ornaments";

/** Burgundy banner in the invitation's style: Ganesha, label, heading, the couple, lotus. */
export function WeddingHeader({
  eyebrow,
  title,
  back,
  children,
}: {
  eyebrow: string;
  title: string;
  back?: { href: string; label: string };
  children?: React.ReactNode;
}) {
  return (
    <header className="gutter relative z-10 bg-burgundy pt-6 pb-[clamp(4rem,3rem+4vw,6rem)] text-ivory">
      <KolamTexture className="opacity-[0.06]" id="kolam-header" />
      <div className="container-wide relative">
        <div className="flex items-center justify-between">
          {back ? (
            <Link href={back.href} className="t-label inline-flex min-h-11 items-center gap-2 text-[10px] text-gold-muted transition-colors hover:text-gold">
              <ArrowLeft />
              {back.label}
            </Link>
          ) : (
            <span />
          )}
          <LockButton />
        </div>
        <div className="rise-in mt-6 text-center sm:mt-8">
          <Ganesha className="mb-3 h-12" />
          <p className="font-display text-[15px] text-gold-muted italic">{wedding.invocation}</p>
          <p className="t-label mt-6 text-gold">{eyebrow}</p>
          <h1 className="t-h2 mt-4 text-balance !text-ivory">{title}</h1>
          <p className="mt-4 font-display text-lg text-ivory/75 italic">
            {wedding.groom.name} <span className="text-gold">&amp;</span> {wedding.bride.name}
          </p>
          <LotusDivider className="mt-6" />
          {children}
        </div>
      </div>
      <ArchEdge color="var(--burgundy)" />
    </header>
  );
}

/** Slim sticky ivory bar: a pill back to the albums and the page title. */
export function AlbumBar({ title, back }: { title: string; back: { href: string; label: string; short?: string } }) {
  return (
    <header className="gutter sticky top-0 z-30 border-b border-gold/25 bg-ivory/90 backdrop-blur-md">
      <div className="container-wide flex min-h-16 items-center gap-3 py-2 sm:min-h-20">
        <Link
          href={back.href}
          className="group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-gold/50 px-4 text-sm font-medium text-maroon transition-colors hover:border-maroon hover:bg-maroon hover:text-ivory"
        >
          <ArrowLeft className="transition-transform duration-300 group-hover:-translate-x-0.5" />
          <span className="sm:hidden">{back.short ?? back.label}</span>
          <span className="hidden sm:inline">{back.label}</span>
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate font-display text-[clamp(1.5rem,1.2rem+1.4vw,2.5rem)] leading-tight text-maroon">{title}</h1>
        </div>
        {/* balances the back button so the title stays centred */}
        <span aria-hidden className="w-[5.5rem] shrink-0 sm:w-[8.5rem]" />
      </div>
    </header>
  );
}

/** Gentle empty / missing state in an ivory card. */
export function SoftNotice({ title, children, icon = "camera" }: { title: string; children?: React.ReactNode; icon?: "camera" | "folder" }) {
  return (
    <div role="status" className="card mx-auto max-w-md px-6 py-14 text-center">
      {icon === "camera" ? (
        <svg aria-hidden viewBox="0 0 48 48" className="mx-auto h-12 w-12 text-gold" fill="none" stroke="currentColor" strokeWidth={1.1}>
          <path d="M6 16a3 3 0 0 1 3-3h5l3-4h14l3 4h5a3 3 0 0 1 3 3v20a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z" />
          <circle cx="24" cy="25" r="7" />
        </svg>
      ) : (
        <svg aria-hidden viewBox="0 0 48 40" className="mx-auto h-11 w-14 text-gold" fill="none" stroke="currentColor" strokeWidth={1.2}>
          <path d="M3 8a3 3 0 0 1 3-3h11l4 4h21a3 3 0 0 1 3 3v22a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z" />
        </svg>
      )}
      <p className="mt-5 font-display text-2xl text-maroon">{title}</p>
      {children && <div className="mt-3 text-ink-muted">{children}</div>}
    </div>
  );
}

export function ArrowLeft({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${className}`} fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M13 8H3M7 4L3 8l4 4" />
    </svg>
  );
}

export function ArrowRight({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={`h-3.5 w-3.5 ${className}`} fill="none" stroke="currentColor" strokeWidth={1.4}>
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}
