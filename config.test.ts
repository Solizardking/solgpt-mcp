import { afterEach, describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  alchemyRpc,
  describeRpcConfig,
  getBirdeyeApiKey,
  getJupiterApiKey,
  getJupiterBase,
  getJupiterSwapV2Base,
  getJupiterTokensBase,
  getRpcUrlCandidates,
  getSolanaTrackerAccessKey,
  getSolanaTrackerDataKey,
  getWsUrl,
  jupiterHeaders,
  primaryRpcProvider,
  redactUrl,
  rpcHost,
  rpcUrl,
} from "./config.ts";
import { mcpServerRoot } from "./utils.ts";

const KEYS = [
  "SOLANA_TRACKER_SECURE_RPC",
  "SECURE_RPC_URL",
  "SOLANA_TRACKER_RPC_URL",
  "SOLANA_RPC_URL",
  "RPC_URL",
  "SOLANA_TRACKER_ACCESS_KEY",
  "ACCESS_KEY",
  "SOLANA_TRACKER_API_KEY",
  "SOLANATRACKER_API_KEY",
  "SOLANA_TRACKER_DATA_API_KEY",
  "TRACKER_API_KEY",
  "HELIUS_RPC_URL",
  "HELIUS_API_KEY",
  "ALCHEMY_API_KEY",
  "ALCHEMY_RPC_URL",
  "ALCHEMY_SOLANA_NETWORK",
  "SOLANA_BACKUP_RPC_URL",
  "SOLANA_PUBLIC_RPC_URL",
  "SOLANA_TRACKER_WSS_URL",
  "WSS_URL",
  "BIRDEYE_API_KEY",
  "BIRDEYE_WSS_URL",
  "JUPITER_API_KEY",
  "JUP_SWAP_V1_API_KEY",
  "JUPITER_API_BASE",
  "JUPITER_TOKENS_BASE",
] as const;

const saved: Partial<Record<(typeof KEYS)[number], string | undefined>> = {};

function isolate() {
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
}

function restore() {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
}

describe("Alchemy then Helius beat leftover Tracker RPC", () => {
  afterEach(restore);

  it("builds Alchemy RPC from ALCHEMY_API_KEY ahead of Helius and Tracker", () => {
    isolate();
    process.env.ALCHEMY_API_KEY = "alchemy-dummy-key";
    process.env.HELIUS_RPC_URL =
      "https://mainnet.helius-rpc.com/?api-key=helius-test";
    process.env.SOLANA_TRACKER_SECURE_RPC =
      "https://noble-pixel-8584.secure.rpc.solanatracker.io";
    process.env.SOLANA_RPC_URL =
      "https://rpc-mainnet.solanatracker.io/?api_key=test-access";
    expect(alchemyRpc()).toBe(
      "https://solana-mainnet.g.alchemy.com/v2/alchemy-dummy-key",
    );
    expect(rpcUrl()).toBe(
      "https://solana-mainnet.g.alchemy.com/v2/alchemy-dummy-key",
    );
    expect(primaryRpcProvider()).toBe("alchemy");
    const candidates = getRpcUrlCandidates();
    const alchemyIdx = candidates.findIndex((u) => u.includes("alchemy.com"));
    const heliusIdx = candidates.findIndex((u) => u.includes("helius"));
    const trackerIdx = candidates.findIndex((u) =>
      u.includes("solanatracker.io"),
    );
    expect(alchemyIdx).toBe(0);
    expect(heliusIdx).toBeGreaterThan(alchemyIdx);
    expect(trackerIdx).toBeGreaterThan(heliusIdx);
  });

  it("prefers Helius over Tracker Secure and leftover SOLANA_RPC_URL Tracker hosts", () => {
    isolate();
    process.env.SOLANA_TRACKER_SECURE_RPC =
      "https://noble-pixel-8584.secure.rpc.solanatracker.io";
    process.env.HELIUS_RPC_URL =
      "https://mainnet.helius-rpc.com/?api-key=helius-test";
    process.env.SOLANA_RPC_URL =
      "https://rpc-mainnet.solanatracker.io/?api_key=test-access";
    process.env.RPC_URL =
      "https://rpc-mainnet.solanatracker.io/?api_key=test-access";
    expect(rpcHost(rpcUrl())).toBe("mainnet.helius-rpc.com");
    expect(primaryRpcProvider()).toBe("helius");
    const candidates = getRpcUrlCandidates();
    expect(candidates[0]).toContain("helius");
    expect(candidates.some((u) => u.includes("solanatracker.io"))).toBe(true);
    expect(
      candidates.findIndex((u) => u.includes("solanatracker.io")),
    ).toBeGreaterThan(candidates.findIndex((u) => u.includes("helius")));
  });

  it("builds Tracker RPC from ACCESS_KEY when Alchemy and Helius are unset", () => {
    isolate();
    process.env.SOLANA_TRACKER_ACCESS_KEY = "test-access-key";
    expect(rpcUrl()).toContain("rpc-mainnet.solanatracker.io");
    expect(rpcUrl()).toContain("api_key=test-access-key");
    expect(getSolanaTrackerAccessKey()).toBe("test-access-key");
    expect(getSolanaTrackerDataKey()).toBeNull();
  });

  it("ignores ACCESS_KEY / SOLANA_TRACKER_ACCESS_KEY for Data API auth", () => {
    isolate();
    process.env.ACCESS_KEY = "rpc-access-only";
    process.env.SOLANA_TRACKER_ACCESS_KEY = "rpc-access-only";
    expect(getSolanaTrackerDataKey()).toBeNull();
    expect(getSolanaTrackerAccessKey()).toBe("rpc-access-only");
  });

  it("prefers Tracker WSS over derived HTTP", () => {
    isolate();
    process.env.SOLANA_TRACKER_WSS_URL =
      "wss://rpc-mainnet.solanatracker.io/?api_key=test-access";
    process.env.SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";
    expect(getWsUrl()).toContain("wss://rpc-mainnet.solanatracker.io");
  });

  it("redacts api keys in describeRpcConfig", () => {
    isolate();
    process.env.ALCHEMY_API_KEY = "alchemy-super-secret";
    process.env.SOLANA_TRACKER_RPC_URL =
      "https://rpc-mainnet.solanatracker.io/?api_key=super-secret";
    process.env.SOLANA_TRACKER_ACCESS_KEY = "super-secret";
    process.env.BIRDEYE_API_KEY = "birdeye-secret";
    process.env.JUPITER_API_KEY = "jup_secret";
    const snapshot = describeRpcConfig();
    expect(JSON.stringify(snapshot)).not.toContain("super-secret");
    expect(JSON.stringify(snapshot)).not.toContain("alchemy-super-secret");
    expect(JSON.stringify(snapshot)).not.toContain("birdeye-secret");
    expect(JSON.stringify(snapshot)).not.toContain("jup_secret");
    expect(snapshot.rpcUrl).toContain("REDACTED");
    expect(snapshot.provider).toBe("alchemy");
    expect(snapshot.tracker.accessKey).toBe(true);
    expect(snapshot.birdeye.configured).toBe(true);
    expect(snapshot.jupiter.configured).toBe(true);
    expect(redactUrl("https://example/?api_key=abc")).toContain("REDACTED");
    expect(
      redactUrl("https://solana-mainnet.g.alchemy.com/v2/alchemy-super-secret"),
    ).toContain("REDACTED");
  });

  it("wires Jupiter paid host and tokens base from env", () => {
    isolate();
    process.env.JUPITER_API_KEY = "jup_test";
    process.env.JUPITER_TOKENS_BASE = "https://api.jup.ag/tokens/v2";
    expect(getJupiterApiKey()).toBe("jup_test");
    expect(getJupiterBase()).toBe("https://api.jup.ag");
    expect(getJupiterTokensBase()).toBe("https://api.jup.ag/tokens/v2");
    expect(jupiterHeaders()["x-api-key"]).toBe("jup_test");
    expect(getJupiterSwapV2Base()).toBe("https://api.jup.ag/swap/v2");
    expect(getBirdeyeApiKey()).toBeNull();
  });
});

describe("env.example secret boundary", () => {
  it("src/index.ts uses config.rpcUrl instead of Tracker-first env peeking", () => {
    const src = readFileSync(path.join(mcpServerRoot, "src/index.ts"), "utf8");
    expect(src).toMatch(/rpcUrl as resolvePrimaryRpc/);
    expect(src).toMatch(/from ["']\.\.\/config\.ts["']/);
    expect(src).not.toMatch(/process\.env\.SOLANA_TRACKER_SECURE_RPC/);
  });

  it("documents Tracker / Birdeye / Jupiter placeholders and no live keys", () => {
    const example = readFileSync(path.join(mcpServerRoot, "env.example"), "utf8");
    expect(example).toMatch(/ALCHEMY_API_KEY=/);
    expect(example).toMatch(/ALCHEMY_RPC_URL=/);
    expect(example).toMatch(/HELIUS_RPC_URL=/);
    expect(example).toMatch(/SOLANA_TRACKER_SECURE_RPC=/);
    expect(example).toMatch(/SOLANA_TRACKER_RPC_URL=/);
    expect(example).toMatch(/SOLANA_TRACKER_WSS_URL=/);
    expect(example).toMatch(/SOLANA_TRACKER_ACCESS_KEY=/);
    expect(example).toMatch(/BIRDEYE_API_KEY=/);
    expect(example).toMatch(/BIRDEYE_WSS_URL=/);
    expect(example).toMatch(/JUPITER_API_KEY=/);
    expect(example).toMatch(/JUP_SWAP_V1_API_KEY=/);
    expect(example).toMatch(/JUPITER_TOKENS_BASE=/);
    expect(example).toMatch(/developers\.jup\.ag\/docs\/llms\.txt/);
    expect(example).not.toMatch(/a56a80ed-2925-4f0d-8634-5a2490144065/);
    expect(example).not.toMatch(/8cf3b4f2a3c249bd8a31ab3e594858ac/);
    expect(example).not.toMatch(/jup_5b594f11a6990e78f52e0c59d88b8554950ff175/);
    expect(existsSync(path.join(mcpServerRoot, ".gitignore"))).toBe(true);
    const gitignore = readFileSync(path.join(mcpServerRoot, ".gitignore"), "utf8");
    expect(gitignore).toMatch(/\.env\.local/);
  });
});
