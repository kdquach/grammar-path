interface GeminiModelCandidate {
  name: string;
  extraGenerationConfig?: Record<string, unknown>;
}

export interface GeminiGenerateOptions {
  prompt: string;
  timeoutMs?: number;
  responseMimeType?: string;
  temperature?: number;
}

export interface GeminiGenerateResult {
  text: string;
  model: string;
}

export type GeminiDetailedResult =
  | {
      ok: true;
      text: string;
      model: string;
    }
  | {
      ok: false;
      reason: "missing_api_key" | "upstream_error" | "empty_response";
    };

const DEFAULT_MODEL_CANDIDATES: GeminiModelCandidate[] = [
  {
    name: "gemini-3-flash-preview",
    extraGenerationConfig: {
      thinkingConfig: { thinkingLevel: "minimal" },
    },
  },
  {
    name: "gemini-flash-lite-latest",
  },
  {
    name: "gemini-3.1-flash-lite-preview",
  },
  {
    name: "gemini-flash-latest",
  },
];

function buildModelCandidates(): GeminiModelCandidate[] {
  const customModel = process.env.GEMINI_MODEL?.trim();
  if (!customModel) {
    return DEFAULT_MODEL_CANDIDATES;
  }

  const normalized = customModel.replace(/^models\//, "");
  const rest = DEFAULT_MODEL_CANDIDATES.filter((c) => c.name !== normalized);
  return [{ name: normalized }, ...rest];
}

/**
 * Generates text using the Google Gemini REST API with automatic model fallback
 * and explicit failure classification (missing API key vs upstream failure vs empty response).
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
  } = options;

  const candidates = buildModelCandidates();
  let hadUpstreamError = false;

  for (const candidate of candidates) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const generationConfig: Record<string, unknown> = {
        ...(candidate.extraGenerationConfig || {}),
        ...(responseMimeType ? { responseMimeType } : {}),
        ...(typeof temperature === "number" ? { temperature } : {}),
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

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${candidate.name}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify(bodyPayload),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        hadUpstreamError = true;
        console.warn(
          `[Gemini] Model '${candidate.name}' returned HTTP ${response.status}`
        );
        continue;
      }

      const data = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string; thought?: boolean }>;
          };
        }>;
      };

      const parts = data.candidates?.[0]?.content?.parts || [];
      const text = parts
        .filter((part) => !part.thought && typeof part.text === "string")
        .map((part) => part.text || "")
        .join("")
        .trim();

      if (text.length > 0) {
        return { ok: true, text, model: candidate.name };
      }

      console.warn(
        `[Gemini] Model '${candidate.name}' returned an empty candidate payload.`
      );
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      hadUpstreamError = true;
      const message =
        error instanceof Error ? error.name : "UnknownError";
      console.warn(
        `[Gemini] Request to '${candidate.name}' failed (${message}).`
      );
    }
  }

  return {
    ok: false,
    reason: hadUpstreamError ? "upstream_error" : "empty_response",
  };
}

/**
 * Generates text using the Google Gemini REST API with automatic model fallback
 * and per-attempt timeouts. Returns null if no API key is configured or all
 * candidate models fail.
 */
export async function generateGeminiText(
  options: GeminiGenerateOptions
): Promise<GeminiGenerateResult | null> {
  const result = await generateGeminiTextDetailed(options);
  return result.ok ? { text: result.text, model: result.model } : null;
}
