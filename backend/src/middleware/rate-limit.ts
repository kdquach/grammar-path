import { Request } from "express";
import rateLimit, {
  ipKeyGenerator,
  MemoryStore,
  RateLimitRequestHandler,
} from "express-rate-limit";
import { getEnv } from "../config/env";

const registeredStores: MemoryStore[] = [];

/**
 * Extracts a normalized rate-limit client IP key from Express `req.ip` (already bounded
 * by `app.get("trust proxy")`, never reading arbitrary raw `X-Forwarded-For` headers).
 * Uses `express-rate-limit`'s `ipKeyGenerator` for IPv4-mapped IPv6 normalization and IPv6 `/56` subnetting.
 */
export function extractClientIpKey(req: Request): string {
  return ipKeyGenerator(req.ip || "127.0.0.1");
}

/**
 * Creates a tracked `express-rate-limit` middleware backed by `MemoryStore`.
 *
 * IMPORTANT ARCHITECTURAL LIMITATION:
 * `MemoryStore` holds counters strictly in local process memory. It works reliably
 * for single-process deployments, but counters are NOT shared or coordinated across
 * multiple worker processes, horizontal containers, or serverless instances.
 * Upgrade to an approved shared store (e.g., Redis) before horizontal scaling.
 */
function createTrackedLimiter(options: {
  message: string;
  getLimit: () => number;
  getWindowMs: () => number;
  keyGenerator?: (req: Request) => string;
}): RateLimitRequestHandler {
  const store = new MemoryStore();
  registeredStores.push(store);

  return rateLimit({
    windowMs: options.getWindowMs(),
    limit: () => options.getLimit(),
    standardHeaders: "draft-7",
    legacyHeaders: false,
    store,
    ...(options.keyGenerator ? { keyGenerator: options.keyGenerator } : {}),
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: options.message,
        },
      });
    },
  });
}

/**
 * Rate limiter protecting authentication endpoints (/auth/login, /auth/register)
 * against brute-force attacks and credential stuffing.
 */
export const authRateLimiter = createTrackedLimiter({
  message: "Too many authentication attempts. Please try again later.",
  getWindowMs: () => {
    try {
      return getEnv().rateLimitWindowMs;
    } catch {
      return 15 * 60 * 1000;
    }
  },
  getLimit: () => getEnv().rateLimitAuthMax,
  keyGenerator: (req: Request) => extractClientIpKey(req),
});

/**
 * Rate limiter protecting AI generation and adaptive endpoints against unbounded API cost.
 * Scopes limits by authenticated user ID when available, falling back to normalized `req.ip`.
 * Uses process-local MemoryStore (not shared across multi-instance deployments).
 */
export const aiRateLimiter = createTrackedLimiter({
  message: "Too many AI requests. Please wait a moment before trying again.",
  getWindowMs: () => {
    try {
      return getEnv().rateLimitWindowMs;
    } catch {
      return 15 * 60 * 1000;
    }
  },
  getLimit: () => getEnv().rateLimitAiMax,
  keyGenerator: (req: Request) =>
    req.user?.id ? `user:${req.user.id}` : `ip:${extractClientIpKey(req)}`,
});

export async function resetRateLimitersForTests(): Promise<void> {
  await Promise.all(registeredStores.map((store) => store.resetAll()));
}

