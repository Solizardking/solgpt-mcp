import { chownSync, chmodSync, mkdirSync } from "node:fs";

// Fly volumes mount as root. Prepare the data directory, then drop privileges
// before importing the HTTP server or handling any requests.
const directory = process.env.API_DATA_DIR ?? "/data";
mkdirSync(directory, { recursive: true, mode: 0o700 });
if (process.getuid?.() === 0) {
  chownSync(directory, 1000, 1000);
  chmodSync(directory, 0o700);
  process.setgroups?.([]);
  process.setgid?.(1000);
  process.setuid?.(1000);
}
await import("./index.ts");
