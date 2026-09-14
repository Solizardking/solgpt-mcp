import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import {
  createPumpFunMcpServer,
  listPumpFunMcpToolNames,
  PUMPFUN_MCP_TOOLS,
} from "./server.ts";
import {
  composioSessionCreateArgs,
  defaultSessionToolkits,
  parseComposioSessionMcp,
  resolveClawdWsOrigin,
  resolveComposioWebhookUrl,
} from "./composio.ts";
import { bondingCurvePda, globalPda } from "./pda.ts";
import { PUMP_PROGRAM_ID } from "./constants.ts";
import { pumpSwapFeeTier, totalFeeBps, bondingCurveFeeTier } from "./fees.ts";
import { mcpServerRoot } from "./utils.ts";

describe("pumpfun MCP server (shipped)", () => {
  it("registers every advertised tool on the real McpServer", () => {
    const names = listPumpFunMcpToolNames();
    expect(names).toEqual([...PUMPFUN_MCP_TOOLS]);
    expect(names).toContain("get-token-info");
    expect(names).toContain("create-token");
    expect(names).toContain("buy-token");
    expect(names).toContain("sell-token");
    expect(names).toContain("dflow-order");
    expect(names).toContain("dflow-priority-fees");
    expect(names).toContain("composio-session-mcp");
    expect(names).toContain("parse-program-logs");
    expect(names).toContain("ows-sign-message");
    expect(names).toContain("ows-sign-tx");
    expect(names).toContain("ows-wallet-list");
    expect(names).toContain("get-rpc-config");
    expect(names).toContain("tracker-price");
    expect(names).toContain("tracker-token");
    expect(names).toContain("tracker-trending");
    expect(names).toContain("birdeye-price");
    expect(names).toContain("jupiter-quote");
    expect(names).toContain("jupiter-swap");
    expect(names).toContain("jupiter-docs-index");
    const server = createPumpFunMcpServer();
    expect(server).toBeTruthy();
    const registered = Object.keys(
      (server as unknown as { _registeredTools: Record<string, unknown> })
        ._registeredTools,
    );
    for (const name of names) {
      expect(registered).toContain(name);
    }
  });

  it("derives the documented global PDA", () => {
    expect(globalPda().address).toBe("4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf");
    const mint = "11111111111111111111111111111111";
    const curve = bondingCurvePda(mint);
    expect(curve.address).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    expect(PUMP_PROGRAM_ID).toBe("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
  });

  it("selects bonding-curve 1.25% and PumpSwap 20M+ 0.30% tiers", () => {
    expect(totalFeeBps(bondingCurveFeeTier())).toBe(125n);
    const top = pumpSwapFeeTier(98_240n * 1_000_000_000n);
    expect(totalFeeBps(top)).toBe(30n);
  });

  it("README documents repo-root vs in-package entrypoints", () => {
    const readme = readFileSync(path.join(mcpServerRoot, "README.md"), "utf8")
    expect(readme).toMatch(/From the repo root/)
    expect(readme).toMatch(/npx tsx mcp-server\/index\.ts/)
    expect(readme).toMatch(/From this directory/)
    expect(readme).toMatch(/npx tsx index\.ts --http/)
    expect(readme).toMatch(/SOLANA_TRACKER_SECURE_RPC/)
    expect(readme).toMatch(/developers\.jup\.ag\/docs\/llms\.txt/)
    expect(existsSync(path.join(mcpServerRoot, "index.ts"))).toBe(true)
    expect(existsSync(path.join(mcpServerRoot, "mcp-server", "index.ts"))).toBe(
      true,
    )
  })

  it("the doubled mcp-server/index.ts path still lists tools", () => {
    const tsx = path.join(mcpServerRoot, "..", "node_modules", ".bin", "tsx")
    const out = execFileSync(tsx, ["mcp-server/index.ts", "--tools"], {
      cwd: mcpServerRoot,
      encoding: "utf8",
      timeout: 20_000,
    })
    expect(out).toMatch(/^get-token-info$/m)
    expect(out).toMatch(/^composio-session-mcp$/m)
  })

  it("defaults session toolkits to CUSTOM_SOLGPT + CUSTOM_CLAWD_WS and production URLs", () => {
    const keys = [
      "COMPOSIO_SESSION_TOOLKITS",
      "COMPOSIO_URL",
      "COMPOSIO_CLAWD_WS_URL",
      "NEXT_PUBLIC_CLAWD_WS_HTTP_URL",
      "NEXT_PUBLIC_PUMP_WS_HTTP_URL",
    ] as const
    const saved: Partial<Record<(typeof keys)[number], string | undefined>> = {}
    for (const key of keys) {
      saved[key] = process.env[key]
      delete process.env[key]
    }
    try {
      expect(defaultSessionToolkits()).toEqual([
        "CUSTOM_SOLGPT",
        "CUSTOM_CLAWD_WS",
      ])
      expect(resolveClawdWsOrigin()).toBe("https://clawd-ws.fly.dev")
      expect(resolveComposioWebhookUrl()).toBe(
        "https://solgpt.us/api/composio/triggers",
      )
    } finally {
      for (const key of keys) {
        if (saved[key] === undefined) delete process.env[key]
        else process.env[key] = saved[key]
      }
    }
  })

  it("builds Composio mcp:true session args without a provider package", () => {
    const planned = composioSessionCreateArgs({
      userId: "user_123",
      toolkits: ["CUSTOM_SOLGPT"],
      directTools: true,
      mcp: true,
    });
    expect(planned.options.mcp).toBe(true);
    expect(planned.options.sessionPreset).toBe("direct_tools");
    expect(planned.options.toolkits).toEqual(["CUSTOM_SOLGPT"]);
    expect(planned.options.sandbox).toEqual({ enable: false });
    expect(planned.attached).toEqual({
      clawdWs: "https://clawd-ws.fly.dev",
    });
    expect(planned.webhookUrl).toBe(
      "https://solgpt.us/api/composio/triggers",
    );
    const parsed = parseComposioSessionMcp({
      mcp: { url: "https://mcp.composio.dev/s/abc", headers: { x: "1" } },
      sessionId: "sess",
    });
    expect(parsed.url).toContain("https://");
    expect(() =>
      composioSessionCreateArgs({ userId: "u", privateKey: "x" } as never),
    ).toThrow(/forbidden/);
  });

  it("includes manageConnections, twitter toolkit, and auth config id", () => {
    const prev = process.env.COMPOSIO_AUTH_CONFIG_ID;
    process.env.COMPOSIO_AUTH_CONFIG_ID = "ac_test_config";
    try {
      const planned = composioSessionCreateArgs({ userId: "u1", mcp: true });
      expect(planned.options.manageConnections).toEqual({ waitForConnections: true });
      expect(planned.authConfigId).toBe("ac_test_config");
      expect(planned.whiteLabelOrigins).toContain("https://solgpt.trade");
      expect(planned.whiteLabelOrigins).toContain("https://x402.life");
      expect((planned.options.toolkits as string[])).toContain("twitter");
    } finally {
      if (prev === undefined) delete process.env.COMPOSIO_AUTH_CONFIG_ID;
      else process.env.COMPOSIO_AUTH_CONFIG_ID = prev;
    }
  });

  it("ships IMAGE_GENERATION_GUIDE and the desk Streamable HTTP route", () => {
    expect(existsSync(path.join(mcpServerRoot, "IMAGE_GENERATION_GUIDE.md"))).toBe(
      true,
    );
    const route = path.join(
      mcpServerRoot,
      "..",
      "src",
      "app",
      "api",
      "pumpfun-mcp",
      "route.ts",
    );
    expect(existsSync(route)).toBe(true);
    const text = readFileSync(route, "utf8");
    expect(text).toMatch(/createPumpFunMcpServer/);
    expect(text).toMatch(/authorizeSolGptMcp/);
  });
});
