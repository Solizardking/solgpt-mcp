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
  /** Wait for toolkit OAuth (incl. Twitter/X) before returning the session. */
  waitForConnections?: boolean;
  /** Composio auth config / connection id (custom white-label). */
  authConfigId?: string;
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

export function resolveComposioWhiteLabelOrigins(): string[] {
  const raw = trim(process.env.COMPOSIO_WHITELABEL_ORIGINS);
  if (raw) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return ["https://solgpt.trade", "https://x402.life", "https://mcp.solgpt.trade"];
}

/** Custom auth config id (Composio Platform). Prefer env; never commit secrets. */
export function resolveComposioAuthConfigId(explicit?: string): string {
  return (
    trim(explicit) ||
    trim(process.env.COMPOSIO_AUTH_CONFIG_ID) ||
    trim(process.env.COMPOSIO_CONNECTED_ACCOUNT_ID) ||
    ""
  );
}

export function defaultSessionToolkits(): string[] {
  const raw = trim(process.env.COMPOSIO_SESSION_TOOLKITS);
  let list: string[];
  if (raw) {
    list = raw.split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    list = [CUSTOM_SOLGPT_TOOLKIT_SLUG, CUSTOM_CLAWD_WS_TOOLKIT_SLUG, "twitter"];
  }
  // Ensure Twitter/X is always available unless explicitly disabled.
  const disableTw = ["1", "true", "yes"].includes(
    trim(process.env.COMPOSIO_DISABLE_TWITTER).toLowerCase(),
  );
  if (!disableTw && !list.some((t) => /^(twitter|twitter_v2|x)$/i.test(t))) {
    list = [...list, "twitter"];
  }
  return list;
}

export function composioSessionCreateArgs(input: ComposioSessionMcpInput) {
  assertNoSecretFields(input);
  const userId = input.userId.trim();
  if (!userId) throw new Error("userId is required");
  const toolkits = input.toolkits?.length ? input.toolkits : defaultSessionToolkits();
  const wait =
    input.waitForConnections ??
    trim(process.env.COMPOSIO_WAIT_FOR_CONNECTIONS).toLowerCase() !== "false";
  const authConfigId = resolveComposioAuthConfigId(input.authConfigId);
  const options: Record<string, unknown> = {
    mcp: true,
    sandbox: input.sandbox ?? { enable: false },
    manageConnections: { waitForConnections: wait },
  };
  if (toolkits.length) options.toolkits = toolkits;
  if (input.tools) options.tools = input.tools;
  if (input.directTools) options.sessionPreset = COMPOSIO_SESSION_PRESET_DIRECT_TOOLS;
  if (authConfigId) options.authConfigId = authConfigId;
  return {
    userId,
    options,
    authConfigId: authConfigId || null,
    whiteLabelOrigins: resolveComposioWhiteLabelOrigins(),
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
      authConfigId: planned.authConfigId,
      whiteLabelOrigins: planned.whiteLabelOrigins,
      attached: planned.attached,
      webhookUrl: planned.webhookUrl,
      rest: COMPOSIO_REST_V31,
      note: "Set COMPOSIO_API_KEY to create a live session. Until then this is the v3 session shape: composio.create(userId, { mcp: true, manageConnections: { waitForConnections: true } }).",
    };
  }
  const { Composio } = await import("@composio/core");
  const composio = new Composio({ apiKey });
  // Optional: initiate connected account for custom auth config (Twitter/X etc.).
  let connection: Record<string, unknown> | null = null;
  const authConfigId = planned.authConfigId;
  if (authConfigId && typeof (composio as { connectedAccounts?: unknown }).connectedAccounts !== "undefined") {
    try {
      const accounts = (composio as {
        connectedAccounts: {
          initiate: (
            userId: string,
            authConfigId: string,
            opts?: Record<string, unknown>,
          ) => Promise<unknown>;
        };
      }).connectedAccounts;
      const initiated = await accounts.initiate(planned.userId, authConfigId, {
        allowMultiple: true,
      });
      const waitFn = (initiated as { waitForConnection?: (ms?: number) => Promise<unknown> })
        .waitForConnection;
      connection = {
        initiated: true,
        status: waitFn ? "waiting" : "started",
      };
      if (waitFn && planned.options.manageConnections) {
        const settled = await waitFn(120_000);
        connection = {
          initiated: true,
          status: "connected",
          id: (settled as { id?: string })?.id ?? null,
        };
      }
    } catch (error) {
      connection = {
        initiated: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
  const session = await composio.create(planned.userId, planned.options);
  const mcp = parseComposioSessionMcp(session);
  return {
    ready: true,
    userId: planned.userId,
    sessionId: mcp.sessionId ?? session.sessionId,
    mcpUrl: mcp.url,
    mcpHeadersPresent: Object.keys(mcp.headers).length > 0,
    authConfigId,
    connection,
    whiteLabelOrigins: planned.whiteLabelOrigins,
    attached: planned.attached,
    webhookUrl: planned.webhookUrl,
    note: "Pass mcp.url + mcp.headers to any MCP client. Do not log header values. Twitter/X is included in default toolkits unless COMPOSIO_DISABLE_TWITTER=true.",
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
const session = await composio.create("<user-id>", {
  mcp: true,
  manageConnections: { waitForConnections: true },
  sessionPreset: SessionPreset.DIRECT_TOOLS,
  toolkits: ["CUSTOM_SOLGPT", "CUSTOM_CLAWD_WS", "twitter"],
  sandbox: { enable: false },
});
// White-label redirects: solgpt.trade + x402.life (COMPOSIO_WHITELABEL_ORIGINS).
// Custom auth config: COMPOSIO_AUTH_CONFIG_ID (connectedAccounts.initiate).
const mcpUrl = session.mcp.url;
const mcpHeaders = session.mcp.headers;
\`\`\`

Resume with \`composio.use(sessionId, { mcp: true })\`.

REST API version for new code is v3.1 at ${COMPOSIO_REST_V31}.
Terminology: entity ID → user_id; actions → tools; apps → toolkits;
integration → auth config; connection → connected account.
`;
