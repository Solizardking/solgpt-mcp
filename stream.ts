import {
  BUY_EVENT_DISCRIMINATOR,
  COMPLETE_EVENT_DISCRIMINATOR,
  CREATE_EVENT_DISCRIMINATOR,
  PUMP_AMM_PROGRAM_ID,
  PUMP_PROGRAM_ID,
  SELL_EVENT_DISCRIMINATOR,
  TRADE_EVENT_DISCRIMINATOR,
} from "./constants.ts";
import { pubkey, u64le } from "./decode.ts";

export type ParsedProgramEvent = {
  name: string;
  program: "pump" | "pump-amm" | "unknown";
  signature?: string;
  fields?: Record<string, string | boolean | number>;
  rawBase64?: string;
};

const DISC_TO_NAME: Array<{ disc: Buffer; name: string; program: ParsedProgramEvent["program"] }> = [
  { disc: TRADE_EVENT_DISCRIMINATOR, name: "TradeEvent", program: "pump" },
  { disc: BUY_EVENT_DISCRIMINATOR, name: "BuyEvent", program: "pump-amm" },
  { disc: SELL_EVENT_DISCRIMINATOR, name: "SellEvent", program: "pump-amm" },
  { disc: CREATE_EVENT_DISCRIMINATOR, name: "CreateEvent", program: "pump" },
  { disc: COMPLETE_EVENT_DISCRIMINATOR, name: "CompleteEvent", program: "pump" },
];

function discHex(buf: Buffer): string {
  return buf.toString("hex");
}

const DISC_MAP = new Map(DISC_TO_NAME.map((d) => [discHex(d.disc), d]));

export function parseTradeEventFields(data: Buffer): Record<string, string | boolean | number> {
  // TradeEvent: mint, sol_amount, token_amount, is_buy, user, timestamp, virtual_* ...
  if (data.length < 8 + 32 + 8 + 8 + 1 + 32 + 8) {
    return {};
  }
  let o = 8;
  const mint = pubkey(data, o);
  o += 32;
  const solAmount = u64le(data, o).toString();
  o += 8;
  const tokenAmount = u64le(data, o).toString();
  o += 8;
  const isBuy = data[o] !== 0;
  o += 1;
  const user = pubkey(data, o);
  o += 32;
  const timestamp = Number(data.readBigInt64LE(o));
  return { mint, solAmount, tokenAmount, isBuy, user, timestamp };
}

export function parseProgramLogs(logs: string[]): ParsedProgramEvent[] {
  const events: ParsedProgramEvent[] = [];
  for (const line of logs) {
    const marker = "Program data: ";
    const idx = line.indexOf(marker);
    if (idx < 0) continue;
    const b64 = line.slice(idx + marker.length).trim();
    let buf: Buffer;
    try {
      buf = Buffer.from(b64, "base64");
    } catch {
      continue;
    }
    if (buf.length < 8) continue;
    const meta = DISC_MAP.get(discHex(buf.subarray(0, 8)));
    const event: ParsedProgramEvent = {
      name: meta?.name ?? "UnknownEvent",
      program: meta?.program ?? "unknown",
      rawBase64: b64,
    };
    if (meta?.name === "TradeEvent") {
      event.fields = parseTradeEventFields(buf);
    }
    events.push(event);
  }
  return events;
}

export function classifyLogs(logs: string[]): {
  programs: string[];
  events: ParsedProgramEvent[];
} {
  const programs: string[] = [];
  for (const line of logs) {
    if (line.includes(PUMP_PROGRAM_ID)) programs.push("pump");
    if (line.includes(PUMP_AMM_PROGRAM_ID)) programs.push("pump-amm");
  }
  return { programs: [...new Set(programs)], events: parseProgramLogs(logs) };
}

export type StreamEvent = {
  source: "pump-logs" | "pump-amm-logs" | "pump-tape" | "dflow-priority-fees";
  at: number;
  payload: unknown;
};

const RING_MAX = 200;
const rings = new Map<string, StreamEvent[]>();

export function pushStreamEvent(key: string, event: StreamEvent): void {
  const list = rings.get(key) ?? [];
  list.push(event);
  if (list.length > RING_MAX) list.splice(0, list.length - RING_MAX);
  rings.set(key, list);
}

export function pollStreamEvents(key: string, after = 0): StreamEvent[] {
  const list = rings.get(key) ?? [];
  return list.filter((e) => e.at > after);
}

export function logsSubscribeMessage(mentions: string[]) {
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "logsSubscribe",
    params: [{ mentions }, { commitment: "confirmed" }],
  };
}

export function dflowPriorityFeesStreamUrl(base: string): string {
  const trimmed = base.replace(/\/$/, "");
  const ws = trimmed.startsWith("https://")
    ? `wss://${trimmed.slice("https://".length)}`
    : trimmed.startsWith("http://")
      ? `ws://${trimmed.slice("http://".length)}`
      : trimmed;
  return `${ws}/priority-fees/stream`;
}

export function parseDflowPriorityFees(json: unknown): {
  mediumMicroLamports: number;
  highMicroLamports: number;
  veryHighMicroLamports: number;
} {
  if (!json || typeof json !== "object") {
    throw new Error("priority-fees response must be an object");
  }
  const rec = json as Record<string, unknown>;
  const medium = Number(rec.mediumMicroLamports);
  const high = Number(rec.highMicroLamports);
  const veryHigh = Number(rec.veryHighMicroLamports);
  if (![medium, high, veryHigh].every((n) => Number.isFinite(n) && n >= 0)) {
    throw new Error("priority-fees missing medium/high/veryHigh microLamports");
  }
  return {
    mediumMicroLamports: medium,
    highMicroLamports: high,
    veryHighMicroLamports: veryHigh,
  };
}

export type PumpTapeMessage = {
  type?: string;
  mint?: string | null;
  signature?: string | null;
  name?: string | null;
  symbol?: string | null;
};

export function coercePumpTapeMessage(input: unknown): PumpTapeMessage | null {
  if (!input || typeof input !== "object") return null;
  const type = (input as { type?: unknown }).type;
  if (
    type === "token-launch" ||
    type === "status" ||
    type === "token-enriched"
  ) {
    return input as PumpTapeMessage;
  }
  return null;
}
