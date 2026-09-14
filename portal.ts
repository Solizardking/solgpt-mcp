import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { AccessError, AccessService, CLAWD_MINT, SESSION_COOKIE } from "./access.ts";

const assets: Record<string, [string, string]> = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
  "/favicon.svg": ["favicon.svg", "image/svg+xml"],
  "/favicon.ico": ["favicon.ico", "image/x-icon"],
  "/favicon.png": ["favicon.png", "image/png"],
  "/clawd-gateway-mark.png": ["clawd-gateway-mark.png", "image/png"],
  "/clawd-gateway-wordmark.png": ["clawd-gateway-wordmark.png", "image/png"],
};
export function serveAsset(path: string, res: ServerResponse) {
  const asset = assets[path];
  if (!asset) return false;
  res.writeHead(200, {
    "content-type": asset[1], "cache-control": "no-cache", "x-content-type-options": "nosniff",
    "referrer-policy": "same-origin",
    "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  });
  res.end(readFileSync(new URL(`./public/${asset[0]}`, import.meta.url)));
  return true;
}
export function json(res: ServerResponse, status: number, value: unknown) {
  if (status === 429) res.setHeader("Retry-After", "60");
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  res.end(JSON.stringify(value));
}
export async function readJson(req: IncomingMessage) {
  if (!req.headers["content-type"]?.startsWith("application/json")) throw new AccessError(415, "Use application/json.");
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 16_384) throw new AccessError(413, "Request too large.");
    chunks.push(Buffer.from(chunk));
  }
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString());
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch { throw new AccessError(400, "Invalid JSON request."); }
}
function string(body: Record<string, unknown>, key: string, max = 1000) {
  if (typeof body[key] !== "string" || body[key].length > max) throw new AccessError(400, `Invalid ${key}.`);
  return body[key] as string;
}
export function sessionCookie(req: IncomingMessage) {
  return req.headers.cookie?.split(";").map(x => x.trim()).find(x => x.startsWith(SESSION_COOKIE + "="))?.slice(SESSION_COOKIE.length + 1);
}
export async function handlePortal(req: IncomingMessage, res: ServerResponse, pathname: string, access: AccessService, origin: string) {
  const ip = process.env.FLY_APP_NAME ? String(req.headers["fly-client-ip"] ?? req.socket.remoteAddress) : String(req.socket.remoteAddress);
  access.rateLimit("portal:" + ip, 60);
  if (req.method !== "GET" && req.headers.origin !== origin) throw new AccessError(403, "Open this page on the service's own domain to continue.");
  if (pathname === "/api/challenge" && req.method === "POST") {
    const body = await readJson(req);
    return json(res, 200, access.challenge(string(body, "wallet", 44), origin));
  }
  if (pathname === "/api/login" && req.method === "POST") {
    const body = await readJson(req);
    const result = access.login(string(body, "id", 100), string(body, "signature", 100));
    const secure = origin.startsWith("https:") ? "; Secure" : "";
    res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${result.token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600${secure}`);
    return json(res, 200, { wallet: result.wallet });
  }
  const token = sessionCookie(req);
  if (pathname === "/api/session" && req.method === "GET" && !token) return json(res, 200, { authenticated: false });
  if (pathname === "/api/logout" && req.method === "POST") {
    access.logout(token);
    res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${origin.startsWith("https:") ? "; Secure" : ""}`);
    return json(res, 200, { ok: true });
  }
  const wallet = access.wallet(token);
  if (pathname === "/api/session" && req.method === "GET") {
    const balance = await access.balance(wallet, true);
    return json(res, 200, { wallet, balance: balance.display, eligible: BigInt(balance.raw) > 0n, mint: CLAWD_MINT });
  }
  if (pathname === "/api/keys" && req.method === "GET") return json(res, 200, { keys: access.listKeys(wallet) });
  if (pathname === "/api/keys" && req.method === "POST") {
    const body = await readJson(req);
    return json(res, 201, await access.issue(wallet, string(body, "name", 60), string(body, "purpose", 500)));
  }
  const match = pathname.match(/^\/api\/keys\/([a-f0-9]{24})$/);
  if (match && req.method === "DELETE") {
    access.revoke(wallet, match[1]!);
    return json(res, 200, { ok: true });
  }
  throw new AccessError(404, "Not found.");
}
