/**
 * Shrink large phone photos before upload so submissions are quick on venue
 * Wi-Fi. Falls back to the original file if the browser can't decode it.
 */
export async function prepareImage(file: File, maxSide = 2000): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.86),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

/** "18 November 2026", as the invitation writes dates. */
export function formatDate(iso?: string) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(y, m - 1, d));
}

/** "Wednesday, 18 November 2026", as printed on the QR cards. */
export function formatLongDate(iso?: string) {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  const when = Date.UTC(y, m - 1, d);
  const weekday = new Intl.DateTimeFormat("en-IN", { weekday: "long", timeZone: "UTC" }).format(when);
  return `${weekday}, ${formatDate(iso)}`;
}

/** "18 Nov, 7:42 pm" in IST, where the wedding happens. */
export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" })
    .format(new Date(iso))
    .replace(/\s?([ap])\.?m\.?/i, (_, x: string) => ` ${x.toLowerCase()}m`);
}
