import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMcpHttpServer } from "./http.ts";
import { listPumpFunMcpToolNames } from "./server.ts";

describe("HTTP deployment", () => {
  const server = createMcpHttpServer({ host: "127.0.0.1", token: "test-token" });
  let base: string;
  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("Missing listener");
    base = `http://127.0.0.1:${addr.port}`;
  });
  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  });
  it("requires authentication for a public listener", () => {
    expect(() => createMcpHttpServer({ host: "0.0.0.0" })).toThrow("MCP_HTTP_AUTH_TOKEN");
  });
  it("serves health independently of MCP auth", async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      tools: listPumpFunMcpToolNames().length,
    });
  });
  it("rejects missing and incorrect credentials", async () => {
    for (const authorization of ["", "Bearer wrong"]) {
      const res = await fetch(`${base}/mcp`, { method: "POST", headers: { authorization } });
      expect(res.status).toBe(401);
    }
  });
  it("rejects cross-origin requests", async () => {
    const res = await fetch(`${base}/mcp`, { headers: { authorization: "Bearer test-token", origin: "https://untrusted.example" } });
    expect(res.status).toBe(403);
  });
  it("lists tools with a valid bearer", async () => {
    const res = await fetch(`${base}/mcp`, {
      method: "POST",
      headers: { authorization: "Bearer test-token", "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(res.status).toBe(200);
    const result = await res.json();
    expect(result.result.tools).toHaveLength(listPumpFunMcpToolNames().length);
  });
  it("rejects oversized requests", async () => {
    const res = await fetch(`${base}/mcp`, {
      method: "POST", headers: { authorization: "Bearer test-token" }, body: "x".repeat(1024 * 1024 + 1),
    });
    expect(res.status).toBe(413);
  });
  it("does not expose other paths", async () => {
    expect((await fetch(`${base}/.env.local`)).status).toBe(404);
  });
});
