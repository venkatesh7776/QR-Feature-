/** Shown inline under each photo. */
export const QUICK_REACTIONS = ["❤️", "🥹", "😍", "😂", "🎉", "🙏"];

/** The "more" picker. Guests can also type any emoji from their keyboard. */
export const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Love",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🤍", "🖤", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💌", "😍", "🥰", "😘", "💑", "💏", "👩‍❤️‍👨", "💍", "💐"],
  },
  {
    label: "Feelings",
    emojis: ["🥹", "😊", "😁", "😂", "🤣", "😄", "😇", "🤗", "🥲", "😭", "😢", "🤩", "😎", "😮", "😳", "🫶", "🙌", "👏", "🤝", "👌", "👍", "💯", "🔥", "🫠"],
  },
  {
    label: "Celebrate",
    emojis: ["🎉", "🥳", "🎊", "✨", "🌟", "⭐", "💫", "🎆", "🎇", "🪅", "🎈", "🎁", "🥂", "🍾", "🍰", "🎂", "🍬", "💃", "🕺", "👯", "🎶", "🎵", "🥁", "📸"],
  },
  {
    label: "Blessings",
    emojis: ["🙏", "🪔", "🕉️", "🌸", "🌺", "🌼", "🌻", "🌹", "🌷", "🪷", "🍃", "🌿", "☀️", "🌙", "🌈", "🕊️", "👑", "💎", "🐘", "🥭", "🎀", "🪩", "🫖", "🌾"],
  },
];

/** True when the string is a single emoji (incl. ZWJ sequences and flags). */
export function isEmoji(value: string) {
  if (!value || value.length > 16) return false;
  const graphemes = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)];
  return graphemes.length === 1 && /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(value);
}

/** Pull the first emoji out of free text typed with the system emoji keyboard. */
export function firstEmoji(text: string) {
  for (const { segment } of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)) {
    if (isEmoji(segment)) return segment;
  }
  return undefined;
}
