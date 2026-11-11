const API_VERSION_SUFFIX_REGEX = /\/api\/v1$/i;

/**
 * Normalizes `VITE_API_BASE_URL` into an API origin (scheme + host + optional port)
 * without any trailing slash or accidental `/api/v1` path suffix.
 *
 * Returns `""` when unset or pointing only to `/api/v1`, which activates
 * same-origin relative `/api/v1` requests (for Vite dev proxy or reverse-proxy hosting).
 */
export function normalizeApiBaseOrigin(rawBaseUrl?: string): string {
  if (!rawBaseUrl) {
    return "";
  }

  let normalized = rawBaseUrl.trim().replace(/\/+$/, "");
  while (API_VERSION_SUFFIX_REGEX.test(normalized)) {
    normalized = normalized
      .replace(API_VERSION_SUFFIX_REGEX, "")
      .replace(/\/+$/, "");
  }

  return normalized;
}

/**
 * Resolves the `/api/v1` prefix used by the browser client.
 * Guarantees `/api/v1` appears exactly once even if `VITE_API_BASE_URL`
 * contains a trailing slash or accidental `/api/v1` suffix.
 */
export function resolveApiPrefix(rawBaseUrl?: string): string {
  const origin = normalizeApiBaseOrigin(rawBaseUrl);
  return origin ? `${origin}/api/v1` : "/api/v1";
}

/**
 * Constructs a request URL by combining the normalized `/api/v1` prefix with an endpoint,
 * deduplicating any accidental leading `/api/v1` in `endpoint`.
 */
export function buildApiUrl(endpoint: string, rawBaseUrl?: string): string {
  const prefix = resolveApiPrefix(rawBaseUrl);
  const trimmedEndpoint = endpoint.trim();
  let normalizedEndpoint = trimmedEndpoint.startsWith("/")
    ? trimmedEndpoint
    : `/${trimmedEndpoint}`;

  while (/^\/api\/v1(\/|$)/i.test(normalizedEndpoint)) {
    normalizedEndpoint = normalizedEndpoint.replace(/^\/api\/v1/i, "");
    if (!normalizedEndpoint.startsWith("/")) {
      normalizedEndpoint = `/${normalizedEndpoint}`;
    }
  }

  if (normalizedEndpoint === "/" && /^\/api\/v1\/?$/i.test(trimmedEndpoint)) {
    return prefix;
  }

  return `${prefix}${normalizedEndpoint}`;
}

/**
 * Resolves the backend origin target for Vite's `/api` dev server proxy.
 */
export function resolveViteProxyTarget(rawBaseUrl?: string): string {
  const origin = normalizeApiBaseOrigin(rawBaseUrl);
  return origin || "http://localhost:4000";
}

