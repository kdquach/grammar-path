export interface GeminiUsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
  thinkingTokenCount?: number;
}

export interface GeminiGenerateOptions {
  prompt: string;
  timeoutMs?: number;
  responseMimeType?: string;
  temperature?: number;
  model?: string;
  maxOutputTokens?: number;
}

export interface GeminiGenerateResult {
  text: string;
  model: string;
  usageMetadata?: GeminiUsageMetadata;
  latencyMs?: number;
}

export type GeminiDetailedResult =
  | {
      ok: true;
      text: string;
      model: string;
      usageMetadata?: GeminiUsageMetadata;
      latencyMs: number;
    }
  | {
      ok: false;
      reason: "missing_api_key" | "upstream_error" | "empty_response" | "budget_exceeded";
      status?: number;
      model?: string;
      errorMessage?: string;
      errorDetails?: unknown;
      latencyMs?: number;
    };

/**
 * Returns the configured primary generation model ID.
 * Defaults to process.env.GEMINI_GENERATION_MODEL or process.env.GEMINI_MODEL.
 */
export function getGenerationModel(): string {
  const model =
    process.env.GEMINI_GENERATION_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-2.5-pro";
  return model.replace(/^models\//, "");
}

/**
 * Returns the configured independent critic model ID.
 * Defaults to process.env.GEMINI_CRITIC_MODEL or process.env.GEMINI_MODEL.
 */
export function getCriticModel(): string {
  const model =
    process.env.GEMINI_CRITIC_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-2.5-flash";
  return model.replace(/^models\//, "");
}

/**
 * Generates text using the Google Gemini REST API with explicit model pinning
 * and strict FAIL-CLOSED behavior (zero unmanaged preview fallbacks or silent downgrades).
 *
 * Invariants:
 * 1. Pinned model ID is strictly respected.
 * 2. If the upstream provider returns an error (404, 429, 500, etc.), processing halts immediately.
 * 3. Never prints, logs, or leaks API keys or secrets.
 * 4. Captures usage metadata (prompt, candidate, total, and thinking tokens) and latency.
 */
export async function generateGeminiTextDetailed(
  options: GeminiGenerateOptions
): Promise<GeminiDetailedResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, reason: "missing_api_key" };
  }

  const {
    prompt,
    timeoutMs = 15000,
    responseMimeType,
    temperature,
    maxOutputTokens,
  } = options;

  const targetModel = (options.model?.trim() || getGenerationModel()).replace(
    /^models\//,
    ""
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const startTime = Date.now();

  try {
    const generationConfig: Record<string, unknown> = {
      ...(responseMimeType ? { responseMimeType } : {}),
      ...(typeof temperature === "number" ? { temperature } : {}),
      ...(typeof maxOutputTokens === "number" ? { maxOutputTokens } : {}),
    };

    const bodyPayload: Record<string, unknown> = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      ...(Object.keys(generationConfig).length > 0
        ? { generationConfig }
        : {}),
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(bodyPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      let errorJson: any = null;
      try {
        errorJson = await response.json();
      } catch {
        // Response was not JSON
      }

      const errorMessage =
        errorJson?.error?.message ||
        `HTTP ${response.status} ${response.statusText}`;

      // Redact any accidental secret reflection in error strings
      const sanitizedMessage = errorMessage.replace(/key=[^& \n]+/gi, "key=[REDACTED]");

      console.warn(
        `[Gemini FAIL-CLOSED] Target model '${targetModel}' returned HTTP ${response.status}: ${sanitizedMessage}`
      );

      // FAIL-CLOSED: strictly return failure without attempting any fallback model
      return {
        ok: false,
        reason: "upstream_error",
        status: response.status,
        model: targetModel,
        errorMessage: sanitizedMessage,
        errorDetails: errorJson?.error || null,
        latencyMs,
      };
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string; thought?: boolean }>;
        };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
        thinkingTokenCount?: number;
      };
    };

    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts
      .filter((part) => !part.thought && typeof part.text === "string")
      .map((part) => part.text || "")
      .join("")
      .trim();

    const usageMetadata: GeminiUsageMetadata | undefined = data.usageMetadata
      ? {
          promptTokenCount: data.usageMetadata.promptTokenCount ?? 0,
          candidatesTokenCount: data.usageMetadata.candidatesTokenCount ?? 0,
          totalTokenCount: data.usageMetadata.totalTokenCount ?? 0,
          thinkingTokenCount: data.usageMetadata.thinkingTokenCount,
        }
      : undefined;

    if (text.length > 0) {
      return {
        ok: true,
        text,
        model: targetModel,
        usageMetadata,
        latencyMs,
      };
    }

    console.warn(
      `[Gemini FAIL-CLOSED] Target model '${targetModel}' returned an empty candidate payload.`
    );
    return {
      ok: false,
      reason: "empty_response",
      model: targetModel,
      latencyMs,
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : "UnknownError";
    const sanitizedMessage = message.replace(/key=[^& \n]+/gi, "key=[REDACTED]");

    console.warn(
      `[Gemini FAIL-CLOSED] Request to '${targetModel}' failed: ${sanitizedMessage}`
    );

    return {
      ok: false,
      reason: "upstream_error",
      model: targetModel,
      errorMessage: sanitizedMessage,
      latencyMs,
    };
  }
}

/**
 * Generates text using the Google Gemini REST API with explicit model pinning
 * and strict fail-closed error handling. Returns null on failure.
 */
export async function generateGeminiText(
  options: GeminiGenerateOptions
): Promise<GeminiGenerateResult | null> {
  const result = await generateGeminiTextDetailed(options);
  return result.ok
    ? {
        text: result.text,
        model: result.model,
        usageMetadata: result.usageMetadata,
        latencyMs: result.latencyMs,
      }
    : null;
}
