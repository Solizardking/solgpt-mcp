# SOLGPT WebMCP

The root layout and public `/agent/*.html` pages load `/.webmcp/bridge.js`.
The bridge first loads the external classic script `/.webmcp/origin-trial.js`,
then detects `document.modelContext` (supplied W3C draft) or
`navigator.modelContext` (Chrome preview). Unsupported browsers are a no-op.

The supplied public Google origin trial token is the default. `WEBMCP_TOKEN`
can override it at runtime; whitespace is removed and an empty value disables
trial enrollment. This is public browser enrollment data, never MCP authentication.
The supplied token covers `https://solgpt.trade:443` and subdomains, expires
2026-11-17 00:00 UTC, and is marked third-party. It is therefore inserted by
an external script, as required by Google's documentation:
https://developer.chrome.com/docs/web-platform/third-party-origin-trials
It does not enroll solgpt.us, Fly domains, or localhost. Renew the token before
expiry. Browser acceptance of the signature must be checked on the deployed
matching origin in Chrome DevTools Application > Frames > Origin Trials.

Public tools: health, list_pages, get_page, bots_roster, bots_tape, clawdbot_info.
React pages additionally register open_bots and list_desk_pages. Image tools
inventory images but report provenance as unknown; they do not validate C2PA.
Only the same-origin `/mcp` endpoint is bridged. Protected `/api/mcp` remains
separate, and browser enrollment grants no wallet, trading or holder privileges.

## Verification

Run `npm run dev`, then `node scripts/webmcp-browser-smoke.mjs` with local
Google Chrome installed. The smoke uses Chrome experimental flags, so it checks
native discovery/execution, not production origin trial acceptance.
Set `WEBMCP_BASE_URL` to test another origin.

In a supporting Chrome DevTools console:

```js
navigator.modelContextTesting.listTools();
await navigator.modelContextTesting.executeTool('health', '{}');
await navigator.modelContextTesting.executeTool('get_page', '{"id":"bots"}');
```

Reference inputs: `webmcp-main 2/` contains the W3C draft, including signal-based
registration cleanup. `WebMCP-main 3/README.md` explicitly identifies that project
as an earlier noncompliant proposal. Its localhost token/widget transport is
not the Google origin trial and is not installed into production.

## Custom Solana tools

React pages now register nine SOL-GPT tools in addition to the origin bridge.
The `/webmcp` console displays agent calls and offers a manual runner using the
same implementation. See [the custom eval suite](../webmcp-tools-main/webmcp-evals/examples/sol-gpt/README.md)
for the tool catalog and exact commands. Static `/agent/*.html` pages retain the
public origin bridge; the React custom tools live in the application.

Run `npm run test:webmcp` for validation, auth failures, amount conversion,
cancellation and schema parity. Run `npm run smoke:webmcp:solana` for native
Chrome execution, visible results and navigation. Google WebMCP Evals can run
the new `examples/sol-gpt` suites; `npm run webmcp:schema` refreshes their schema
from the actual runtime catalog. Model-scored evaluations require a configured
backend and are separate from the deterministic smoke tests.
