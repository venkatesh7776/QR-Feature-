"use client";

import { useEffect, useState } from "react";

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

/** "Are you sure?" for actions that can't be undone. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (open) {
      setBusy(false);
      setError(undefined);
    }
  }, [open]);

  async function confirm() {
    setBusy(true);
    setError(undefined);
    try {
      await onConfirm();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={busy ? () => undefined : onClose} label={title} className="sm:max-w-md">
      <div className="p-6 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-full border border-maroon/25 text-maroon">
          <TrashIcon className="h-5 w-5" />
        </span>
        <h2 className="t-h3 mt-5">{title}</h2>
        <div className="mt-3 text-[15px] leading-relaxed text-ink-muted">{children}</div>
        {error && (
          <p role="alert" className="mt-4 text-sm text-maroon">
            Couldn&apos;t delete: {error}
          </p>
        )}
        <div className="mt-8 flex gap-3">
          <button type="button" className="btn btn--maroon flex-1" onClick={confirm} disabled={busy} autoFocus>
            {busy ? "Deleting…" : confirmLabel}
          </button>
          <button type="button" className="btn btn--ghost text-maroon" onClick={onClose} disabled={busy}>
            Keep it
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function TrashIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 4h11M6.5 4V2.5h3V4M4 4l.7 9.2a1 1 0 0 0 1 .8h4.6a1 1 0 0 0 1-.8L12 4M6.8 6.5v5M9.2 6.5v5" />
    </svg>
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
