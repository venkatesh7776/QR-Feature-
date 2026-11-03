import QRCode from "qrcode";

/**
 * The printable QR card, recreated from the wedding's QR card template so all
 * text stays editable and the QR code is placed in the frame automatically:
 * ivory upper half with floral corners, Ganesha, invocation and names;
 * burgundy lower half (kolam texture, zari band) holding the QR tile with
 * gold brackets and "SCAN ME" either side.
 *
 * Everything is drawn in the template's own 3600 × 4800 coordinates and
 * output at 2400 × 3200, which prints sharply at 8 × 10.7 in.
 */

export interface CardContent {
  url: string;
  invocation: string;
  /** Short names, e.g. "Murali" and "Varshitha" */
  groom: string;
  bride: string;
  event: string;
  /** e.g. "Wednesday, 18 November 2026" */
  dateLine?: string;
  heading: string;
  tagline: string;
  message: string;
  site: string;
  footer: string;
}

const T_W = 3600;
const T_H = 4800;
const SCALE = 2 / 3;
export const CARD_WIDTH = T_W * SCALE;
export const CARD_HEIGHT = T_H * SCALE;

const C = {
  ivory: "#FAF5EC",
  ivoryTop: "#FBF6EE",
  burgundy: "#48141F",
  burgundyDeep: "#3F111A",
  burgundyGlow: "#541826",
  maroon: "#651E2B",
  gold: "#C5A15B",
  goldMuted: "#DCC58E",
  goldText: "#A8864B",
};

/** Where the burgundy half begins, and the QR tile (template coordinates). */
const SPLIT = 2553;
const TILE = { x: 1134, y: 2055, size: 1332, r: 70 };

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

const images: Record<string, Promise<HTMLImageElement | null>> = {};
function loadImage(src: string) {
  images[src] ??= new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
  return images[src];
}

const ART = {
  ganesha: "/images/ganesha.webp",
  floralLeft: "/images/qr-card/floral-left.png",
  floralRight: "/images/qr-card/floral-right.png",
};

/** Fonts and artwork must be ready before drawing. */
export async function loadCardAssets() {
  const { display, sans } = readFonts();
  await Promise.all([
    document.fonts.load(`500 200px ${display}`),
    document.fonts.load(`italic 500 100px ${display}`),
    document.fonts.load(`400 60px ${sans}`),
    document.fonts.load(`600 60px ${sans}`),
    ...Object.values(ART).map(loadImage),
  ]).catch(() => undefined);
}

export async function drawCard(canvas: HTMLCanvasElement, content: CardContent) {
  const { display, sans } = readFonts();
  const [ganesha, floralLeft, floralRight] = await Promise.all([loadImage(ART.ganesha), loadImage(ART.floralLeft), loadImage(ART.floralRight)]);

  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  const cx = T_W / 2;

  // ---- Ivory upper half ----
  const top = ctx.createLinearGradient(0, 0, 0, SPLIT);
  top.addColorStop(0, C.ivoryTop);
  top.addColorStop(1, C.ivory);
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, T_W, SPLIT);

  // ---- Burgundy lower half, with a soft glow and faint kolam ----
  const glow = ctx.createRadialGradient(cx, 3300, 200, cx, 3600, 2200);
  glow.addColorStop(0, C.burgundyGlow);
  glow.addColorStop(0.55, C.burgundy);
  glow.addColorStop(1, C.burgundyDeep);
  ctx.fillStyle = glow;
  ctx.fillRect(0, SPLIT, T_W, T_H - SPLIT);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, SPLIT, T_W, T_H - SPLIT);
  ctx.clip();
  kolam(ctx, 0, SPLIT, T_W, T_H - SPLIT);
  ctx.restore();

  zariBand(ctx, SPLIT, T_W);

  // ---- Gold double frame (outer 68%, inner 32%) ----
  frameLine(ctx, 102, 0.68);
  frameLine(ctx, 135, 0.32);

  // ---- Floral corners (drawn over the frame, as on the template) ----
  if (floralLeft) ctx.drawImage(floralLeft, 0, 0, 1160, 1330);
  if (floralRight) ctx.drawImage(floralRight, T_W - 1160, 0, 1160, 1330);

  // ---- Ganesha, invocation, names ----
  if (ganesha) {
    const h = 360, w = (ganesha.width / ganesha.height) * h;
    ctx.drawImage(ganesha, cx - w / 2, 262, w, h);
  }
  ctx.fillStyle = C.goldText;
  ctx.font = `italic 500 80px ${display}`;
  ctx.fillText(content.invocation, cx, 750);

  names(ctx, content.groom, content.bride, cx, 1095, display);
  lotusDivider(ctx, cx, 1275);

  // "RECEPTION · WEDNESDAY, 18 NOVEMBER 2026"
  eventLine(ctx, content.event, content.dateLine, cx, 1479, sans);

  ctx.fillStyle = C.maroon;
  fitFont(ctx, content.heading, `500 _px ${display}`, 205, 2300);
  ctx.fillText(content.heading, cx, 1815);

  // ---- QR tile with gold brackets ----
  brackets(ctx);
  qrTile(ctx, content.url);
  scanMe(ctx, 885, 2940, -1, sans);
  scanMe(ctx, 2715, 2940, 1, sans);

  // ---- Lower text ----
  ctx.fillStyle = C.ivory;
  fitFont(ctx, content.tagline, `italic 500 _px ${display}`, 150, 2600);
  ctx.fillText(content.tagline, cx, 3741);

  ctx.fillStyle = "rgba(250,245,236,0.78)";
  fitFont(ctx, content.message, `400 _px ${sans}`, 62, 2800);
  ctx.fillText(content.message, cx, 3909);

  ctx.fillStyle = C.goldMuted;
  ctx.font = `600 54px ${sans}`;
  spaced(ctx, content.site.toUpperCase(), cx, 4476, 54 * 0.2);

  ctx.fillStyle = "rgba(250,245,236,0.62)";
  fitFont(ctx, content.footer, `italic 500 _px ${display}`, 68, 2800);
  ctx.fillText(content.footer, cx, 4574);
}

// ---------------------------------------------------------------------------

/** Set the largest font size ≤ `max` (replacing "_" in `font`) that fits `width`. */
function fitFont(ctx: CanvasRenderingContext2D, text: string, font: string, max: number, width: number) {
  let size = max;
  ctx.font = font.replace("_", String(size));
  while (ctx.measureText(text).width > width && size > max * 0.5) {
    size -= 2;
    ctx.font = font.replace("_", String(size));
  }
}

function names(ctx: CanvasRenderingContext2D, groom: string, bride: string, cx: number, y: number, display: string) {
  let size = 310;
  const gap = () => size * 0.34;
  const measure = () => {
    ctx.font = `500 ${size}px ${display}`;
    const a = ctx.measureText(groom).width, b = ctx.measureText(bride).width;
    ctx.font = `italic 500 ${size * 0.62}px ${display}`;
    const amp = ctx.measureText("&").width;
    return { a, b, amp, total: a + b + amp + gap() * 2 };
  };
  let m = measure();
  while (m.total > 2500 && size > 160) {
    size -= 4;
    m = measure();
  }
  let x = cx - m.total / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = C.maroon;
  ctx.font = `500 ${size}px ${display}`;
  ctx.fillText(groom, x, y);
  x += m.a + gap();
  ctx.fillStyle = C.gold;
  ctx.font = `italic 500 ${size * 0.62}px ${display}`;
  ctx.fillText("&", x, y - size * 0.04);
  x += m.amp + gap();
  ctx.fillStyle = C.maroon;
  ctx.font = `500 ${size}px ${display}`;
  ctx.fillText(bride, x, y);
  ctx.textAlign = "center";
}

function eventLine(ctx: CanvasRenderingContext2D, event: string, date: string | undefined, cx: number, y: number, sans: string) {
  let size = 62;
  const parts = [event.toUpperCase(), date?.toUpperCase()].filter(Boolean) as string[];
  const widthOf = () => {
    ctx.font = `600 ${size}px ${sans}`;
    const tracked = (s: string) => [...s].reduce((w, ch) => w + ctx.measureText(ch).width, 0) + size * 0.3 * (s.length - 1);
    return { tracked, total: parts.reduce((w, p) => w + tracked(p), 0) + (parts.length - 1) * size * 1.6 };
  };
  let m = widthOf();
  while (m.total > 2700 && size > 36) {
    size -= 2;
    m = widthOf();
  }
  let x = cx - m.total / 2;
  parts.forEach((p, i) => {
    if (i > 0) {
      ctx.fillStyle = C.gold;
      ctx.beginPath();
      ctx.arc(x + size * 0.8, y - size * 0.36, size * 0.09, 0, Math.PI * 2);
      ctx.fill();
      x += size * 1.6;
    }
    ctx.fillStyle = C.maroon;
    ctx.textAlign = "left";
    for (const ch of p) {
      ctx.fillText(ch, x, y);
      x += ctx.measureText(ch).width + size * 0.3;
    }
    x -= size * 0.3;
  });
  ctx.textAlign = "center";
}

function frameLine(ctx: CanvasRenderingContext2D, inset: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(inset + 1.5, inset + 1.5, T_W - (inset + 1.5) * 2, T_H - (inset + 1.5) * 2);
  ctx.restore();
}

/** Twin gold rules with diamonds and dots between — a woven zari border. */
function zariBand(ctx: CanvasRenderingContext2D, y: number, width: number) {
  ctx.save();
  ctx.fillStyle = C.gold;
  ctx.fillRect(0, y + 1, width, 4);
  ctx.fillRect(0, y + 48, width, 4);
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 3;
  const mid = y + 27;
  for (let x = 30; x < width; x += 66) {
    ctx.beginPath();
    ctx.moveTo(x, mid - 12);
    ctx.lineTo(x + 12, mid);
    ctx.lineTo(x, mid + 12);
    ctx.lineTo(x - 12, mid);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, mid, 3.5, 0, Math.PI * 2);
    ctx.arc(x + 33, mid, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Faint kolam line pattern on the burgundy half. */
function kolam(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number) {
  const tile = 132, k = tile / 64;
  const shapes = [
    new Path2D("M32 6 C46 6 58 18 58 32 C58 46 46 58 32 58 C18 58 6 46 6 32 C6 18 18 6 32 6 Z"),
    new Path2D("M32 18 L46 32 L32 46 L18 32 Z"),
    new Path2D("M0 0 C10 10 10 22 0 32 M64 0 C54 10 54 22 64 32 M0 64 C10 54 10 42 0 32 M64 64 C54 54 54 42 64 32"),
  ];
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = C.goldMuted;
  ctx.lineWidth = 0.8 * 1.6;
  for (let y = y0; y < y0 + h; y += tile) {
    for (let x = x0; x < x0 + w; x += tile) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(k, k);
      ctx.lineWidth = 1.2;
      shapes.forEach((s) => ctx.stroke(s));
      ctx.restore();
    }
  }
  ctx.restore();
}

/** Small lotus between two fading gold hairlines. */
function lotusDivider(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
  for (const dir of [-1, 1]) {
    const g = ctx.createLinearGradient(cx + dir * 110, cy, cx + dir * 525, cy);
    g.addColorStop(0, "rgba(197,161,91,0.75)");
    g.addColorStop(1, "rgba(197,161,91,0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + dir * 110, cy);
    ctx.lineTo(cx + dir * 525, cy);
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(cx - 72, cy - 40);
  ctx.scale(3, 3);
  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 0.9;
  ctx.fillStyle = "#E8D4CF";
  const petal = new Path2D("M24 2 C28 8 28 14 24 20 C20 14 20 8 24 2 Z");
  ctx.fill(petal);
  ctx.stroke(petal);
  ctx.stroke(new Path2D("M24 20 C17 18 12 13 11 7 C17 9 21 13 24 20 Z"));
  ctx.stroke(new Path2D("M24 20 C31 18 36 13 37 7 C31 9 27 13 24 20 Z"));
  ctx.stroke(new Path2D("M24 20 C16 21 8 18 3 13 M24 20 C32 21 40 18 45 13"));
  ctx.restore();
}

/** Four gold L-brackets framing the QR tile. */
function brackets(ctx: CanvasRenderingContext2D) {
  const L = 270, r = 54;
  const x0 = 1050, x1 = 2550, y0 = 1980, y1 = 3465;
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, "#D7B56C");
  g.addColorStop(0.5, C.gold);
  g.addColorStop(1, "#DCC58E");
  ctx.save();
  ctx.strokeStyle = g;
  ctx.lineWidth = 15;
  ctx.lineCap = "round";
  const corner = (x: number, y: number, sx: number, sy: number) => {
    ctx.beginPath();
    ctx.moveTo(x + sx * L, y);
    ctx.lineTo(x + sx * r, y);
    ctx.quadraticCurveTo(x, y, x, y + sy * r);
    ctx.lineTo(x, y + sy * L);
    ctx.stroke();
  };
  corner(x0, y0, 1, 1);
  corner(x1, y0, -1, 1);
  corner(x0, y1, 1, -1);
  corner(x1, y1, -1, -1);
  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** White tile with a silver bevel and gold hairline; the QR sits inside with a quiet margin. */
function qrTile(ctx: CanvasRenderingContext2D, url: string) {
  const { x, y, size, r } = TILE;
  ctx.save();
  ctx.shadowColor = "rgba(20,4,8,0.35)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  const bevel = ctx.createLinearGradient(x, y, x, y + size);
  bevel.addColorStop(0, "#FFFFFF");
  bevel.addColorStop(1, "#D8D2CB");
  ctx.fillStyle = bevel;
  roundRect(ctx, x, y, size, size, r);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = C.gold;
  ctx.lineWidth = 4;
  roundRect(ctx, x + 14, y + 14, size - 28, size - 28, r - 12);
  ctx.stroke();
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, x + 22, y + 22, size - 44, size - 44, r - 18);
  ctx.fill();

  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const n = qr.modules.size;
  const area = size - 44 - 2 * 92; // white margin inside the tile
  const cell = Math.floor(area / n);
  const drawn = cell * n;
  const ox = Math.round(x + (size - drawn) / 2);
  const oy = Math.round(y + (size - drawn) / 2);
  ctx.fillStyle = C.burgundy;
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (qr.modules.get(row, col)) ctx.fillRect(ox + col * cell, oy + row * cell, cell, cell);
    }
  }
}

/** Vertical "SCAN ME" beside the tile; dir -1 reads upward (left), 1 downward (right). */
function scanMe(ctx: CanvasRenderingContext2D, x: number, y: number, dir: -1 | 1, sans: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((dir * Math.PI) / 2);
  ctx.fillStyle = C.goldMuted;
  ctx.font = `600 46px ${sans}`;
  ctx.textBaseline = "middle";
  spaced(ctx, "SCAN ME", 0, 0, 46 * 0.42);
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
