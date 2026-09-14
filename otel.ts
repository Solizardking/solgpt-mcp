/**
 * Lightweight OTLP/HTTP JSON exporter. No SDK — POSTs spans to the
 * colocated solgpt-otel collector when OTEL_EXPORTER_OTLP_ENDPOINT is set.
 */
export const DEFAULT_OTLP_HTTP = "http://solgpt-otel.internal:4318";
export const DEFAULT_OTEL_SERVICE_NAME = "mcp-server";

export function resolveOtlpHttpEndpoint(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw = env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim();
  return raw || null;
}

export function otlpTracesUrl(endpoint: string): string {
  const base = endpoint.trim().replace(/\/$/, "");
  return base.endsWith("/v1/traces") ? base : `${base}/v1/traces`;
}

function hexId(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildOtlpSpanPayload(opts: {
  serviceName: string;
  name: string;
  attributes?: Record<string, string | number | boolean>;
  startTimeUnixNano?: string;
  endTimeUnixNano?: string;
}): Record<string, unknown> {
  const start = opts.startTimeUnixNano ?? `${BigInt(Date.now()) * 1_000_000n}`;
  const end = opts.endTimeUnixNano ?? start;
  const attributes = Object.entries(opts.attributes ?? {}).map(([key, value]) => {
    if (typeof value === "number") {
      return Number.isInteger(value)
        ? { key, value: { intValue: String(value) } }
        : { key, value: { doubleValue: value } };
    }
    if (typeof value === "boolean") return { key, value: { boolValue: value } };
    return { key, value: { stringValue: String(value) } };
  });
  return {
    resourceSpans: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: opts.serviceName } },
          ],
        },
        scopeSpans: [
          {
            scope: { name: "solgpt.mcp-server" },
            spans: [
              {
                traceId: hexId(16),
                spanId: hexId(8),
                name: opts.name,
                kind: 1,
                startTimeUnixNano: start,
                endTimeUnixNano: end,
                attributes,
              },
            ],
          },
        ],
      },
    ],
  };
}

export async function emitSpan(
  name: string,
  attributes: Record<string, string | number | boolean> = {},
  opts?: { fetchImpl?: typeof fetch; env?: Record<string, string | undefined> },
): Promise<boolean> {
  const env = opts?.env ?? process.env;
  const endpoint = resolveOtlpHttpEndpoint(env);
  if (!endpoint) return false;
  const url = otlpTracesUrl(endpoint);
  const serviceName =
    env.OTEL_SERVICE_NAME?.trim() || DEFAULT_OTEL_SERVICE_NAME;
  const payload = buildOtlpSpanPayload({ serviceName, name, attributes });
  const fetchImpl = opts?.fetchImpl ?? fetch;
  try {
    const res = await fetchImpl(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
