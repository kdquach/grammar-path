import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  generateGeminiTextDetailed,
  getGenerationModel,
  getCriticModel,
} from "../src/lib/gemini";

describe("Phase 3.4C.4B.4.2: Gemini Client Refactor & Fail-Closed Guard", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should select configured generation model and critic model correctly", () => {
    process.env.GEMINI_GENERATION_MODEL = "models/gemini-2.5-pro";
    process.env.GEMINI_CRITIC_MODEL = "models/gemini-2.5-flash";

    expect(getGenerationModel()).toBe("gemini-2.5-pro");
    expect(getCriticModel()).toBe("gemini-2.5-flash");
  });

  it("should fail-closed immediately if GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;

    const result = await generateGeminiTextDetailed({
      prompt: "ping",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("missing_api_key");
    }
  });

  it("should fail-closed on HTTP 404 upstream error and NEVER attempt silent fallback", async () => {
    process.env.GEMINI_API_KEY = "test-fake-key-12345";
    process.env.GEMINI_GENERATION_MODEL = "gemini-2.5-pro";

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({
        error: {
          code: 404,
          message: "models/gemini-2.5-pro is no longer available to new users.",
          status: "NOT_FOUND",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const result = await generateGeminiTextDetailed({
      prompt: "ping",
      model: "gemini-2.5-pro",
    });

    // Invariant: fetch was called EXACTLY once. ZERO fallback calls.
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const calledUrl = fetchSpy.mock.calls[0][0];
    expect(calledUrl).toContain("models/gemini-2.5-pro:generateContent");

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("upstream_error");
      expect(result.status).toBe(404);
      expect(result.model).toBe("gemini-2.5-pro");
      expect(result.errorMessage).toContain("models/gemini-2.5-pro is no longer available");
    }
  });

  it("should redact API keys from error messages if upstream reflects the key", async () => {
    process.env.GEMINI_API_KEY = "super-secret-key-abc";

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      json: async () => ({
        error: {
          code: 400,
          message: "Invalid request parameter: key=super-secret-key-abc was rejected",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const result = await generateGeminiTextDetailed({
      prompt: "ping",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorMessage).not.toContain("super-secret-key-abc");
      expect(result.errorMessage).toContain("key=[REDACTED]");
    }
  });

  it("should extract usage metadata and thinking tokens accurately on success", async () => {
    process.env.GEMINI_API_KEY = "valid-test-key";

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: "pong response" }],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 15,
          candidatesTokenCount: 5,
          totalTokenCount: 20,
          thinkingTokenCount: 2,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    const result = await generateGeminiTextDetailed({
      prompt: "ping",
      model: "gemini-2.5-flash",
    });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.text).toBe("pong response");
      expect(result.model).toBe("gemini-2.5-flash");
      expect(result.usageMetadata).toEqual({
        promptTokenCount: 15,
        candidatesTokenCount: 5,
        totalTokenCount: 20,
        thinkingTokenCount: 2,
      });
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    }
  });
});

