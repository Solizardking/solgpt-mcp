import { fileURLToPath } from "node:url";
import path from "node:path";
import { PublicKey } from "@solana/web3.js";
import { rpcUrl as resolveRpcUrl } from "./config.ts";
import { assertNoSecretFields } from "./secrets.ts";

const here = path.dirname(fileURLToPath(import.meta.url));

export const mcpServerRoot = here;
export const repoRoot = path.resolve(here, "..");
export const docsRoot = process.env.PUMP_DOCS_ROOT || path.resolve(repoRoot, "docs");

export function jsonText(value: unknown): string {
  return JSON.stringify(
    value,
    (_k, v) => (typeof v === "bigint" ? v.toString() : v),
    2,
  );
}

export function mcpText(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: typeof value === "string" ? value : jsonText(value),
      },
    ],
  };
}

export function mcpError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}

export function requirePubkey(label: string, value: string | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) throw new Error(`${label} is required`);
  try {
    return new PublicKey(raw).toBase58();
  } catch {
    throw new Error(`${label} is not a valid Solana public key`);
  }
}

export function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function guardedArgs<T extends Record<string, unknown>>(args: T): T {
  assertNoSecretFields(args);
  return args;
}

/** Primary Solana JSON-RPC — Solana Tracker first. See config.ts. */
export function rpcUrl(): string {
  return resolveRpcUrl();
}
