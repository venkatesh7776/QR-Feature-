import QRCode from "qrcode";

export interface CardTheme {
  id: string;
  label: string;
  background: string;
  ink: string;
  muted: string;
  rule: string;
  /** QR codes stay dark-on-light for reliable scanning, even on dark cards. */
  qrPanel?: string;
}

export const CARD_THEMES: CardTheme[] = [
  { id: "classic", label: "Classic", background: "#ffffff", ink: "#111111", muted: "#6b6b6b", rule: "#111111" },
  { id: "noir", label: "Noir", background: "#141414", ink: "#f4f3ef", muted: "#a3a3a3", rule: "#f4f3ef", qrPanel: "#ffffff" },
  { id: "ivory", label: "Ivory", background: "#f7f3ea", ink: "#2a2620", muted: "#7a7264", rule: "#b6aa94" },
  { id: "sage", label: "Sage", background: "#eef0e9", ink: "#28311f", muted: "#6c7765", rule: "#97a58c" },
];

export interface CardContent {
  url: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  instruction: string;
  footnote: string;
}

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 1680;

interface Fonts {
  serif: string;
  sans: string;
}

function readFonts(): Fonts {
  const css = getComputedStyle(document.documentElement);
  return {
    serif: css.getPropertyValue("--font-instrument-serif").trim() || "Georgia, serif",
    sans: css.getPropertyValue("--font-geist").trim() || "system-ui, sans-serif",
  };
}

export async function loadCardFonts() {
  const { serif, sans } = readFonts();
  await Promise.all([
    document.fonts.load(`80px ${serif}`),
    document.fonts.load(`italic 40px ${serif}`),
    document.fonts.load(`500 22px ${sans}`),
  ]).catch(() => undefined);
}

export function drawCard(canvas: HTMLCanvasElement, theme: CardTheme, content: CardContent) {
  const { serif, sans } = readFonts();
  const W = CARD_WIDTH;
  const H = CARD_HEIGHT;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, W, H);

  // Double rule frame.
  ctx.strokeStyle = theme.rule;
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 56, W - 112, H - 112);
  ctx.lineWidth = 1;
  ctx.strokeRect(72, 72, W - 144, H - 144);

  // Title: shrink to fit, at most two lines.
  let titleSize = 116;
  let titleLines: string[] = [];
  for (; titleSize >= 64; titleSize -= 6) {
    ctx.font = `${titleSize}px ${serif}`;
    titleLines = wrap(ctx, content.title, 880);
    if (titleLines.length <= 2) break;
  }
  titleLines = titleLines.slice(0, 2);
  const titleLead = titleSize * 1.02;

  const QR = 540;
  const hasSubtitle = !!content.subtitle?.trim();
  const blocks =
    22 + 44 + titleSize * 0.75 + 56 + (titleLines.length - 1) * titleLead + (hasSubtitle ? 24 + 44 : 0) + 84 + QR + 96 + 62;
  let y = Math.max(150, (H - blocks) / 2);

  // Eyebrow.
  ctx.fillStyle = theme.muted;
  ctx.font = `500 22px ${sans}`;
  y += 22;
  spaced(ctx, content.eyebrow.toUpperCase(), W / 2, y, 6);

  // Ornament: rule · diamond · rule.
  y += 44;
  ornament(ctx, W / 2, y, theme.rule);
  // Next baseline sits one cap-height plus breathing room below the ornament.
  y += titleSize * 0.75 + 56;

  ctx.fillStyle = theme.ink;
  ctx.font = `${titleSize}px ${serif}`;
  titleLines.forEach((line, i) => ctx.fillText(line, W / 2, y + i * titleLead));
  y += (titleLines.length - 1) * titleLead + titleSize * 0.02;

  if (hasSubtitle) {
    y += 24 + 44;
    ctx.fillStyle = theme.muted;
    ctx.font = `italic 40px ${serif}`;
    ctx.fillText(content.subtitle!.trim(), W / 2, y);
  }

  // QR code.
  y += 84;
  const qrX = (W - QR) / 2;
  drawQr(ctx, content.url, qrX, y, QR, theme);
  y += QR + 96;

  ctx.fillStyle = theme.ink;
  ctx.font = `italic 56px ${serif}`;
  ctx.fillText(content.instruction, W / 2, y);

  y += 32 + 22 + 8;
  ctx.fillStyle = theme.muted;
  ctx.font = `500 20px ${sans}`;
  spaced(ctx, content.footnote.toUpperCase(), W / 2, y, 4);
}

function drawQr(
  ctx: CanvasRenderingContext2D,
  url: string,
  x: number,
  y: number,
  size: number,
  theme: CardTheme,
) {
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const quiet = theme.qrPanel ? 3 : 1; // a real quiet zone around the light panel
  const cell = Math.floor(size / (n + quiet * 2));
  const drawn = cell * (n + quiet * 2);
  const ox = Math.round(x + (size - drawn) / 2);
  const oy = Math.round(y + (size - drawn) / 2);

  ctx.fillStyle = theme.qrPanel ?? theme.background;
  ctx.fillRect(ox, oy, drawn, drawn);

  ctx.fillStyle = theme.qrPanel ? "#111111" : theme.ink;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) {
        ctx.fillRect(ox + (c + quiet) * cell, oy + (r + quiet) * cell, cell, cell);
      }
    }
  }
}

function ornament(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx - 90, cy);
  ctx.lineTo(cx - 16, cy);
  ctx.moveTo(cx + 16, cy);
  ctx.lineTo(cx + 90, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx, cy - 7);
  ctx.lineTo(cx + 7, cy);
  ctx.lineTo(cx, cy + 7);
  ctx.lineTo(cx - 7, cy);
  ctx.closePath();
  ctx.fill();
}

/** Centered text with manual tracking (canvas letterSpacing isn't universal). */
function spaced(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, tracking: number) {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  let x = cx - total / 2;
  const align = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((ch, i) => {
    ctx.fillText(ch, x, y);
    x += widths[i] + tracking;
  });
  ctx.textAlign = align;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}
