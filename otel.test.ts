import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildOtlpSpanPayload,
  emitSpan,
  otlpTracesUrl,
  resolveOtlpHttpEndpoint,
} from "./otel.ts";

describe("mcp-server OTLP JSON exporter", () => {
  afterEach(() => {
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.OTEL_SERVICE_NAME;
  });

  it("builds collector traces URL from the Fly 6PN endpoint", () => {
    expect(otlpTracesUrl("http://solgpt-otel.internal:4318")).toBe(
      "http://solgpt-otel.internal:4318/v1/traces",
    );
    expect(resolveOtlpHttpEndpoint({})).toBeNull();
    expect(
      resolveOtlpHttpEndpoint({ OTEL_EXPORTER_OTLP_ENDPOINT: "http://solgpt-otel.internal:4318" }),
    ).toBe("http://solgpt-otel.internal:4318");
  });

  it("POSTs a named health span to the shipped OTLP path", async () => {
    const seen: Array<{ url: string; body: string }> = [];
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        seen.push({
          url: `http://${req.headers.host}${req.url}`,
          body: Buffer.concat(chunks).toString("utf8"),
        });
        res.writeHead(200);
        res.end();
      });
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("missing listener");
    const endpoint = `http://127.0.0.1:${addr.port}`;
    try {
      const ok = await emitSpan(
        "mcp.health",
        { "http.route": "/health" },
        {
          env: {
            OTEL_EXPORTER_OTLP_ENDPOINT: endpoint,
            OTEL_SERVICE_NAME: "mcp-server",
          },
        },
      );
      expect(ok).toBe(true);
      expect(seen).toHaveLength(1);
      expect(seen[0].url).toBe(`${endpoint}/v1/traces`);
      const payload = JSON.parse(seen[0].body)
      expect(payload.resourceSpans[0].resource.attributes[0].value.stringValue).toBe("mcp-server")
      expect(payload.resourceSpans[0].scopeSpans[0].spans[0].name).toBe("mcp.health")
      const built = buildOtlpSpanPayload({
        serviceName: "mcp-server",
        name: "mcp.health",
      }) as { resourceSpans: unknown[] }
      expect(built.resourceSpans).toHaveLength(1)
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      );
    }
  });
});
