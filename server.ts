import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  BUYBACK_FEE_RECIPIENTS,
  MAYHEM_FEE_RECIPIENTS,
  MAYHEM_PROGRAM_ID,
  NORMAL_FEE_RECIPIENTS,
  PUMP_AMM_PROGRAM_ID,
  PUMP_FEE_PROGRAM_ID,
  PUMP_PROGRAM_ID,
  SERVER_NAME,
  SERVER_VERSION,
} from "./constants.ts";
import { quoteFromCurve } from "./bonding-curve.ts";
import {
  instructionDocName,
  listIdlSummaries,
  listPumpDocs,
  readDoc,
  requiredDocPaths,
  searchDocs,
} from "./catalog.ts";
import { buyToken, formatBuyResult } from "./buy-token.ts";
import { collectCreatorFee, setSharingConfig } from "./collect-fees.ts";
import {
  COMPOSIO_SESSIONS_VIA_MCP_DOC,
  composioSessionCreateArgs,
  createComposioSessionMcp,
  fetchComposioDocsIndex,
} from "./composio.ts";
import { createToken, formatCreateTokenResult } from "./create-token.ts";
import { decodeBondingCurve } from "./decode.ts";
import {
  buildDflowOrderUrl,
  fetchDflowDocsIndex,
  getDflowOrder,
  getDflowPriorityFees,
} from "./dflow.ts";
import {
  bondingCurveFeeTier,
  FEE_TIERS,
  pumpSwapFeeTier,
  serializeFeeTier,
  totalFeeBps,
} from "./fees.ts";
import { formatAccountBalance, getAccountBalance } from "./get-token-balance.ts";
import { formatTokenInfo, getTokenInfo } from "./get-token-info.ts";
import { formatListAccountsResult, listAccounts } from "./list-accounts.ts";
import { bondingCurvePda } from "./pda.ts";
import { getAccountBase64 } from "./rpc.ts";
import { sellToken, formatSellResult } from "./sell-token.ts";
import {
  classifyLogs,
  dflowPriorityFeesStreamUrl,
  logsSubscribeMessage,
  parseDflowPriorityFees,
  pollStreamEvents,
  pushStreamEvent,
} from "./stream.ts";
import { guardedArgs, mcpError, mcpText } from "./utils.ts";
import { DFLOW_TRADE_API } from "./constants.ts";
import { dflowApiBase } from "./dflow.ts";
import {
  createOwsWallet,
  listOwsWallets,
  signOwsMessage,
  signOwsTx,
  solanaAccount,
} from "./ows.ts";
import { describeRpcConfig, getWsUrl, redactUrl } from "./config.ts";
import { getBirdeyePrice, getBirdeyeToken } from "./birdeye.ts";
import {
  buildJupiterSwap,
  fetchJupiterDocsIndex,
  getJupiterPrice,
  getJupiterQuote,
  searchJupiterTokens,
} from "./jupiter.ts";
import {
  getTrackerPrice,
  getTrackerToken,
  getTrackerTrending,
} from "./solanatracker.ts";

export const PUMPFUN_MCP_TOOLS = [
  "get-token-info",
  "get-account-balance",
  "list-accounts",
  "create-token",
  "buy-token",
  "sell-token",
  "quote-buy",
  "quote-sell",
  "inspect-fees",
  "collect-creator-fee",
  "set-sharing-config",
  "get-fee-recipients",
  "get-fee-tiers",
  "get-program-ids",
  "search-docs",
  "get-instruction",
  "get-idl",
  "parse-program-logs",
  "stream-status",
  "dflow-docs-index",
  "dflow-priority-fees",
  "dflow-order",
  "dflow-priority-fees-stream-url",
  "composio-session-mcp",
  "composio-docs",
  "ows-wallet-list",
  "ows-wallet-create",
  "ows-sign-message",
  "ows-sign-tx",
  "get-rpc-config",
  "tracker-price",
  "tracker-token",
  "tracker-trending",
  "birdeye-price",
  "birdeye-token",
  "jupiter-docs-index",
  "jupiter-price",
  "jupiter-quote",
  "jupiter-swap",
  "jupiter-token",
] as const;

export function listPumpFunMcpToolNames(): string[] {
  return [...PUMPFUN_MCP_TOOLS];
}

export function createPumpFunMcpServer(options: { holder?: boolean } = {}): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  for (const doc of listPumpDocs()) {
    server.registerResource(
      `doc-${doc.name}`,
      doc.uri,
      { title: doc.title, mimeType: doc.mimeType },
      async () => {
        const body = readDoc(doc.relativePath);
        if (body.blob) {
          return {
            contents: [
              {
                uri: doc.uri,
                mimeType: body.mimeType,
                blob: body.blob.toString("base64"),
              },
            ],
          };
        }
        return {
          contents: [
            { uri: doc.uri, mimeType: body.mimeType, text: body.text ?? "" },
          ],
        };
      },
    );
  }

  server.registerResource(
    "composio-sessions-via-mcp",
    "composio://sessions-via-mcp",
    { title: "Composio sessions via MCP", mimeType: "text/markdown" },
    async () => ({
      contents: [
        {
          uri: "composio://sessions-via-mcp",
          mimeType: "text/markdown",
          text: COMPOSIO_SESSIONS_VIA_MCP_DOC,
        },
      ],
    }),
  );

  server.registerResource(
    "solana-config",
    "solana://config",
    { title: "Solana RPC and data providers", mimeType: "application/json" },
    async () => ({
      contents: [
        {
          uri: "solana://config",
          mimeType: "application/json",
          text: JSON.stringify(describeRpcConfig(), null, 2),
        },
      ],
    }),
  );

  server.registerPrompt(
    "create-token",
    {
      title: "Create a pump.fun coin",
      description: "Collect public metadata and build an unsigned create ticket",
      argsSchema: {
        name: z.string(),
        symbol: z.string(),
      },
    },
    ({ name, symbol }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `Prepare an unsigned pump.fun create_v2 ticket for ${name} (${symbol}). Need user pubkey, metadata URI, and solLamports as an integer. Never ask for a private key.`,
          },
        },
      ],
    }),
  );

  server.registerTool(
    "get-token-info",
    {
      description:
        "Read Pump.fun bonding-curve state, metadata, graduation, and indicative quotes for a mint.",
      inputSchema: { tokenAddress: z.string() },
    },
    async (args) => {
      try {
        const { tokenAddress } = guardedArgs(args);
        const info = await getTokenInfo(tokenAddress);
        return mcpText({ formatted: formatTokenInfo(info), ...info });
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "get-account-balance",
    {
      description:
        "SOL and optional SPL balances for a public wallet address. Does not load private keys.",
      inputSchema: {
        address: z.string().optional(),
        accountName: z.string().optional(),
        tokenAddress: z.string().optional(),
      },
    },
    async (args) => {
      try {
        const result = await getAccountBalance(guardedArgs(args));
        return mcpText({ formatted: formatAccountBalance(result), ...result });
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  if (!options.holder) {
  server.registerTool(
    "list-accounts",
    {
      description:
        "List named public wallets. Secret key bytes are never returned.",
      inputSchema: {},
    },
    async () => {
      try {
        const result = listAccounts();
        return mcpText({
          formatted: formatListAccountsResult(result),
          ...result,
        });
      } catch (error) {
        return mcpError(error);
      }
    },
  );
  }

  server.registerTool(
    "create-token",
    {
      description:
        "Prepare an UNSIGNED pump.fun create_v2 + initial-buy ticket via fun-block. Never executed.",
      inputSchema: {
        user: z.string(),
        name: z.string(),
        symbol: z.string(),
        uri: z.string(),
        solLamports: z.string(),
        mayhemMode: z.boolean().optional(),
        cashback: z.boolean().optional(),
        creator: z.string().optional(),
      },
    },
    async (args) => {
      try {
        const result = await createToken(guardedArgs(args));
        return mcpText({
          formatted: formatCreateTokenResult(result),
          ...result,
        });
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "buy-token",
    {
      description:
        "Prepare an UNSIGNED pump.fun buy (SOL → mint). amount is lamports as an integer string.",
      inputSchema: {
        user: z.string(),
        tokenAddress: z.string(),
        amount: z.string(),
        slippagePct: z.number().optional(),
      },
    },
    async (args) => {
      try {
        const result = await buyToken(guardedArgs(args));
        return mcpText({ formatted: formatBuyResult(result), ...result });
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "sell-token",
    {
      description:
        "Prepare an UNSIGNED pump.fun sell (mint → SOL). amount is base units as an integer string.",
      inputSchema: {
        user: z.string(),
        tokenAddress: z.string(),
        amount: z.string(),
        slippagePct: z.number().optional(),
      },
    },
    async (args) => {
      try {
        const result = await sellToken(guardedArgs(args));
        return mcpText({ formatted: formatSellResult(result), ...result });
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "quote-buy",
    {
      description:
        "Bonding-curve buy quote from on-chain reserves. amount is quote lamports.",
      inputSchema: {
        tokenAddress: z.string(),
        amount: z.string(),
      },
    },
    async (args) => {
      try {
        const { tokenAddress, amount } = guardedArgs(args);
        const info = await getTokenInfo(tokenAddress);
        if (!info.bondingCurve) throw new Error("no bonding curve");
        const account = await getAccountBase64(info.bondingCurvePda);
        if (!account) throw new Error("bonding curve account missing");
        const curve = decodeBondingCurve(account.data);
        const quote = quoteFromCurve(
          curve,
          "buy",
          BigInt(amount),
          totalFeeBps(bondingCurveFeeTier()),
        );
        return mcpText({ mint: info.tokenAddress, ...quote, coinState: info.coinState });
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "quote-sell",
    {
      description:
        "Bonding-curve sell quote from on-chain reserves. amount is base token units.",
      inputSchema: {
        tokenAddress: z.string(),
        amount: z.string(),
      },
    },
    async (args) => {
      try {
        const { tokenAddress, amount } = guardedArgs(args);
        const info = await getTokenInfo(tokenAddress);
        if (!info.bondingCurve) throw new Error("no bonding curve");
        const account = await getAccountBase64(info.bondingCurvePda);
        if (!account) throw new Error("bonding curve account missing");
        const curve = decodeBondingCurve(account.data);
        const quote = quoteFromCurve(
          curve,
          "sell",
          BigInt(amount),
          totalFeeBps(bondingCurveFeeTier()),
        );
        return mcpText({ mint: info.tokenAddress, ...quote, coinState: info.coinState });
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "inspect-fees",
    {
      description: "Bonding vs AMM vs migrating fee state for a mint.",
      inputSchema: { mint: z.string() },
    },
    async (args) => {
      try {
        const info = await getTokenInfo(guardedArgs(args).mint);
        return mcpText({
          mint: info.tokenAddress,
          coinState: info.coinState,
          complete: info.complete,
          pumpSwapPool: info.pumpSwapPool,
          creator: info.bondingCurve?.creator ?? info.metadata?.creator,
          cashback: info.bondingCurve?.isCashbackCoin ?? false,
          mayhem: info.bondingCurve?.isMayhemMode ?? false,
        });
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "collect-creator-fee",
    {
      description:
        "Prepare an UNSIGNED collect-fees ticket for a mint/user. Never executed.",
      inputSchema: { mint: z.string(), user: z.string() },
    },
    async (args) => {
      try {
        return mcpText(await collectCreatorFee(guardedArgs(args)));
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "set-sharing-config",
    {
      description:
        "Prepare an UNSIGNED sharing-config ticket. Shareholder bps must total 10000.",
      inputSchema: {
        mint: z.string(),
        user: z.string(),
        shareholders: z.array(
          z.object({ address: z.string(), bps: z.number() }),
        ),
        mode: z.enum(["create", "update"]).optional(),
      },
    },
    async (args) => {
      try {
        return mcpText(await setSharingConfig(guardedArgs(args)));
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "get-fee-recipients",
    {
      description: "Normal, mayhem, and buyback fee recipient lists from FEE_RECIPIENTS.md.",
      inputSchema: {},
    },
    async () =>
      mcpText({
        normal: NORMAL_FEE_RECIPIENTS,
        mayhem: MAYHEM_FEE_RECIPIENTS,
        buyback: BUYBACK_FEE_RECIPIENTS,
      }),
  );

  server.registerTool(
    "get-fee-tiers",
    {
      description:
        "Bonding-curve and PumpSwap market-cap fee tiers from docs/fees.png.",
      inputSchema: {
        quoteReservesLamports: z.string().optional(),
        bonding: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        const { quoteReservesLamports, bonding } = guardedArgs(args);
        if (bonding) {
          return mcpText(serializeFeeTier(bondingCurveFeeTier()));
        }
        if (quoteReservesLamports) {
          return mcpText(
            serializeFeeTier(pumpSwapFeeTier(BigInt(quoteReservesLamports))),
          );
        }
        return mcpText(FEE_TIERS.map(serializeFeeTier));
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "get-program-ids",
    {
      description: "Pump, PumpAMM, PumpFees, Mayhem program IDs and PDAs.",
      inputSchema: { mint: z.string().optional() },
    },
    async (args) => {
      const { mint } = guardedArgs(args);
      return mcpText({
        pump: PUMP_PROGRAM_ID,
        pumpAmm: PUMP_AMM_PROGRAM_ID,
        pumpFees: PUMP_FEE_PROGRAM_ID,
        mayhem: MAYHEM_PROGRAM_ID,
        bondingCurve: mint ? bondingCurvePda(mint) : undefined,
        requiredDocs: requiredDocPaths(),
      });
    },
  );

  server.registerTool(
    "search-docs",
    {
      description: "Search local pump-public-docs (docs/).",
      inputSchema: { query: z.string(), limit: z.number().optional() },
    },
    async (args) => {
      try {
        const { query, limit } = guardedArgs(args);
        return mcpText(searchDocs(query, limit ?? 8));
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "get-instruction",
    {
      description: "Load a buy/sell/create/fee instruction doc.",
      inputSchema: { name: z.string() },
    },
    async (args) => {
      try {
        const rel = instructionDocName(guardedArgs(args).name);
        const body = readDoc(rel);
        return mcpText({ path: rel, text: body.text });
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "get-idl",
    {
      description: "Summarize pump / pump_amm / pump_fees IDL instructions, accounts, events.",
      inputSchema: {},
    },
    async () => mcpText(listIdlSummaries()),
  );

  server.registerTool(
    "parse-program-logs",
    {
      description:
        "Decode Pump TradeEvent / PumpSwap BuyEvent / SellEvent lines from transaction logs.",
      inputSchema: { logs: z.array(z.string()) },
    },
    async (args) => {
      try {
        return mcpText(classifyLogs(guardedArgs(args).logs));
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "stream-status",
    {
      description:
        "Pump + PumpAMM logsSubscribe request, DFlow priority-fee stream URL, and recent buffered events.",
      inputSchema: { after: z.number().optional() },
    },
    async (args) => {
      const after = guardedArgs(args).after ?? 0;
      return mcpText({
        pumpLogsSubscribe: logsSubscribeMessage([PUMP_PROGRAM_ID]),
        pumpAmmLogsSubscribe: logsSubscribeMessage([PUMP_AMM_PROGRAM_ID]),
        solanaTrackerWss: redactUrl(getWsUrl()),
        dflowPriorityFeesStream: dflowPriorityFeesStreamUrl(dflowApiBase()),
        events: pollStreamEvents("default", after),
      });
    },
  );

  server.registerTool(
    "dflow-docs-index",
    {
      description: `Fetch https://pond.dflow.net/llms.txt before exploring DFlow pages.`,
      inputSchema: {},
    },
    async () => {
      try {
        return mcpText(await fetchDflowDocsIndex());
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "dflow-priority-fees",
    {
      description:
        "GET /priority-fees — medium/high/veryHigh micro-lamports per compute unit.",
      inputSchema: {},
    },
    async () => {
      try {
        return mcpText(await getDflowPriorityFees());
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "dflow-order",
    {
      description:
        "GET /order — quote, or unsigned swap tx when userPublicKey is set. amount is atomic units.",
      inputSchema: {
        inputMint: z.string(),
        outputMint: z.string(),
        amount: z.string(),
        userPublicKey: z.string().optional(),
        slippageBps: z.union([z.number(), z.literal("auto")]).optional(),
        prioritizationFeeLamports: z.union([z.string(), z.number()]).optional(),
        onlyDirectRoutes: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        const params = guardedArgs(args);
        const preview = buildDflowOrderUrl(params);
        const result = await getDflowOrder(params);
        return mcpText({ request: preview, ...result });
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "dflow-priority-fees-stream-url",
    {
      description: "WebSocket URL for DFlow GET /priority-fees/stream.",
      inputSchema: {},
    },
    async () =>
      mcpText({
        url: dflowPriorityFeesStreamUrl(dflowApiBase()),
        sample: parseDflowPriorityFees({
          mediumMicroLamports: 0,
          highMicroLamports: 0,
          veryHighMicroLamports: 0,
        }),
        tradeApi: DFLOW_TRADE_API,
      }),
  );

  if (!options.holder) {
  server.registerTool(
    "composio-session-mcp",
    {
      description:
        "Build or create a Composio session with mcp:true (v3). Returns session.mcp url shape.",
      inputSchema: {
        userId: z.string(),
        toolkits: z.array(z.string()).optional(),
        directTools: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        const input = guardedArgs(args);
        const planned = composioSessionCreateArgs({ ...input, mcp: true });
        const live = await createComposioSessionMcp({ ...input, mcp: true });
        return mcpText({ planned, ...live });
      } catch (error) {
        return mcpError(error);
      }
    },
  );
  }

  if (!options.holder) {
  server.registerTool(
    "ows-wallet-list",
    {
      description:
        "List Open Wallet Standard vault wallets and public addresses. Never returns keys or mnemonics.",
      inputSchema: {},
    },
    async () => {
      try {
        const wallets = await listOwsWallets();
        return mcpText({
          wallets,
          solana: wallets.map((w) => ({
            name: w.name,
            solana: solanaAccount(w)?.address ?? null,
          })),
        });
      } catch (error) {
        return mcpError(error);
      }
    },
  );
  }

  if (!options.holder) {
  server.registerTool(
    "ows-wallet-create",
    {
      description:
        "Create an OWS universal wallet (or return it if the name exists). Mnemonic is never shown.",
      inputSchema: { name: z.string() },
    },
    async (args) => {
      try {
        return mcpText(await createOwsWallet(guardedArgs(args).name));
      } catch (error) {
        return mcpError(error);
      }
    },
  );
  }

  if (!options.holder) {
  server.registerTool(
    "ows-sign-message",
    {
      description:
        "Sign a message with an OWS wallet. chain: ethereum, solana, bitcoin, or EVM id 8453.",
      inputSchema: {
        wallet: z.string(),
        chain: z.string(),
        message: z.string(),
      },
    },
    async (args) => {
      try {
        return mcpText(await signOwsMessage(guardedArgs(args)));
      } catch (error) {
        return mcpError(error);
      }
    },
  );
  }

  if (!options.holder) {
  server.registerTool(
    "ows-sign-tx",
    {
      description:
        "Sign an unsigned tx (hex or Solana base64) with OWS. send=true broadcasts. Keys never leave the vault.",
      inputSchema: {
        wallet: z.string(),
        chain: z.string(),
        tx: z.string(),
        send: z.boolean().optional(),
        rpcUrl: z.string().optional(),
      },
    },
    async (args) => {
      try {
        return mcpText(await signOwsTx(guardedArgs(args)));
      } catch (error) {
        return mcpError(error);
      }
    },
  );
  }

  server.registerTool(
    "get-rpc-config",
    {
      description:
        "Redacted Solana RPC / WSS / data-provider snapshot. Solana Tracker is primary; keys are never returned.",
      inputSchema: {},
    },
    async () => mcpText(describeRpcConfig()),
  );

  server.registerTool(
    "tracker-price",
    {
      description:
        "Solana Tracker Data API price for a mint (primary market-data source).",
      inputSchema: { token: z.string() },
    },
    async (args) => {
      try {
        return mcpText(await getTrackerPrice(guardedArgs(args).token));
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "tracker-token",
    {
      description: "Solana Tracker token overview for a mint.",
      inputSchema: { token: z.string() },
    },
    async (args) => {
      try {
        return mcpText(await getTrackerToken(guardedArgs(args).token));
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "tracker-trending",
    {
      description:
        "Solana Tracker trending tokens. timeframe: 5m, 15m, 30m, 1h, 6h, 12h, 24h.",
      inputSchema: { timeframe: z.string().optional() },
    },
    async (args) => {
      try {
        return mcpText(await getTrackerTrending(guardedArgs(args).timeframe ?? "1h"));
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "birdeye-price",
    {
      description: "Birdeye spot price and liquidity for a mint (secondary to Tracker).",
      inputSchema: { token: z.string() },
    },
    async (args) => {
      try {
        return mcpText(await getBirdeyePrice(guardedArgs(args).token));
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "birdeye-token",
    {
      description: "Birdeye token overview for a mint.",
      inputSchema: { token: z.string() },
    },
    async (args) => {
      try {
        return mcpText(await getBirdeyeToken(guardedArgs(args).token));
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "jupiter-docs-index",
    {
      description:
        "Fetch https://developers.jup.ag/docs/llms.txt before exploring Jupiter Swap v1 / Price v3 / Tokens v2.",
      inputSchema: {},
    },
    async () => {
      try {
        return mcpText(await fetchJupiterDocsIndex());
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "jupiter-price",
    {
      description: "Jupiter Price API v3 USD price for a mint.",
      inputSchema: { token: z.string() },
    },
    async (args) => {
      try {
        return mcpText(await getJupiterPrice(guardedArgs(args).token));
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "jupiter-quote",
    {
      description:
        "Unsigned Jupiter Meta-Aggregator /swap/v2/order quote (x-api-key). amount is atomic units. Never signs or submits.",
      inputSchema: {
        inputMint: z.string(),
        outputMint: z.string(),
        amount: z.string(),
        slippageBps: z.number().optional(),
      },
    },
    async (args) => {
      try {
        return mcpText(await getJupiterQuote(guardedArgs(args)));
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "jupiter-swap",
    {
      description:
        "Build an UNSIGNED Jupiter Swap v2 /order ticket for userPublicKey. Never signed or submitted — wallet signs, then /execute.",
      inputSchema: {
        inputMint: z.string(),
        outputMint: z.string(),
        amount: z.string(),
        userPublicKey: z.string(),
        slippageBps: z.number().optional(),
      },
    },
    async (args) => {
      try {
        return mcpText(await buildJupiterSwap(guardedArgs(args)));
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "jupiter-token",
    {
      description: "Search Jupiter token registry (JUPITER_TOKENS_BASE).",
      inputSchema: { query: z.string() },
    },
    async (args) => {
      try {
        return mcpText(await searchJupiterTokens(guardedArgs(args).query));
      } catch (error) {
        return mcpError(error);
      }
    },
  );

  server.registerTool(
    "composio-docs",
    {
      description: "Fetch https://docs.composio.dev/llms.txt and sessions-via-mcp notes.",
      inputSchema: {},
    },
    async () => {
      try {
        const index = await fetchComposioDocsIndex();
        return mcpText({
          sessions: COMPOSIO_SESSIONS_VIA_MCP_DOC,
          index,
        });
      } catch (error) {
        return mcpError({
          sessions: COMPOSIO_SESSIONS_VIA_MCP_DOC,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    },
  );

  return server;
}

export { pushStreamEvent };
