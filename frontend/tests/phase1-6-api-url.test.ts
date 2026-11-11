import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildApiUrl,
  normalizeApiBaseOrigin,
  resolveApiPrefix,
  resolveViteProxyTarget,
} from "../src/api/apiUrl";
import api from "../src/api/client";

describe("SEC-OPS-1: Frontend API Base URL Normalization & Prefix Safety", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("uses relative '/api/v1' when VITE_API_BASE_URL is unset, empty, or '/'", () => {
    expect(resolveApiPrefix(undefined)).toBe("/api/v1");
    expect(resolveApiPrefix("")).toBe("/api/v1");
    expect(resolveApiPrefix("   ")).toBe("/api/v1");
    expect(resolveApiPrefix("/")).toBe("/api/v1");

    expect(buildApiUrl("/units", undefined)).toBe("/api/v1/units");
    expect(buildApiUrl("/auth/login", "")).toBe("/api/v1/auth/login");
    expect(resolveViteProxyTarget(undefined)).toBe("http://localhost:4000");
    expect(resolveViteProxyTarget("")).toBe("http://localhost:4000");
  });

  it("handles origin-only URLs without mutating host or port", () => {
    expect(normalizeApiBaseOrigin("http://localhost:4000")).toBe("http://localhost:4000");
    expect(normalizeApiBaseOrigin("https://api.grammarpath.example")).toBe(
      "https://api.grammarpath.example"
    );

    expect(resolveApiPrefix("http://localhost:4000")).toBe("http://localhost:4000/api/v1");
    expect(resolveApiPrefix("https://api.grammarpath.example")).toBe(
      "https://api.grammarpath.example/api/v1"
    );
    expect(buildApiUrl("/units/1", "https://api.grammarpath.example")).toBe(
      "https://api.grammarpath.example/api/v1/units/1"
    );
    expect(resolveViteProxyTarget("http://127.0.0.1:4100")).toBe("http://127.0.0.1:4100");
  });

  it("strips single or repeated trailing slashes cleanly", () => {
    expect(normalizeApiBaseOrigin("https://api.grammarpath.example/")).toBe(
      "https://api.grammarpath.example"
    );
    expect(normalizeApiBaseOrigin("http://localhost:4000///")).toBe(
      "http://localhost:4000"
    );

    expect(resolveApiPrefix("https://api.grammarpath.example/")).toBe(
      "https://api.grammarpath.example/api/v1"
    );
    expect(buildApiUrl("/book", "http://localhost:4000/")).toBe(
      "http://localhost:4000/api/v1/book"
    );
    expect(resolveViteProxyTarget("http://localhost:4000/")).toBe("http://localhost:4000");
  });

  it("strips accidental '/api/v1' suffixes cleanly to prevent double prefixing", () => {
    expect(resolveApiPrefix("http://localhost:4000/api/v1")).toBe(
      "http://localhost:4000/api/v1"
    );
    expect(resolveApiPrefix("https://api.grammarpath.example/api/v1/")).toBe(
      "https://api.grammarpath.example/api/v1"
    );
    expect(resolveApiPrefix("/api/v1")).toBe("/api/v1");
    expect(resolveApiPrefix("/API/v1/")).toBe("/api/v1");

    expect(buildApiUrl("/units", "http://localhost:4000/api/v1")).toBe(
      "http://localhost:4000/api/v1/units"
    );
    expect(resolveViteProxyTarget("http://localhost:4000/api/v1")).toBe(
      "http://localhost:4000"
    );
    expect(resolveViteProxyTarget("/api/v1")).toBe("http://localhost:4000");
  });

  it("never produces duplicated '/api/v1/api/v1' paths across base URLs or endpoints", () => {
    expect(
      buildApiUrl("/api/v1/units", "https://api.grammarpath.example/api/v1/api/v1/")
    ).toBe("https://api.grammarpath.example/api/v1/units");

    expect(buildApiUrl("/api/v1/auth/me", undefined)).toBe("/api/v1/auth/me");
  });

  it("wires normalized VITE_API_BASE_URL through runtime api client requests", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: [],
          meta: { page: 1, limit: 20, totalItems: 0, totalPages: 1 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    globalThis.fetch = fetchMock as typeof fetch;

    vi.stubEnv("VITE_API_BASE_URL", "https://api.grammarpath.example/api/v1/");
    await api.getUnits({ page: 1 });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.grammarpath.example/api/v1/units?page=1",
      expect.any(Object)
    );

    fetchMock.mockClear();
    vi.stubEnv("VITE_API_BASE_URL", "https://api.grammarpath.example/");
    await api.getBook();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.grammarpath.example/api/v1/book",
      expect.any(Object)
    );

    fetchMock.mockClear();
    vi.stubEnv("VITE_API_BASE_URL", "");
    await api.getBook();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/book", expect.any(Object));
  });
});

