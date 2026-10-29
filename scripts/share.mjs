// Opens a temporary public https URL for the running app (Cloudflare quick
// tunnel) and records it so new QR codes point there. Phones need https to
// record voice notes. Stop with Ctrl+C; the URL changes on every run.
import { spawn } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { bin } from "cloudflared";

const port = process.env.PORT ?? "3000";
const dataDir = process.env.MEMORIES_DATA_DIR ?? path.join(process.cwd(), ".data");
const originFile = path.join(dataDir, "share-origin");

const tunnel = spawn(bin, ["tunnel", "--no-autoupdate", "--url", `http://localhost:${port}`]);
let announced = false;

function onOutput(chunk) {
  const match = String(chunk).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
  if (!match || announced) return;
  announced = true;
  mkdirSync(dataDir, { recursive: true });
  writeFileSync(originFile, match[0]);
  console.log(`\n  Public https link: ${match[0]}\n`);
  console.log("  New QR codes now point here. Re-download any card made before this.");
  console.log("  Keep this running during the demo. Ctrl+C to stop.\n");
}
tunnel.stdout.on("data", onOutput);
tunnel.stderr.on("data", onOutput);

function cleanup() {
  rmSync(originFile, { force: true });
  tunnel.kill();
}
process.on("SIGINT", () => { cleanup(); process.exit(0); });
process.on("SIGTERM", () => { cleanup(); process.exit(0); });
tunnel.on("exit", (code) => {
  rmSync(originFile, { force: true });
  if (!announced) console.error("Tunnel failed to start. Is the app running on port " + port + "?");
  process.exit(code ?? 1);
});
