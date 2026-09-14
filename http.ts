import { createHash, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createPumpFunMcpServer, listPumpFunMcpToolNames } from "./server.ts";
import { AccessError, AccessService, CLAWD_MINT, HOLDER_EXCLUDED_TOOLS } from "./access.ts";
import { handlePortal, json, serveAsset } from "./portal.ts";
import { emitSpan } from "./otel.ts";

const MAX_BODY_BYTES = 1024 * 1024;
const digest = (value: string) => createHash("sha256").update(value).digest();

export function createMcpHttpServer(options: { host: string; token?: string; access?: AccessService; origin?: string }) {
  const token = options.token?.trim();
  if (!token && !["127.0.0.1", "::1", "localhost"].includes(options.host)) {
    throw new Error("MCP_HTTP_AUTH_TOKEN is required for non-loopback HTTP listeners");
  }
  let access = options.access;
  const getAccess = () => access ??= new AccessService();
  const server = createServer((req, res) => {
    const origin = options.origin ?? process.env.PUBLIC_ORIGIN ?? `http://${req.headers.host ?? "localhost"}`;
    handleHttp(req, res, token, getAccess, origin).catch((error) => {
      if (error instanceof AccessError) { json(res, error.status, { error: error.message }); return; }
      console.error("MCP HTTP request failed", error instanceof Error ? error.name : "Error");
      if (!res.headersSent) sendJson(res, 500, { error: "Internal server error" });
      else res.destroy();
    });
  });
  server.on("close", () => access?.close());
  return server;
}

function sendJson(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
  res.end(JSON.stringify(value));
}

async function handleHttp(req: IncomingMessage, res: ServerResponse, token: string | undefined, getAccess: () => AccessService, origin: string) {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (req.method === "GET" && serveAsset(url.pathname, res)) return;
  if (url.pathname === "/api/config" && req.method === "GET") {
    json(res, 200, { mint: CLAWD_MINT, requirement: "Any positive Clawd balance", toolCount: listPumpFunMcpToolNames().filter(name => !HOLDER_EXCLUDED_TOOLS.has(name)).length, endpoint: origin + "/mcp" });
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    await handlePortal(req, res, url.pathname, getAccess(), origin);
    return;
  }
  if (url.pathname === "/health" && req.method === "GET") {
    void emitSpan("mcp.health", { "http.route": "/health" });
    sendJson(res, 200, { ok: true, tools: listPumpFunMcpToolNames().length });
    return;
  }
  if (url.pathname !== "/mcp") {
    sendJson(res, 404, { error: "Not found" });
    return;
  }
  let holder = false;
  const authorization = req.headers.authorization ?? "";
  const operator = token && timingSafeEqual(digest(authorization), digest(`Bearer ${token}`));
  if (!operator && authorization.startsWith("Bearer clawd_")) {
    await getAccess().authorize(authorization.slice(7));
    holder = true;
  }
  if (token && !operator && !holder) {
    res.setHeader("WWW-Authenticate", 'Bearer realm="pumpfun-mcp"');
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }
  if (req.headers.origin) {
    let allowed = false;
    try { allowed = new URL(req.headers.origin).host === req.headers.host; } catch { /* invalid origin */ }
    if (!allowed) {
      sendJson(res, 403, { error: "Origin not allowed" });
      return;
    }
  }
  if (!["GET", "POST", "DELETE"].includes(req.method ?? "")) {
    res.setHeader("Allow", "GET, POST, DELETE");
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      sendJson(res, 413, { error: "Request body too large" });
      return;
    }
    chunks.push(Buffer.from(chunk));
  }
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(", "));
  }
  const request = new Request(url, {
    method: req.method,
    headers,
    body: req.method === "GET" ? undefined : Buffer.concat(chunks),
  });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createPumpFunMcpServer({ holder });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.setHeader("cache-control", "no-store");
    res.end(Buffer.from(await response.arrayBuffer()));
  } finally {
    await server.close().catch(() => undefined);
  }
}
