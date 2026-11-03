/**
 * The couple this memories app belongs to. Everything couple-specific shown
 * in the UI and on the QR cards comes from here, so setting the app up for
 * another wedding means editing only this file (and the colour tokens in
 * globals.css, if the invitation uses a different palette).
 */
export const wedding = {
  invocation: "Om Shri Ganeshaya Namah",
  // Groom first, as on the invitation.
  groom: { name: "Murali N.", short: "Murali" },
  bride: { name: "Varshitha D. S.", short: "Varshitha" },
  /** The invitation website this app is part of. */
  siteUrl: "https://murali-varshitha-wedding.vercel.app",
  /** Suggested folder names, in the order the invitation lists the events. */
  events: [
    { name: "Reception", date: "2026-11-18" },
    { name: "Muhurtham", date: "2026-11-19" },
    { name: "Haldi", date: "2026-11-16" },
    { name: "Mehendi", date: "2026-11-17" },
  ],
} as const;

export const coupleNames = `${wedding.groom.name} & ${wedding.bride.name}`;
export const coupleShort = `${wedding.groom.short} & ${wedding.bride.short}`;
