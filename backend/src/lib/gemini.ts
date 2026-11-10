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
 * and per-attempt timeouts. Returns null if no API key is configured or all
 * candidate models fail.
 */
export async function generateGeminiText(
  options: GeminiGenerateOptions
): Promise<GeminiGenerateResult | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  const {
    prompt,
    timeoutMs = 15000,
    responseMimeType,
    temperature,
  } = options;

  const candidates = buildModelCandidates();

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
        `https://generativelanguage.googleapis.com/v1beta/models/${candidate.name}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyPayload),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorSnippet = "";
        try {
          const errText = await response.text();
          errorSnippet = errText.slice(0, 200).replace(/\s+/g, " ");
        } catch {
          // ignore body read failure
        }
        console.warn(
          `[Gemini] Model '${candidate.name}' returned HTTP ${response.status}: ${errorSnippet}`
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
        return { text, model: candidate.name };
      }

      console.warn(
        `[Gemini] Model '${candidate.name}' returned an empty candidate payload.`
      );
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      const message =
        error instanceof Error ? error.message : "Unknown request error";
      console.warn(
        `[Gemini] Request to '${candidate.name}' failed: ${message}`
      );
    }
  }

  return null;
}

