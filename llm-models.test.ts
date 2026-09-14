import { describe, expect, it } from "vitest";
import {
  getRedpillModels,
  isRedpillModel,
  isXaiModel,
  resolveProvider,
  REDPILL_DEFAULT_MODELS,
} from "./llm-models.ts";

describe("llm-models routing", () => {
  it("defaults RedPill slots", () => {
    delete process.env.REDPILL_MODEL1;
    delete process.env.REDPILL_MODEL2;
    delete process.env.REDPILL_MODEL3;
    delete process.env.REDPILL_MODEL4;
    delete process.env.REDPILL_MODEL5;
    delete process.env.REDPILL_MODEL6;
    expect(getRedpillModels()).toEqual([...REDPILL_DEFAULT_MODELS]);
  });

  it("routes configured slug to redpill when key set", () => {
    process.env.REDPILL_API_KEY = "test-rp";
    process.env.REDPILL_MODEL3 = "qwen/qwen3.8-27b";
    process.env.OPENROUTER_API_KEY = "test-or";
    expect(isRedpillModel("qwen/qwen3.8-27b")).toBe(true);
    const r = resolveProvider("qwen/qwen3.8-27b");
    expect(r.provider).toBe("redpill");
    expect(r.apiKey).toBe("test-rp");
  });

  it("routes grok to xai when key set", () => {
    process.env.XAI_API_KEY = "test-xai";
    expect(isXaiModel("grok-4.6")).toBe(true);
    expect(resolveProvider("grok-4.6").provider).toBe("xai");
  });

  it("never exposes keys in describe via accidental stringify of env in resolve", () => {
    process.env.OPENROUTER_API_KEY = "sk-or-secret-should-not-leak-in-id";
    const r = resolveProvider("openrouter/free");
    expect(JSON.stringify(r.modelId)).not.toMatch(/sk-or-secret/);
  });
});
