import QRCode from "qrcode";

/**
 * The printable QR card, in the invitation's stationery style: ivory paper,
 * fine gold border and zari bands, Ganesha and invocation, the couple's names,
 * the event, and the QR code in a thin gold frame. Drawn on a canvas so the
 * preview and the downloaded PNG are identical.
 */

export interface CardTheme {
  id: string;
  label: string;
  background: string;
  /** Headings and names */
  ink: string;
  /** Secondary lines */
  muted: string;
  gold: string;
  /** QR codes stay dark-on-light for reliable scanning, even on dark cards. */
  qrPanel: string;
  qrInk: string;
}

export const CARD_THEMES: CardTheme[] = [
  { id: "ivory", label: "Ivory", background: "#FAF5EC", ink: "#651E2B", muted: "#6f625b", gold: "#C5A15B", qrPanel: "#FFFDF8", qrInk: "#48141F" },
  { id: "burgundy", label: "Burgundy", background: "#48141F", ink: "#FAF5EC", muted: "#DCC58E", gold: "#C5A15B", qrPanel: "#FAF5EC", qrInk: "#48141F" },
  { id: "blush", label: "Blush", background: "#F5E9E4", ink: "#651E2B", muted: "#76625c", gold: "#B8924C", qrPanel: "#FFFDF8", qrInk: "#48141F" },
];

export interface CardContent {
  url: string;
  invocation: string;
  groom: string;
  bride: string;
  title: string;
  subtitle?: string;
  instruction: string;
  footnote: string;
}

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 1680;

interface Fonts {
  display: string;
  sans: string;
}

function readFonts(): Fonts {
  const css = getComputedStyle(document.documentElement);
  return {
    display: css.getPropertyValue("--font-display").trim() || "'Cormorant Garamond', Georgia, serif",
    sans: css.getPropertyValue("--font-body").trim() || "Inter, system-ui, sans-serif",
  };
}

let ganesha: Promise<HTMLImageElement | null> | undefined;
function loadGanesha() {
  ganesha ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "/images/ganesha.webp";
  });
  return ganesha;
}

/** Fonts and the Ganesha artwork must be ready before drawing. */
export async function loadCardAssets() {
  const { display, sans } = readFonts();
  await Promise.all([
    document.fonts.load(`500 80px ${display}`),
    document.fonts.load(`italic 500 40px ${display}`),
    document.fonts.load(`500 22px ${sans}`),
    loadGanesha(),
  ]).catch(() => undefined);
}

export async function drawCard(canvas: HTMLCanvasElement, theme: CardTheme, content: CardContent) {
  const { display, sans } = readFonts();
  const art = await loadGanesha();
  const W = CARD_WIDTH;
  const H = CARD_HEIGHT;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Paper, with a soft vignette so it reads as card stock.
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, H * 0.38, 60, W / 2, H * 0.45, H * 0.75);
  glow.addColorStop(0, "rgba(255,255,255,0.10)");
  glow.addColorStop(1, "rgba(72,20,31,0.10)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Fine gold double border.
  ctx.strokeStyle = theme.gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(44, 44, W - 88, H - 88);
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  ctx.strokeRect(60, 60, W - 120, H - 120);
  ctx.globalAlpha = 1;
  cornerLotus(ctx, 60, 60, 1, 1, theme.gold);
  cornerLotus(ctx, W - 60, 60, -1, 1, theme.gold);
  cornerLotus(ctx, 60, H - 60, 1, -1, theme.gold);
  cornerLotus(ctx, W - 60, H - 60, -1, -1, theme.gold);

  // Zari bands top and bottom.
  zari(ctx, 132, W - 132, 98, theme.gold);
  zari(ctx, 132, W - 132, H - 112, theme.gold);

  let y = 150;
  if (art) {
    const h = 132, w = (art.width / art.height) * h;
    ctx.drawImage(art, (W - w) / 2, y, w, h);
    y += h;
  }

  y += 50;
  ctx.fillStyle = theme.gold;
  ctx.font = `italic 500 30px ${display}`;
  ctx.fillText(content.invocation, W / 2, y);

  // The couple: names in the ink colour, "&" in gold italic.
  y += 72;
  names(ctx, content.groom, content.bride, W / 2, y, display, theme);

  y += 40;
  lotusRule(ctx, W / 2, y, theme.gold);

  // Event name: up to two lines, shrinking to fit.
  let size = 124;
  let lines: string[] = [];
  for (; size >= 70; size -= 6) {
    ctx.font = `500 ${size}px ${display}`;
    lines = wrap(ctx, content.title, 900);
    if (lines.length <= 2) break;
  }
  lines = lines.slice(0, 2);
  y += size * 0.78 + 58;
  ctx.fillStyle = theme.ink;
  ctx.font = `500 ${size}px ${display}`;
  lines.forEach((line, i) => ctx.fillText(line, W / 2, y + i * size * 1.02));
  y += (lines.length - 1) * size * 1.02;

  if (content.subtitle?.trim()) {
    y += 62;
    ctx.fillStyle = theme.muted;
    ctx.font = `italic 500 40px ${display}`;
    ctx.fillText(content.subtitle.trim(), W / 2, y);
  }

  // QR code in a thin gold frame, centred in the remaining space.
  const QR = 470;
  const bottomBlock = 120 + 64;
  const room = H - 150 - bottomBlock - (y + 40);
  const qy = y + 40 + Math.max(0, (room - QR - 48) / 2);
  drawQr(ctx, content.url, (W - QR) / 2, qy, QR, theme);

  y = qy + QR + 24 + 96;
  ctx.fillStyle = theme.ink;
  ctx.font = `italic 500 54px ${display}`;
  ctx.fillText(content.instruction, W / 2, y);

  y += 58;
  ctx.fillStyle = theme.gold;
  ctx.font = `500 20px ${sans}`;
  spaced(ctx, content.footnote.toUpperCase(), W / 2, y, 5);
}

function names(ctx: CanvasRenderingContext2D, groom: string, bride: string, cx: number, y: number, display: string, theme: CardTheme) {
  let size = 60;
  const measure = () => {
    ctx.font = `500 ${size}px ${display}`;
    const a = ctx.measureText(groom).width, b = ctx.measureText(bride).width;
    ctx.font = `italic 500 ${size}px ${display}`;
    const amp = ctx.measureText("&").width;
    return { a, b, amp, total: a + b + amp + size * 0.6 };
  };
  let m = measure();
  while (m.total > 940 && size > 36) { size -= 2; m = measure(); }
  let x = cx - m.total / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = theme.ink;
  ctx.font = `500 ${size}px ${display}`;
  ctx.fillText(groom, x, y);
  x += m.a + size * 0.3;
  ctx.fillStyle = theme.gold;
  ctx.font = `italic 500 ${size}px ${display}`;
  ctx.fillText("&", x, y);
  x += m.amp + size * 0.3;
  ctx.fillStyle = theme.ink;
  ctx.font = `500 ${size}px ${display}`;
  ctx.fillText(bride, x, y);
  ctx.textAlign = "center";
}

function drawQr(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, size: number, theme: CardTheme) {
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const quiet = 3;
  const cell = Math.floor(size / (n + quiet * 2));
  const drawn = cell * (n + quiet * 2);
  const ox = Math.round(x + (size - drawn) / 2);
  const oy = Math.round(y + (size - drawn) / 2);

  // Thin gold frame with a soft outer halo.
  ctx.fillStyle = theme.qrPanel;
  ctx.fillRect(ox - 12, oy - 12, drawn + 24, drawn + 24);
  ctx.strokeStyle = theme.gold;
  ctx.lineWidth = 2;
  ctx.strokeRect(ox - 12, oy - 12, drawn + 24, drawn + 24);
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1;
  ctx.strokeRect(ox - 24, oy - 24, drawn + 48, drawn + 48);
  ctx.globalAlpha = 1;

  ctx.fillStyle = theme.qrInk;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) ctx.fillRect(ox + (c + quiet) * cell, oy + (r + quiet) * cell, cell, cell);
    }
  }
}

/** Twin gold rules with a row of small diamonds and dots between — a woven zari border. */
function zari(ctx: CanvasRenderingContext2D, x0: number, x1: number, y: number, gold: string) {
  ctx.strokeStyle = gold;
  ctx.fillStyle = gold;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0, y - 9);
  ctx.lineTo(x1, y - 9);
  ctx.moveTo(x0, y + 9);
  ctx.lineTo(x1, y + 9);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  for (let x = x0 + 12; x < x1 - 6; x += 26) {
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x, y + 5);
    ctx.lineTo(x - 5, y);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + 13, y, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** Small lotus between two fading gold hairlines. */
function lotusRule(ctx: CanvasRenderingContext2D, cx: number, cy: number, gold: string) {
  for (const dir of [-1, 1]) {
    const g = ctx.createLinearGradient(cx + dir * 40, cy, cx + dir * 170, cy);
    g.addColorStop(0, gold);
    g.addColorStop(1, "rgba(197,161,91,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + dir * 40, cy);
    ctx.lineTo(cx + dir * 170, cy);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(cx - 24, cy - 16);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.4;
  ctx.fillStyle = "#E8D4CF";
  const petal = new Path2D("M24 2 C28 8 28 14 24 20 C20 14 20 8 24 2 Z");
  ctx.fill(petal);
  ctx.stroke(petal);
  ctx.stroke(new Path2D("M24 20 C17 18 12 13 11 7 C17 9 21 13 24 20 Z"));
  ctx.stroke(new Path2D("M24 20 C31 18 36 13 37 7 C31 9 27 13 24 20 Z"));
  ctx.restore();
}

/** A tiny lotus bud tucked into each inner corner. */
function cornerLotus(ctx: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number, gold: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.strokeStyle = gold;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(14, 14);
  ctx.quadraticCurveTo(34, 10, 44, 30);
  ctx.quadraticCurveTo(24, 34, 14, 14);
  ctx.moveTo(14, 14);
  ctx.quadraticCurveTo(10, 34, 30, 44);
  ctx.quadraticCurveTo(34, 24, 14, 14);
  ctx.stroke();
  ctx.fillStyle = gold;
  ctx.beginPath();
  ctx.arc(14, 14, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
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
