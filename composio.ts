import {
  CLAWD_WS_ORIGIN,
  COMPOSIO_DOCS_INDEX,
  COMPOSIO_REST_V31,
  COMPOSIO_WEBHOOK_URL,
  CUSTOM_CLAWD_WS_TOOLKIT_SLUG,
  CUSTOM_SOLGPT_TOOLKIT_SLUG,
} from "./constants.ts";
import { assertNoSecretFields } from "./secrets.ts";

export const COMPOSIO_SESSION_PRESET_DIRECT_TOOLS = "direct_tools";

export type ComposioSessionMcpInput = {
  userId: string;
  toolkits?: string[];
  tools?: Record<string, { enable: string[] }>;
  directTools?: boolean;
  mcp?: true;
  sandbox?: { enable: boolean };
};

function trim(value: string | undefined): string {
  return value?.trim() || "";
}

export function resolveComposioWebhookUrl(): string {
  const raw = trim(process.env.COMPOSIO_URL) || COMPOSIO_WEBHOOK_URL;
  try {
    const u = new URL(raw);
    if (!u.pathname || u.pathname === "/") {
      return `${u.origin}/api/composio/triggers`;
    }
    return `${u.origin}${u.pathname}`.replace(/\/$/, "");
  } catch {
    return COMPOSIO_WEBHOOK_URL;
  }
}

export function resolveClawdWsOrigin(): string {
  const raw =
    trim(process.env.COMPOSIO_CLAWD_WS_URL) ||
    trim(process.env.NEXT_PUBLIC_CLAWD_WS_HTTP_URL) ||
    trim(process.env.NEXT_PUBLIC_PUMP_WS_HTTP_URL) ||
    CLAWD_WS_ORIGIN;
  try {
    return new URL(raw).origin;
  } catch {
    return CLAWD_WS_ORIGIN;
  }
}

export function defaultSessionToolkits(): string[] {
  const raw = trim(process.env.COMPOSIO_SESSION_TOOLKITS);
  if (raw) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [CUSTOM_SOLGPT_TOOLKIT_SLUG, CUSTOM_CLAWD_WS_TOOLKIT_SLUG];
}

export function composioSessionCreateArgs(input: ComposioSessionMcpInput) {
  assertNoSecretFields(input);
  const userId = input.userId.trim();
  if (!userId) throw new Error("userId is required");
  const toolkits = input.toolkits?.length ? input.toolkits : defaultSessionToolkits();
  const options: Record<string, unknown> = {
    mcp: true,
    sandbox: input.sandbox ?? { enable: false },
  };
  if (toolkits.length) options.toolkits = toolkits;
  if (input.tools) options.tools = input.tools;
  if (input.directTools) options.sessionPreset = COMPOSIO_SESSION_PRESET_DIRECT_TOOLS;
  return {
    userId,
    options,
    attached: { clawdWs: resolveClawdWsOrigin() },
    webhookUrl: resolveComposioWebhookUrl(),
  };
}

export function parseComposioSessionMcp(session: {
  mcp?: { url?: string; headers?: Record<string, string> };
  sessionId?: string;
}): { url: string; headers: Record<string, string>; sessionId?: string } {
  const url = session.mcp?.url?.trim();
  if (!url) {
    throw new Error("session.mcp.url missing — create with { mcp: true }");
  }
  return {
    url,
    headers: session.mcp?.headers ?? {},
    sessionId: session.sessionId,
  };
}

export async function createComposioSessionMcp(
  input: ComposioSessionMcpInput,
): Promise<Record<string, unknown>> {
  const planned = composioSessionCreateArgs(input);
  const apiKey = process.env.COMPOSIO_API_KEY?.trim();
  if (!apiKey) {
    return {
      ready: false,
      userId: planned.userId,
      options: planned.options,
      attached: planned.attached,
      webhookUrl: planned.webhookUrl,
      rest: COMPOSIO_REST_V31,
      note: "Set COMPOSIO_API_KEY to create a live session. Until then this is the v3 session shape: composio.create(userId, { mcp: true }).",
    };
  }
  const { Composio } = await import("@composio/core");
  const composio = new Composio({ apiKey });
  const session = await composio.create(planned.userId, planned.options);
  const mcp = parseComposioSessionMcp(session);
  return {
    ready: true,
    userId: planned.userId,
    sessionId: mcp.sessionId ?? session.sessionId,
    mcpUrl: mcp.url,
    mcpHeadersPresent: Object.keys(mcp.headers).length > 0,
    attached: planned.attached,
    webhookUrl: planned.webhookUrl,
    note: "Pass mcp.url + mcp.headers to any MCP client. Do not log header values.",
  };
}

export async function fetchComposioDocsIndex(
  fetchImpl: typeof fetch = fetch,
): Promise<{ url: string; text: string }> {
  const res = await fetchImpl(COMPOSIO_DOCS_INDEX, {
    headers: { accept: "text/plain, text/markdown" },
    signal: AbortSignal.timeout(15_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${COMPOSIO_DOCS_INDEX} ${res.status}`);
  return { url: COMPOSIO_DOCS_INDEX, text };
}

export const COMPOSIO_SESSIONS_VIA_MCP_DOC = `# Using sessions via MCP

Opt into MCP with \`mcp: true\` when creating a Composio session. Read the
hosted endpoint off \`session.mcp.url\` and \`session.mcp.headers\`.

TypeScript:

\`\`\`ts
import { Composio, SessionPreset } from "@composio/core";

const composio = new Composio();
const session = await composio.create("user_123", {
  mcp: true,
  sessionPreset: SessionPreset.DIRECT_TOOLS,
  toolkits: ["CUSTOM_SOLGPT", "CUSTOM_CLAWD_WS"],
  sandbox: { enable: false },
});
const mcpUrl = session.mcp.url;
const mcpHeaders = session.mcp.headers;
\`\`\`

Resume with \`composio.use(sessionId, { mcp: true })\`.

REST API version for new code is v3.1 at ${COMPOSIO_REST_V31}.
Terminology: entity ID → user_id; actions → tools; apps → toolkits;
integration → auth config; connection → connected account.
`;
