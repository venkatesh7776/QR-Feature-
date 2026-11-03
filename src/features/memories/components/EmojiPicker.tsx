"use client";

import { useState } from "react";
import { EMOJI_GROUPS, firstEmoji } from "../lib/emoji";
import { CloseButton, Modal } from "./Modal";

/**
 * Bottom sheet with a grid of wedding-friendly emoji, plus a field that
 * accepts anything from the phone's own emoji keyboard.
 */
export function EmojiPicker({
  open,
  selected,
  onPick,
  onClose,
}: {
  open: boolean;
  selected: string[];
  onPick: (emoji: string) => void;
  onClose: () => void;
}) {
  const [typed, setTyped] = useState("");

  function onType(value: string) {
    const emoji = firstEmoji(value);
    if (emoji) {
      onPick(emoji);
      setTyped("");
    } else {
      setTyped(value);
    }
  }

  return (
    <Modal open={open} onClose={onClose} label="Choose a reaction" className="sm:max-w-md">
      <div className="sticky top-0 z-10 border-b border-gold/30 bg-ivory px-5 pt-4 pb-4">
        <div className="flex items-center justify-between">
          <p className="t-h3">Add a reaction</p>
          <CloseButton onClick={onClose} label="Done" />
        </div>
        <label className="mt-3 flex items-center gap-3 rounded-sm border border-gold/45 px-3 focus-within:border-maroon">
          <span className="text-sm text-ink-muted">Any emoji</span>
          <input
            value={typed}
            onChange={(e) => onType(e.target.value)}
            inputMode="text"
            enterKeyHint="done"
            placeholder="Tap here and use your emoji keyboard"
            className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-muted/60 focus-visible:outline-none"
          />
        </label>
      </div>

      <div className="px-5 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        {EMOJI_GROUPS.map((group) => (
          <section key={group.label} className="mt-4">
            <p className="t-label text-[10px] text-gold">{group.label}</p>
            <div className="mt-2 grid grid-cols-8 gap-1">
              {group.emojis.map((emoji) => {
                const on = selected.includes(emoji);
                return (
                  <button
                    key={emoji}
                    type="button"
                    aria-pressed={on}
                    aria-label={emoji}
                    onClick={() => onPick(emoji)}
                    className={`grid aspect-square place-items-center rounded-full text-[22px] transition ${
                      on ? "bg-gold/15 ring-2 ring-maroon" : "active:bg-ivory-deep"
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
        <button type="button" className="btn btn--maroon mt-6 w-full" onClick={onClose}>
          Done
        </button>
      </div>
    </Modal>
  );
}
