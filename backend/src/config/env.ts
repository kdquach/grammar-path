import { z } from "zod";

const KNOWN_PLACEHOLDER_SECRETS = new Set([
  "your-super-secret-jwt-key-change-in-production",
  "grammarpath-dev-jwt-super-secret-key-32chars-minimum-2026",
  "changeme",
  "secret",
  "dev-secret",
  "jwt-secret",
  "default-secret",
  "replace-me",
]);

const DEFAULT_DEV_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function parseCorsOrigins(
  rawCorsOrigin: string | undefined,
  nodeEnv: "development" | "test" | "production"
): string[] {
  if (!rawCorsOrigin || rawCorsOrigin.trim() === "") {
    return nodeEnv === "production" ? [] : DEFAULT_DEV_CORS_ORIGINS;
  }

  const entries = rawCorsOrigin
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    return nodeEnv === "production" ? [] : DEFAULT_DEV_CORS_ORIGINS;
  }

  const normalized: string[] = [];
  for (const entry of entries) {
    if (entry === "*") {
      throw new Error(
        "CORS_ORIGIN cannot use wildcard '*'; configure explicit allowed origin(s)"
      );
    }
    let parsed: URL;
    try {
      parsed = new URL(entry);
    } catch {
      throw new Error(`Invalid URL in CORS_ORIGIN: '${entry}'`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`CORS_ORIGIN entries must use http or https protocol: '${entry}'`);
    }
    normalized.push(parsed.origin);
  }

  return Array.from(new Set(normalized));
}

/**
 * Parses `TRUST_PROXY` into an explicit Express `trust proxy` configuration.
 *
 * Supported topologies:
 * - Unset / "false" / "0" -> `false` (direct client connections; ignores `X-Forwarded-For`)
 * - Integer "1".."10"     -> `N` rightmost proxy hops trusted (e.g. `1` = Nginx/ALB/Render/Railway,
 *                            `2` = CDN/Cloudflare -> Nginx/ALB -> Node.js)
 * - "true"                -> normalized to `1` hop so Express never receives permissive boolean `true`
 *                            that would trust arbitrary attacker-supplied `X-Forwarded-For` prefixes.
 */
function parseTrustProxy(rawValue: string | undefined): false | number {
  if (!rawValue || rawValue.trim() === "") {
    return false;
  }
  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "false") {
    return false;
  }
  if (normalized === "true") {
    return 1;
  }
  if (!/^\d+$/.test(normalized)) {
    throw new Error(
      "TRUST_PROXY must be 'false', 'true', or a non-negative integer between 0 and 10"
    );
  }
  const hops = Number(normalized);
  if (!Number.isInteger(hops) || hops < 0 || hops > 10) {
    throw new Error(
      "TRUST_PROXY must be 'false', 'true', or a non-negative integer between 0 and 10"
    );
  }
  return hops === 0 ? false : hops;
}

const rawEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  JWT_SECRET: z.string({ required_error: "JWT_SECRET environment variable is required" }),
  JWT_EXPIRES_IN: z
    .string()
    .trim()
    .regex(/^\d+(?:[smhd])?$/i, "JWT_EXPIRES_IN must be a valid duration such as '7d' or '12h'")
    .default("7d"),
  CORS_ORIGIN: z.string().optional(),
  BODY_LIMIT: z
    .string()
    .trim()
    .regex(/^\d+(?:b|kb|mb)$/i, "BODY_LIMIT must be a size string like '100kb' or '1mb'")
    .default("100kb"),
  TRUST_PROXY: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).max(3600000).default(15 * 60 * 1000),
  RATE_LIMIT_AUTH_MAX: z.coerce.number().int().min(1).max(1000).default(15),
  RATE_LIMIT_AI_MAX: z.coerce.number().int().min(1).max(1000).default(20),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
});

export interface AppEnvConfig {
  nodeEnv: "development" | "test" | "production";
  isProduction: boolean;
  port: number;
  jwtSecret: string;
  jwtExpiresIn: string;
  corsOrigins: string[];
  bodyLimit: string;
  trustProxy: false | number;
  rateLimitWindowMs: number;
  rateLimitAuthMax: number;
  rateLimitAiMax: number;
  geminiApiKey?: string;
  geminiModel?: string;
}

let cachedEnv: AppEnvConfig | null = null;

/**
 * Validates required runtime environment variables and rejects missing, short,
 * or default-placeholder JWT secrets. Never echoes secret values in errors.
 */
export function validateEnv(rawEnv: NodeJS.ProcessEnv = process.env): AppEnvConfig {
  const parsed = rawEnvSchema.safeParse(rawEnv);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  const data = parsed.data;
  const trimmedSecret = data.JWT_SECRET.trim();

  if (trimmedSecret.length < 32) {
    throw new Error(
      "Invalid environment configuration: JWT_SECRET must be at least 32 characters"
    );
  }

  if (KNOWN_PLACEHOLDER_SECRETS.has(trimmedSecret.toLowerCase())) {
    throw new Error(
      "Invalid environment configuration: JWT_SECRET must not use a default placeholder value"
    );
  }

  if (new Set(trimmedSecret).size < 4) {
    throw new Error(
      "Invalid environment configuration: JWT_SECRET must have sufficient character entropy"
    );
  }

  const corsOrigins = parseCorsOrigins(data.CORS_ORIGIN, data.NODE_ENV);
  const trustProxy = parseTrustProxy(data.TRUST_PROXY);

  return {
    nodeEnv: data.NODE_ENV,
    isProduction: data.NODE_ENV === "production",
    port: data.PORT,
    jwtSecret: trimmedSecret,
    jwtExpiresIn: data.JWT_EXPIRES_IN,
    corsOrigins,
    bodyLimit: data.BODY_LIMIT,
    trustProxy,
    rateLimitWindowMs: data.RATE_LIMIT_WINDOW_MS,
    rateLimitAuthMax: data.RATE_LIMIT_AUTH_MAX,
    rateLimitAiMax: data.RATE_LIMIT_AI_MAX,
    geminiApiKey: data.GEMINI_API_KEY?.trim() || undefined,
    geminiModel: data.GEMINI_MODEL?.trim() || undefined,
  };
}

/**
 * Returns validated application configuration.
 * Re-reads process.env dynamically under Vitest/test runs so security tests can
 * verify env overrides deterministically; caches validated config in runtime builds.
 */
export function getEnv(): AppEnvConfig {
  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return validateEnv(process.env);
  }
  if (!cachedEnv) {
    cachedEnv = validateEnv(process.env);
  }
  return cachedEnv;
}

export function resetEnvCacheForTests(): void {
  cachedEnv = null;
}

