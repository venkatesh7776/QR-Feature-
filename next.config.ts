import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

// Allow phones on the same Wi-Fi to load the dev server via the LAN IP.
const lanHosts = Object.values(networkInterfaces())
  .flat()
  .filter((n) => n && n.family === "IPv4" && !n.internal)
  .map((n) => n!.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: [...lanHosts, "*.trycloudflare.com"],
};

export default nextConfig;
