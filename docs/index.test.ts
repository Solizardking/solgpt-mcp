/**
 * Drives the shipped mcp-server/docs/index.html replay — CLAWD identity
 * and the Claude-share conversation, including Skip / Restart.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it } from "vitest";

const ROOT = join(__dirname, "../..");
const PAGE = join(__dirname, "index.html");
const OLD_MCP_MINT = "2xh1LVN7yD1dBGfrGcKz4BCTvcgrEyjouoHp9Nq28FZB";
const CLAWD_MINT = readFileSync(
  join(ROOT, "src/lib/solgpt/clawd-gate.ts"),
  "utf8",
).match(/export const CLAWD_MINT = "([^"]+)"/)?.[1];
if (!CLAWD_MINT) throw new Error("CLAWD_MINT missing from clawd-gate.ts");

function readPage(): string {
  return readFileSync(PAGE, "utf8");
}

function extractInlineScript(html: string): string {
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)];
  const inline = blocks.map((m) => m[1] ?? "").find((s) => s.includes("conversation"));
  if (!inline) throw new Error("shipped page has no conversation script");
  return inline;
}

type FakeEl = {
  id: string;
  innerHTML: string;
  textContent: string;
  className: string;
  classList: { add: (c: string) => void; remove: (c: string) => void };
  style: Record<string, string>;
  children: FakeEl[];
  appendChild: (child: FakeEl) => FakeEl;
  addEventListener: () => void;
  getContext?: () => Record<string, unknown>;
  width?: number;
  height?: number;
  value?: string;
};

function fakeEl(id = ""): FakeEl {
  let html = "";
  const el = {
    id,
    get innerHTML() {
      return html;
    },
    set innerHTML(value: string) {
      html = value;
      if (value === "") el.children.length = 0;
    },
    textContent: "",
    className: "",
    classList: {
      add(c: string) {
        el.className = `${el.className} ${c}`.trim();
      },
      remove(c: string) {
        el.className = el.className
          .split(/\s+/)
          .filter((x) => x && x !== c)
          .join(" ");
      },
    },
    style: {} as Record<string, string>,
    children: [] as FakeEl[],
    appendChild(child: FakeEl) {
      el.children.push(child);
      html += child.innerHTML || child.textContent || "";
      return child;
    },
    addEventListener() {},
    getContext() {
      return {
        fillRect() {},
        fillText() {},
        fillStyle: "",
        font: "",
      };
    },
    width: 800,
    height: 600,
    value: "",
  } as FakeEl;
  return el;
}

function loadPageScript() {
  const html = readPage();
  const src = extractInlineScript(html);
  const els = new Map<string, FakeEl>();
  const get = (id: string) => {
    if (!els.has(id)) els.set(id, fakeEl(id));
    return els.get(id)!;
  };
  const windowObj: Record<string, unknown> = {
    __CLAWD_PAGE_NOBOOT: true,
    __CLAWD_REPLAY_DELAY: 0,
    addEventListener() {},
    Jupiter: undefined,
    innerWidth: 800,
    innerHeight: 600,
  };
  const documentObj = {
    getElementById: (id: string) => get(id),
    createElement: (tag: string) => fakeEl(tag),
    addEventListener() {},
    readyState: "complete",
  };
  const sandbox = createContext({
    window: windowObj,
    document: documentObj,
    navigator: { clipboard: { writeText: async () => {} } },
    console,
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval,
    Promise,
    Date,
    Math,
    JSON,
    String,
    Array,
    Object,
  });
  windowObj.document = documentObj;
  runInContext(src, sandbox);
  return { window: windowObj, get, html, sandbox };
}

describe("mcp-server/docs/index.html ($CLAWD landing)", () => {
  it("is CLAWD-branded with the shipped mint and no old MCP mint", () => {
    const html = readPage();
    expect(html).toMatch(/\$CLAWD/);
    expect(html).toMatch(/\bCLAWD\b/);
    expect(html).toContain(CLAWD_MINT);
    expect(html).toContain(`pump.fun/coin/${CLAWD_MINT}`);
    expect(html).toContain("initialOutputMint");
    expect(html).toContain(CLAWD_MINT);
    expect(html).not.toContain(OLD_MCP_MINT);
    expect(html).not.toMatch(/\$MCP/);
    expect(html).not.toMatch(/type=["']module["']/);
    expect(html).toMatch(/<script>/);
    expect(html).toContain("https://claude.ai/share/45f926fb-1680-44aa-bd05-06ec48bdf23e");
  });

  it("loads as a plain window script and installs replay/boot/command handlers", () => {
    const { window } = loadPageScript();
    expect(typeof window.skipToEnd).toBe("function");
    expect(typeof window.restartConversation).toBe("function");
    expect(typeof window.startConversation).toBe("function");
    expect(typeof window.playNextMessage).toBe("function");
    expect(typeof window.executeCommand).toBe("function");
    expect(typeof window.runBootSequence).toBe("function");
    expect(window.CLAWD_TOKEN_ADDRESS).toBe(CLAWD_MINT);
    expect(Array.isArray(window.conversation)).toBe(true);
  });

  it("animates the share user-turn order and paints CLAWD on create-token success", () => {
    const { window, get } = loadPageScript();
    const conversation = window.conversation as Array<{
      type: string;
      content?: string;
    }>;
    const users = conversation
      .filter((m) => m.type === "user")
      .map((m) => String(m.content ?? "").replace(/<[^>]+>/g, ""));

    expect(users[0]).toMatch(/get_account_balance/);
    expect(users[1]).toMatch(/fetch_price_chart/);
    expect(users[1]).toMatch(/7JofsgKgD3MerQDa7hEe4dfkY3c3nMnsThZzUuYyTFpE/);
    expect(users[2]).toMatch(/fetch_top_tokens/);
    expect(users[3]).toMatch(/create_token/);
    expect(users.some((u) => /https:\/\/www\./.test(u))).toBe(true);
    expect(users.some((u) => /nvidia-image-1743382334246\.jpg/.test(u))).toBe(
      true,
    );
    const topIdx = users
      .map((u, i) => (u.includes("fetch_top_tokens") ? i : -1))
      .filter((i) => i >= 0);
    expect(topIdx.length).toBeGreaterThanOrEqual(2);
    expect(users[users.length - 1]).toMatch(/fetch_price/);
    expect(users[users.length - 1]).toMatch(
      /FtUEW73K6vEYHfbkfpdBZfWpxgQar2HipGdbutEhpump/,
    );

    const success = conversation.filter(
      (m) =>
        (m.type === "result" || m.type === "success" || m.type === "claude") &&
        String(m.content ?? "").includes("Token Address"),
    );
    expect(success.length).toBeGreaterThan(0);
    expect(success.some((m) => String(m.content).includes(CLAWD_MINT))).toBe(
      true,
    );
    expect(success.every((m) => !String(m.content).includes(OLD_MCP_MINT))).toBe(
      true,
    );

    const skip = window.skipToEnd as () => void;
    skip();
    const painted = get("chat-container").innerHTML;
    expect(painted).toContain("get_account_balance");
    expect(painted).toContain("fetch_price_chart");
    expect(painted).toContain("7JofsgKgD3MerQDa7hEe4dfkY3c3nMnsThZzUuYyTFpE");
    expect(painted).toContain("create_token");
    expect(painted).toContain("nvidia-image-1743382334246.jpg");
    expect(painted).toContain("fetch_price");
    expect(painted).toContain(CLAWD_MINT);
    expect(painted).not.toContain(OLD_MCP_MINT);
    expect(conversation.every((m) => m.type === "divider" || painted.length > 0)).toBe(
      true,
    );
    expect(get("chat-container").children.length).toBe(conversation.length);
  });

  it("Restart resets and plays from the first user turn", async () => {
    const { window, get } = loadPageScript();
    const skip = window.skipToEnd as () => void;
    const restart = window.restartConversation as () => void | Promise<unknown>;
    skip();
    expect(get("chat-container").innerHTML).toContain("fetch_price");
    await restart();
    const html = get("chat-container").innerHTML;
    expect(html).toContain("get_account_balance");
    const firstUser = (window.conversation as Array<{ type: string; content?: string }>).find(
      (m) => m.type === "user",
    );
    expect(firstUser?.content).toMatch(/get_account_balance/);
    const firstChild = get("chat-container").children[0];
    expect(JSON.stringify(firstChild.innerHTML)).toMatch(/get_account_balance/);
  });
});
