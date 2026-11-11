import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRaw: vi.fn(),
    $disconnect: vi.fn(),
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    unit: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    exercise: {
      count: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    learningProgress: {
      count: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    exerciseAttempt: {
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    questionAttemptItem: {
      count: vi.fn(),
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    theorySection: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("../src/lib/prisma", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { createApp } from "../src/app";
import { validateEnv, resetEnvCacheForTests } from "../src/config/env";
import { signJwtToken, verifyJwtToken } from "../src/utils/jwt";
import { resetRateLimitersForTests } from "../src/middleware/rate-limit";

const TEST_USER = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "owner@grammarpath.local",
  displayName: "Owner Learner",
};

const SECOND_USER = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "second@grammarpath.local",
  displayName: "Second Learner",
};

describe("Phase 1 Security Hardening, Env Validation, Rate Limiting & Offline Migration Integrity", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    resetEnvCacheForTests();
    vi.clearAllMocks();
    await resetRateLimitersForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    resetEnvCacheForTests();
  });

  // ─── 1. Startup Environment Validation & Secret Safety ─────────────────────

  describe("Environment Configuration & JWT Secret Fail-Fast", () => {
    it("rejects missing JWT_SECRET without falling back", () => {
      expect(() =>
        validateEnv({
          NODE_ENV: "development",
        })
      ).toThrow(/JWT_SECRET/i);
    });

    it("rejects short JWT_SECRET (< 32 chars) and never echoes the secret value", () => {
      const secretValue = "short-secret-value-123";
      let thrownMessage = "";
      try {
        validateEnv({
          NODE_ENV: "production",
          JWT_SECRET: secretValue,
        });
      } catch (err) {
        thrownMessage = err instanceof Error ? err.message : String(err);
      }
      expect(thrownMessage).toContain("at least 32 characters");
      expect(thrownMessage).not.toContain(secretValue);
    });

    it("rejects known placeholder and old hardcoded fallback JWT secrets", () => {
      const placeholders = [
        "your-super-secret-jwt-key-change-in-production",
        "grammarpath-dev-jwt-super-secret-key-32chars-minimum-2026",
        "changeme-placeholder-12345678901234567890".slice(0, 8),
      ];
      for (const secret of placeholders) {
        expect(() =>
          validateEnv({
            NODE_ENV: "development",
            JWT_SECRET: secret,
          })
        ).toThrow();
      }
    });

    it("rejects low-entropy repeated character JWT secrets", () => {
      expect(() =>
        validateEnv({
          NODE_ENV: "production",
          JWT_SECRET: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        })
      ).toThrow(/entropy/i);
    });

    it("rejects wildcard CORS_ORIGIN and non-HTTP origins", () => {
      const validSecret = "unit-test-strong-signing-key-32chars-minimum";
      expect(() =>
        validateEnv({
          NODE_ENV: "production",
          JWT_SECRET: validSecret,
          CORS_ORIGIN: "*",
        })
      ).toThrow(/wildcard/i);

      expect(() =>
        validateEnv({
          NODE_ENV: "production",
          JWT_SECRET: validSecret,
          CORS_ORIGIN: "https://app.grammarpath.local, *",
        })
      ).toThrow(/wildcard/i);

      expect(() =>
        validateEnv({
          NODE_ENV: "production",
          JWT_SECRET: validSecret,
          CORS_ORIGIN: "ftp://files.grammarpath.local",
        })
      ).toThrow(/http or https/i);
    });

    it("rejects malformed BODY_LIMIT and invalid TRUST_PROXY values", () => {
      const validSecret = "unit-test-strong-signing-key-32chars-minimum";
      expect(() =>
        validateEnv({
          NODE_ENV: "development",
          JWT_SECRET: validSecret,
          BODY_LIMIT: "unlimited",
        })
      ).toThrow(/BODY_LIMIT/);

      expect(() =>
        validateEnv({
          NODE_ENV: "production",
          JWT_SECRET: validSecret,
          TRUST_PROXY: "invalid",
        })
      ).toThrow(/TRUST_PROXY/);
    });

    it("uses fail-closed empty CORS allowlist by default in production and explicit allowlist when provided", () => {
      const validSecret = "unit-test-strong-signing-key-32chars-minimum";
      const prodDefault = validateEnv({
        NODE_ENV: "production",
        JWT_SECRET: validSecret,
      });
      expect(prodDefault.isProduction).toBe(true);
      expect(prodDefault.corsOrigins).toEqual([]);

      const prodExplicit = validateEnv({
        NODE_ENV: "production",
        JWT_SECRET: validSecret,
        CORS_ORIGIN: "https://grammarpath.example/, https://app.grammarpath.example",
        TRUST_PROXY: "true",
      });
      expect(prodExplicit.corsOrigins).toEqual([
        "https://grammarpath.example",
        "https://app.grammarpath.example",
      ]);
      expect(prodExplicit.trustProxy).toBe(1);
    });
  });

  // ─── 2. JWT Signing & Verification ─────────────────────────────────────────

  describe("JWT Integrity without Fallback Secrets", () => {
    it("signs and verifies valid HS256 payload and rejects forged or malformed tokens", () => {
      const token = signJwtToken(TEST_USER);
      const verified = verifyJwtToken(token);
      expect(verified).toEqual(TEST_USER);

      const wrongSecretToken = jwt.sign(
        TEST_USER,
        "different-signing-key-at-least-32-chars-long",
        { algorithm: "HS256" }
      );
      expect(() => verifyJwtToken(wrongSecretToken)).toThrow();

      const missingClaimsToken = jwt.sign(
        { id: TEST_USER.id },
        process.env.JWT_SECRET!,
        { algorithm: "HS256" }
      );
      expect(() => verifyJwtToken(missingClaimsToken)).toThrow(/claims/i);
    });

    it("fails closed if JWT_SECRET is deleted from environment", () => {
      delete process.env.JWT_SECRET;
      expect(() => signJwtToken(TEST_USER)).toThrow(/JWT_SECRET/i);
      expect(() => verifyJwtToken("any.jwt.token")).toThrow(/JWT_SECRET/i);
    });
  });

  // ─── 3. Security Headers, CORS Allowlist & Request Limits ──────────────────

  describe("HTTP Security Middleware (Helmet, CORS, Payload Limits, JSON Parsing)", () => {
    it("applies Helmet security headers, disables X-Powered-By, and enforces explicit CORS allowlist", async () => {
      const env = validateEnv({
        NODE_ENV: "production",
        JWT_SECRET: "unit-test-strong-signing-key-32chars-minimum",
        CORS_ORIGIN: "https://app.grammarpath.local",
        BODY_LIMIT: "100kb",
      });
      mockPrisma.unit.count.mockResolvedValueOnce(0);
      mockPrisma.unit.findMany.mockResolvedValueOnce([]);
      const testApp = createApp(env);

      // Allowed Origin succeeds with exact origin reflected (never wildcard '*')
      const allowedRes = await request(testApp)
        .get("/api/v1/units")
        .set("Origin", "https://app.grammarpath.local");

      expect(allowedRes.headers["x-content-type-options"]).toBe("nosniff");
      expect(allowedRes.headers["x-powered-by"]).toBeUndefined();
      expect(allowedRes.headers["access-control-allow-origin"]).toBe(
        "https://app.grammarpath.local"
      );

      // Disallowed Origin is blocked with 403 CORS_FORBIDDEN
      const blockedRes = await request(testApp)
        .get("/api/v1/units")
        .set("Origin", "https://attacker.example");

      expect(blockedRes.status).toBe(403);
      expect(blockedRes.body.success).toBe(false);
      expect(blockedRes.body.error.code).toBe("CORS_FORBIDDEN");
    });

    it("rejects oversized request payloads with 413 and malformed JSON with 400", async () => {
      const env = validateEnv({
        NODE_ENV: "test",
        JWT_SECRET: "unit-test-strong-signing-key-32chars-minimum",
        BODY_LIMIT: "1kb",
      });
      const testApp = createApp(env);
      const token = signJwtToken(TEST_USER);

      const largeRes = await request(testApp)
        .post("/api/v1/theory/explain-theory")
        .set("Authorization", `Bearer ${token}`)
        .set("Content-Type", "application/json")
        .send(JSON.stringify({ padding: "x".repeat(4096) }));

      expect(largeRes.status).toBe(413);
      expect(largeRes.body.success).toBe(false);
      expect(largeRes.body.error.code).toBe("PAYLOAD_TOO_LARGE");

      const invalidJsonRes = await request(testApp)
        .post("/api/v1/auth/login")
        .set("Content-Type", "application/json")
        .send("{bad-json");

      expect(invalidJsonRes.status).toBe(400);
      expect(invalidJsonRes.body.success).toBe(false);
      expect(invalidJsonRes.body.error.code).toBe("INVALID_JSON");
    });
  });

  // ─── 4. Authentication, Ownership & Protected AI Endpoints ─────────────────

  describe("Authentication, Ownership Checks & AI Endpoint Fail-Closed Behavior", () => {
    it("blocks unauthenticated calls to all private and AI-cost routes (401 UNAUTHORIZED)", async () => {
      const testApp = createApp();

      const protectedRequests = [
        request(testApp).get("/api/v1/auth/me"),
        request(testApp).get("/api/v1/progress/overview"),
        request(testApp).get("/api/v1/progress/mistakes"),
        request(testApp).get("/api/v1/progress/units/1"),
        request(testApp).put("/api/v1/progress/units/1").send({ status: "completed" }),
        request(testApp).get("/api/v1/adaptive/analytics"),
        request(testApp).get("/api/v1/adaptive/recommendations"),
        request(testApp).post("/api/v1/adaptive/toeic-practice").send({ unitNumber: 1 }),
        request(testApp).post("/api/v1/adaptive/quiz/generate").send({ questionCount: 5 }),
        request(testApp).post("/api/v1/theory/explain-theory").send({
          sectionId: "1A",
          heading: "Present continuous",
          sourceContent: "Sarah is driving to work.",
        }),
      ];

      const responses = await Promise.all(protectedRequests);
      for (const res of responses) {
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe("UNAUTHORIZED");
      }
    });

    it("scopes user-owned data strictly to verified JWT req.user.id", async () => {
      const testApp = createApp();
      const ownerToken = signJwtToken(TEST_USER);
      mockPrisma.questionAttemptItem.findMany.mockResolvedValueOnce([]);

      const analyticsRes = await request(testApp)
        .get(`/api/v1/adaptive/analytics?userId=${SECOND_USER.id}`)
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(analyticsRes.status).toBe(200);
      expect(mockPrisma.questionAttemptItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: TEST_USER.id },
        })
      );
    });

    it("rejects oversized or empty payloads on POST /api/v1/theory/explain-theory (400)", async () => {
      const testApp = createApp();
      const token = signJwtToken(TEST_USER);

      const oversizedRes = await request(testApp)
        .post("/api/v1/theory/explain-theory")
        .set("Authorization", `Bearer ${token}`)
        .send({
          sectionId: "1A",
          heading: "Present continuous",
          sourceContent: "a".repeat(12001),
        });

      expect(oversizedRes.status).toBe(400);
      expect(oversizedRes.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 503 AI_PROVIDER_UNAVAILABLE when GEMINI_API_KEY is missing (fail-closed)", async () => {
      delete process.env.GEMINI_API_KEY;
      const testApp = createApp();
      const token = signJwtToken(TEST_USER);

      const res = await request(testApp)
        .post("/api/v1/theory/explain-theory")
        .set("Authorization", `Bearer ${token}`)
        .send({
          sectionId: "1A",
          heading: "Study this example situation",
          sourceContent: "Sarah is driving to work.",
        });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("AI_PROVIDER_UNAVAILABLE");
    });

    it("passes Gemini API key via x-goog-api-key header (never query string) and handles upstream outage with 503", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key-secret-value";
      const fetchCalls: Array<{ url: string; headers?: Record<string, string> }> = [];

      globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        fetchCalls.push({
          url: String(input),
          headers: init?.headers as Record<string, string>,
        });
        return new Response("upstream error", { status: 503 });
      }) as typeof fetch;

      const testApp = createApp();
      const token = signJwtToken(TEST_USER);

      const res = await request(testApp)
        .post("/api/v1/theory/explain-theory")
        .set("Authorization", `Bearer ${token}`)
        .send({
          sectionId: "1A",
          heading: "Study this example situation",
          sourceContent: "Sarah is driving to work.",
        });

      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe("AI_PROVIDER_UNAVAILABLE");
      expect(fetchCalls.length).toBeGreaterThan(0);
      for (const call of fetchCalls) {
        expect(call.url).not.toContain("key=");
        expect(call.url).not.toContain("test-gemini-key-secret-value");
        expect(call.headers?.["x-goog-api-key"]).toBe("test-gemini-key-secret-value");
      }
    });

    it("returns 200 AI explanation when Gemini responds successfully", async () => {
      process.env.GEMINI_API_KEY = "test-gemini-key-secret-value";
      globalThis.fetch = vi.fn(async () => {
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: "## 🤖 Gia sư AI GrammarPath — Giải thích Mục 1A\n\nHành động đang diễn ra.",
                    },
                  ],
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }) as typeof fetch;

      const testApp = createApp();
      const token = signJwtToken(TEST_USER);

      const res = await request(testApp)
        .post("/api/v1/theory/explain-theory")
        .set("Authorization", `Bearer ${token}`)
        .send({
          sectionId: "1A",
          heading: "Study this example situation",
          sourceContent: "Sarah is driving to work.",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.source).toBe("ai");
      expect(res.body.data.explanation).toContain("1A");
    });
  });

  // ─── 5. Rate Limiting ──────────────────────────────────────────────────────

  describe("Rate Limiting on Auth and AI Endpoints", () => {
    it("enforces RATE_LIMIT_AUTH_MAX on auth endpoints with 429 RATE_LIMIT_EXCEEDED", async () => {
      process.env.RATE_LIMIT_AUTH_MAX = "2";
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const testApp = createApp();

      const res1 = await request(testApp)
        .post("/api/v1/auth/login")
        .send({ email: "user@example.com", password: "wrong-password" });
      const res2 = await request(testApp)
        .post("/api/v1/auth/login")
        .send({ email: "user@example.com", password: "wrong-password" });
      const res3 = await request(testApp)
        .post("/api/v1/auth/login")
        .send({ email: "user@example.com", password: "wrong-password" });

      expect(res1.status).toBe(401);
      expect(res2.status).toBe(401);
      expect(res3.status).toBe(429);
      expect(res3.body.success).toBe(false);
      expect(res3.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
    });

    it("enforces per-user RATE_LIMIT_AI_MAX on AI endpoints while keeping separate user quotas isolated", async () => {
      process.env.RATE_LIMIT_AI_MAX = "2";
      delete process.env.GEMINI_API_KEY;

      const testApp = createApp();
      const tokenUser1 = signJwtToken(TEST_USER);
      const tokenUser2 = signJwtToken(SECOND_USER);
      const payload = {
        sectionId: "1A",
        heading: "Present continuous",
        sourceContent: "Sarah is driving to work.",
      };

      const u1r1 = await request(testApp)
        .post("/api/v1/theory/explain-theory")
        .set("Authorization", `Bearer ${tokenUser1}`)
        .send(payload);
      const u1r2 = await request(testApp)
        .post("/api/v1/theory/explain-theory")
        .set("Authorization", `Bearer ${tokenUser1}`)
        .send(payload);
      const u1r3 = await request(testApp)
        .post("/api/v1/theory/explain-theory")
        .set("Authorization", `Bearer ${tokenUser1}`)
        .send(payload);
      const u2r1 = await request(testApp)
        .post("/api/v1/theory/explain-theory")
        .set("Authorization", `Bearer ${tokenUser2}`)
        .send(payload);

      expect(u1r1.status).toBe(503);
      expect(u1r2.status).toBe(503);
      expect(u1r3.status).toBe(429);
      expect(u1r3.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(u2r1.status).toBe(503);
    });
  });

  // ─── 6. Input Validation & Production Error Sanitization ───────────────────

  describe("Schema Validation & Production Error Sanitization", () => {
    it("enforces hardened password length (>= 8) and bounded unitNumber (<= 145)", async () => {
      const testApp = createApp();
      const token = signJwtToken(TEST_USER);

      const weakPwdRes = await request(testApp)
        .post("/api/v1/auth/register")
        .send({
          email: "newuser@grammarpath.local",
          password: "1234567",
          displayName: "New User",
        });
      expect(weakPwdRes.status).toBe(400);
      expect(weakPwdRes.body.error.code).toBe("VALIDATION_ERROR");

      const outOfRangeUnit = await request(testApp)
        .get("/api/v1/progress/units/146")
        .set("Authorization", `Bearer ${token}`);
      expect(outOfRangeUnit.status).toBe(400);
      expect(outOfRangeUnit.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("sanitizes internal SQL/DB errors in production and maps Prisma P2002 without metadata leaks", async () => {
      process.env.NODE_ENV = "production";
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      try {
        const testApp = createApp();

        // Raw unexpected Error simulating SQL leak
        mockPrisma.unit.count.mockRejectedValueOnce(
          new Error('SELECT * FROM "users" WHERE secret_token = \'top-secret-sql\'')
        );
        const internalErrRes = await request(testApp).get("/api/v1/units");
        expect(internalErrRes.status).toBe(500);
        expect(internalErrRes.body).toEqual({
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Internal server error",
          },
        });
        expect(JSON.stringify(internalErrRes.body)).not.toContain("SELECT");
        expect(JSON.stringify(internalErrRes.body)).not.toContain("top-secret-sql");

        // Simulated Prisma P2002 unique constraint violation
        mockPrisma.user.findUnique.mockResolvedValueOnce(null);
        mockPrisma.user.create.mockRejectedValueOnce(
          Object.assign(
            new Error("Unique constraint failed on the fields: (`email`)"),
            { name: "PrismaClientKnownRequestError", code: "P2002" }
          )
        );
        const p2002Res = await request(testApp)
          .post("/api/v1/auth/register")
          .send({
            email: "race@grammarpath.local",
            password: "strongPassword123!",
            displayName: "Race User",
          });

        expect(p2002Res.status).toBe(409);
        expect(p2002Res.body.error.code).toBe("CONFLICT");
        expect(p2002Res.body.error.message).toBe("Resource already exists");
        expect(JSON.stringify(p2002Res.body)).not.toContain("Unique constraint");
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });
  });

  // ─── 7. Prisma Migration History Integrity (Offline Check) ─────────────────

  describe("Prisma Migration Baseline & History Integrity (Offline)", () => {
    it("contains baseline migration_lock.toml, init_schema, and additive user progress migration without destructive drops", () => {
      const migrationsRoot = path.resolve(__dirname, "../prisma/migrations");
      const lockPath = path.join(migrationsRoot, "migration_lock.toml");
      const initSqlPath = path.join(
        migrationsRoot,
        "20261105000000_init_schema/migration.sql"
      );
      const userSqlPath = path.join(
        migrationsRoot,
        "20261106000000_add_user_progress_tables/migration.sql"
      );

      expect(fs.existsSync(lockPath)).toBe(true);
      expect(fs.existsSync(initSqlPath)).toBe(true);
      expect(fs.existsSync(userSqlPath)).toBe(true);

      const lockContent = fs.readFileSync(lockPath, "utf8");
      const initSql = fs.readFileSync(initSqlPath, "utf8");
      const userSql = fs.readFileSync(userSqlPath, "utf8");

      expect(lockContent).toContain('provider = "postgresql"');
      expect(initSql).toContain('CREATE TABLE "units"');
      expect(initSql).toContain('CREATE TABLE "explanations"');
      expect(userSql).toContain('CREATE TABLE "users"');
      expect(userSql).not.toMatch(/\bDROP\s+(TABLE|SCHEMA|DATABASE)\b/i);
    });
  });
});
