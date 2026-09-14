import { describe, expect, it } from "vitest";
import { clawdWsOrigin, clawdWsHealthUrl, clawdWsWebSocketUrl } from "./clawd-ws.ts";

describe("clawd-ws canonical upstream", () => {
  it("defaults to clawd-ws.fly.dev", () => {
    expect(clawdWsOrigin({})).toBe("https://clawd-ws.fly.dev");
    expect(clawdWsHealthUrl({})).toBe("https://clawd-ws.fly.dev/health");
    expect(clawdWsWebSocketUrl({})).toBe("wss://clawd-ws.fly.dev/ws");
  });
  it("strips path from COMPOSIO_CLAWD_WS_URL", () => {
    expect(clawdWsOrigin({ COMPOSIO_CLAWD_WS_URL: "https://clawd-ws.fly.dev/extra" })).toBe(
      "https://clawd-ws.fly.dev",
    );
  });
});
