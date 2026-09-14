/**
 * Model catalog + chat for OpenRouter, RedPill TEE, and xAI.
 * Never returns API keys. Prefer RedPill for configured REDPILL_MODEL1..6.
 */
import { env } from "./config.ts";

export const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
export const REDPILL_BASE = "https://api.redpill.ai/v1";
export const XAI_BASE = "https://api.x.ai/v1";

export const REDPILL_DEFAULT_MODELS = [
  "nvidia/nemotron-3.5-lightning",
  "z-ai/glm-5.3",
  "qwen/qwen3.8-27b",
  "meta/muse-glimmer-30b",
  "deepseek/deepseek-v4-flash-0731",
  "z-ai/glm-5.3-flash",
] as const;

export type ModelProvider = "openrouter" | "redpill" | "xai";

export type CatalogModel = {
  id: string;
  name?: string;
  provider: ModelProvider;
  context_length?: number;
  pricing?: unknown;
  modalities?: string[];
};

function stripPrefix(id: string, prefix: string): string {
  const t = id.trim();
  return t.toLowerCase().startsWith(prefix) ? t.slice(prefix.length) : t;
}

export function getOpenRouterApiKey(): string | null {
  return env("OPENROUTER_API_KEY") || env("SOLGPT_API_KEY") || null;
}

export function getRedpillApiKey(): string | null {
  return env("REDPILL_API_KEY") || null;
}

export function getXaiApiKey(): string | null {
  return env("XAI_API_KEY") || null;
}

export function getRedpillModels(): string[] {
  const picked = [1, 2, 3, 4, 5, 6]
    .map((n) => stripPrefix(env(`REDPILL_MODEL${n}`), "redpill:").trim())
    .filter(Boolean);
  return picked.length ? [...new Set(picked)] : [...REDPILL_DEFAULT_MODELS];
}

export function redpillTeeRequired(): boolean {
  const v = env("REDPILL_TEE_REQUIRED").toLowerCase();
  return !(v === "0" || v === "false" || v === "no" || v === "off");
}

export function isRedpillModel(modelId: string): boolean {
  const raw = stripPrefix(modelId, "redpill:").toLowerCase();
  if (!raw.includes("/")) return false;
  if (modelId.trim().toLowerCase().startsWith("redpill:")) return true;
  return getRedpillModels().some((m) => m.toLowerCase() === raw);
}

export function isXaiModel(modelId: string): boolean {
  const id = stripPrefix(modelId, "xai:").toLowerCase();
  return id.startsWith("grok-") || id.startsWith("grok/") || modelId.trim().toLowerCase().startsWith("xai:");
}

export function resolveProvider(modelId: string): {
  provider: ModelProvider;
  modelId: string;
  baseURL: string;
  apiKey: string | null;
} {
  if (isRedpillModel(modelId) && getRedpillApiKey()) {
    return {
      provider: "redpill",
      modelId: stripPrefix(modelId, "redpill:"),
      baseURL: (env("REDPILL_URL") || env("REDPILL_BASE_URL") || REDPILL_BASE).replace(/\/$/, ""),
      apiKey: getRedpillApiKey(),
    };
  }
  if (isXaiModel(modelId) && getXaiApiKey()) {
    return {
      provider: "xai",
      modelId: stripPrefix(modelId, "xai:"),
      baseURL: (env("XAI_BASE_URL") || XAI_BASE).replace(/\/$/, ""),
      apiKey: getXaiApiKey(),
    };
  }
  return {
    provider: "openrouter",
    modelId: stripPrefix(modelId, "openrouter:"),
    baseURL: (env("OPENROUTER_BASE") || OPENROUTER_BASE).replace(/\/$/, ""),
    apiKey: getOpenRouterApiKey(),
  };
}

async function jsonFetch(
  url: string,
  apiKey: string,
  init: RequestInit = {},
): Promise<{ status: number; json: unknown; headers: Headers }> {
  const res = await fetch(url, {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      accept: "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { error: { message: text.slice(0, 500) } };
  }
  return { status: res.status, json, headers: res.headers };
}

export async function searchModels(opts: {
  query?: string;
  provider?: ModelProvider | "all";
  limit?: number;
  offset?: number;
}): Promise<{ models: CatalogModel[]; total: number }> {
  const limit = Math.max(1, Math.min(100, opts.limit ?? 40));
  const offset = Math.max(0, opts.offset ?? 0);
  const q = (opts.query || "").trim().toLowerCase();
  const want = opts.provider || "all";
  const out: CatalogModel[] = [];

  if ((want === "all" || want === "redpill") && getRedpillApiKey()) {
    for (const id of getRedpillModels()) {
      if (q && !id.toLowerCase().includes(q)) continue;
      out.push({ id, name: id, provider: "redpill", modalities: ["text"] });
    }
    // Also try live RedPill catalog
    try {
      const key = getRedpillApiKey()!;
      const { status, json } = await jsonFetch(`${REDPILL_BASE}/models`, key);
      if (status < 400 && json && typeof json === "object" && Array.isArray((json as { data?: unknown }).data)) {
        for (const row of (json as { data: Array<Record<string, unknown>> }).data) {
          const id = String(row.id || "");
          if (!id) continue;
          if (q && !id.toLowerCase().includes(q) && !String(row.name || "").toLowerCase().includes(q)) continue;
          if (!out.some((m) => m.id === id && m.provider === "redpill")) {
            out.push({
              id,
              name: String(row.name || id),
              provider: "redpill",
              context_length: typeof row.context_length === "number" ? row.context_length : undefined,
              pricing: row.pricing,
              modalities: Array.isArray(row.input_modalities)
                ? (row.input_modalities as string[])
                : ["text"],
            });
          }
        }
      }
    } catch {
      /* keep slot list */
    }
  }

  if ((want === "all" || want === "openrouter") && getOpenRouterApiKey()) {
    const key = getOpenRouterApiKey()!;
    const { status, json } = await jsonFetch(`${OPENROUTER_BASE}/models`, key, {
      headers: {
        "HTTP-Referer": "https://solgpt.trade",
        "X-Title": "SOL-GPT MCP",
      },
    });
    if (status >= 400) throw new Error(`OpenRouter models failed (${status})`);
    const data = (json as { data?: Array<Record<string, unknown>> })?.data || [];
    for (const row of data) {
      const id = String(row.id || "");
      if (!id) continue;
      const name = String(row.name || id);
      if (q && !id.toLowerCase().includes(q) && !name.toLowerCase().includes(q)) continue;
      const arch = row.architecture as { modality?: string; input_modalities?: string[] } | undefined;
      out.push({
        id,
        name,
        provider: "openrouter",
        context_length: typeof row.context_length === "number" ? row.context_length : undefined,
        pricing: row.pricing,
        modalities: arch?.input_modalities || (arch?.modality ? [arch.modality] : ["text"]),
      });
    }
  }

  if ((want === "all" || want === "xai") && getXaiApiKey()) {
    const key = getXaiApiKey()!;
    try {
      const { status, json } = await jsonFetch(`${XAI_BASE}/models`, key);
      if (status < 400) {
        const data = (json as { data?: Array<Record<string, unknown>> })?.data || [];
        for (const row of data) {
          const id = String(row.id || "");
          if (!id) continue;
          if (q && !id.toLowerCase().includes(q)) continue;
          out.push({ id, name: String(row.name || id), provider: "xai", modalities: ["text"] });
        }
      }
    } catch {
      // fallback known ids
      for (const id of ["grok-4.6", "grok-imagine-image-2.0", "grok-imagine-video-1.5"]) {
        if (q && !id.includes(q)) continue;
        out.push({ id, name: id, provider: "xai" });
      }
    }
  }

  const total = out.length;
  return { models: out.slice(offset, offset + limit), total };
}

export async function getModelInfo(modelId: string): Promise<CatalogModel | null> {
  const { models } = await searchModels({ query: modelId, limit: 50 });
  const exact = models.find((m) => m.id.toLowerCase() === modelId.toLowerCase());
  return exact || models[0] || null;
}

export async function validateModel(modelId: string): Promise<{ valid: boolean; provider?: ModelProvider; id?: string }> {
  const resolved = resolveProvider(modelId);
  if (!resolved.apiKey) return { valid: false };
  if (resolved.provider === "redpill") {
    return { valid: isRedpillModel(modelId), provider: "redpill", id: resolved.modelId };
  }
  const info = await getModelInfo(resolved.modelId);
  return { valid: !!info, provider: resolved.provider, id: resolved.modelId };
}

export async function chatCompletion(args: {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  temperature?: number;
  max_tokens?: number;
}): Promise<unknown> {
  const resolved = resolveProvider(args.model);
  if (!resolved.apiKey) {
    throw new Error(
      resolved.provider === "redpill"
        ? "REDPILL_API_KEY missing"
        : resolved.provider === "xai"
          ? "XAI_API_KEY missing"
          : "OPENROUTER_API_KEY missing",
    );
  }
  const body: Record<string, unknown> = {
    model: resolved.modelId,
    messages: args.messages,
  };
  if (args.temperature != null) body.temperature = args.temperature;
  if (args.max_tokens != null) body.max_tokens = args.max_tokens;
  if (resolved.provider === "redpill" && redpillTeeRequired()) {
    body.provider = { aci_verified: true };
  }
  const headers: Record<string, string> = {};
  if (resolved.provider === "openrouter") {
    headers["HTTP-Referer"] = "https://solgpt.trade";
    headers["X-Title"] = "SOL-GPT MCP";
  }
  const { status, json, headers: resHeaders } = await jsonFetch(
    `${resolved.baseURL}/chat/completions`,
    resolved.apiKey,
    { method: "POST", body: JSON.stringify(body), headers },
  );
  if (status >= 400) {
    const msg =
      typeof json === "object" && json && "error" in json
        ? JSON.stringify((json as { error: unknown }).error)
        : `HTTP ${status}`;
    throw new Error(`${resolved.provider} chat failed: ${msg}`);
  }
  const receipt = resHeaders.get("x-receipt-id");
  if (receipt && typeof json === "object" && json) {
    return { ...(json as object), _meta: { provider: resolved.provider, receipt_id: receipt } };
  }
  return { ...(typeof json === "object" && json ? json : { data: json }), _meta: { provider: resolved.provider } };
}

/** xAI Responses API (preferred for Grok). */
export async function xaiResponses(args: {
  model?: string;
  input: unknown;
  previous_response_id?: string;
  store?: boolean;
  include?: string[];
}): Promise<unknown> {
  const key = getXaiApiKey();
  if (!key) throw new Error("XAI_API_KEY missing");
  const body: Record<string, unknown> = {
    model: args.model || "grok-4.6",
    input: args.input,
  };
  if (args.previous_response_id) body.previous_response_id = args.previous_response_id;
  if (args.store === false) body.store = false;
  if (args.include) body.include = args.include;
  const { status, json } = await jsonFetch(`${XAI_BASE}/responses`, key, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (status >= 400) throw new Error(`xAI responses failed (${status}): ${JSON.stringify(json).slice(0, 400)}`);
  return json;
}

export async function xaiImageGenerate(args: {
  model?: string;
  prompt: string;
  n?: number;
  aspect_ratio?: string;
  resolution?: string;
  quality?: string;
  response_format?: string;
}): Promise<unknown> {
  const key = getXaiApiKey();
  if (!key) throw new Error("XAI_API_KEY missing");
  const body: Record<string, unknown> = {
    model: args.model || "grok-imagine-image-2.0",
    prompt: args.prompt,
  };
  if (args.n != null) body.n = args.n;
  if (args.aspect_ratio) body.aspect_ratio = args.aspect_ratio;
  if (args.resolution) body.resolution = args.resolution;
  if (args.quality) body.quality = args.quality;
  if (args.response_format) body.response_format = args.response_format;
  const { status, json } = await jsonFetch(`${XAI_BASE}/images/generations`, key, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (status >= 400) throw new Error(`xAI image failed (${status})`);
  return json;
}

export function describeModelProviders(): Record<string, unknown> {
  return {
    openrouter: { configured: !!getOpenRouterApiKey(), base: OPENROUTER_BASE },
    redpill: {
      configured: !!getRedpillApiKey(),
      base: REDPILL_BASE,
      tee_required: redpillTeeRequired(),
      slots: getRedpillModels(),
    },
    xai: { configured: !!getXaiApiKey(), base: XAI_BASE },
    pipedream_webhook: env("PIPEDREAM_WEBHOOK_URL") || env("PIPEDREAM_URL") || "https://x402.life/hook/pipe",
  };
}
