"use client";

import { useEffect } from "react";

/** Ivory dialog with a gold hairline over a blurred burgundy backdrop. */
export function Modal({
  open,
  onClose,
  children,
  label,
  className = "",
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  label: string;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-end justify-center bg-burgundy/70 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={`fade-in max-h-[92dvh] w-full overflow-y-auto border border-gold/50 bg-ivory shadow-[0_24px_50px_-28px_rgba(72,20,31,0.55)] sm:rounded-[2px] ${className}`}
      >
        {children}
      </div>
    </div>
  );
}

export function CloseButton({ onClick, label = "Close" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon transition-colors hover:border-maroon hover:bg-maroon hover:text-ivory"
    >
      <svg width="12" height="12" viewBox="0 0 14 14" aria-hidden>
        <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </button>
  );
}
