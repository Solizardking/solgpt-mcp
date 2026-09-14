#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadLocalEnv } from "./config.ts";
import { createMcpHttpServer } from "./http.ts";
import { createPumpFunMcpServer, listPumpFunMcpToolNames } from "./server.ts";

async function main(): Promise<void> {
  loadLocalEnv();
  const httpMode = process.argv.includes("--http");
  if (process.argv.includes("--tools")) {
    process.stdout.write(`${listPumpFunMcpToolNames().join("\n")}\n`);
    return;
  }
  if (httpMode) {
    const port = Number(process.env.PORT ?? 8788);
    const host = process.env.HOST ?? "127.0.0.1";
    const http = createMcpHttpServer({ host, token: process.env.MCP_HTTP_AUTH_TOKEN });
    await new Promise<void>((resolve) => http.listen(port, host, resolve));
    console.error(`Pump.fun MCP Streamable HTTP on http://${host}:${port}/mcp`);
    return;
  }
  const server = createPumpFunMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Pump.fun MCP server running on stdio");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
