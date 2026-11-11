import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
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
  },
}));

vi.mock("../src/lib/prisma", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { createApp } from "../src/app";
import { resetEnvCacheForTests, validateEnv } from "../src/config/env";
import {
  extractClientIpKey,
  resetRateLimitersForTests,
} from "../src/middleware/rate-limit";

const STRONG_SECRET = "unit-test-strong-signing-key-32chars-minimum";

describe("Phase 1.6 Pre-Deployment Hygiene: SEC-OPS-2 (Proxy/Rate Limit) & SEC-OPS-3 (Start Script)", () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    process.env = { ...originalEnv };
    resetEnvCacheForTests();
    vi.clearAllMocks();
    await resetRateLimitersForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetEnvCacheForTests();
    vi.restoreAllMocks();
  });

  describe("SEC-OPS-2: Reverse Proxy Trust Topology & Strict Client IP Extraction", () => {
    it("parses explicit TRUST_PROXY hop counts safely and rejects malformed or overly permissive values", () => {
      expect(validateEnv({ JWT_SECRET: STRONG_SECRET }).trustProxy).toBe(false);
      expect(validateEnv({ JWT_SECRET: STRONG_SECRET, TRUST_PROXY: "false" }).trustProxy).toBe(
        false
      );
      expect(validateEnv({ JWT_SECRET: STRONG_SECRET, TRUST_PROXY: "0" }).trustProxy).toBe(
        false
      );
      expect(validateEnv({ JWT_SECRET: STRONG_SECRET, TRUST_PROXY: "1" }).trustProxy).toBe(1);
      expect(validateEnv({ JWT_SECRET: STRONG_SECRET, TRUST_PROXY: "2" }).trustProxy).toBe(2);
      expect(validateEnv({ JWT_SECRET: STRONG_SECRET, TRUST_PROXY: "10" }).trustProxy).toBe(
        10
      );
      // Never passes permissive Express boolean `true` even if legacy config specifies `"true"`
      expect(validateEnv({ JWT_SECRET: STRONG_SECRET, TRUST_PROXY: "true" }).trustProxy).toBe(
        1
      );

      for (const badValue of ["1.5", "1e0", "+1", "-1", "11", "all", "invalid"]) {
        expect(() =>
          validateEnv({
            JWT_SECRET: STRONG_SECRET,
            TRUST_PROXY: badValue,
          })
        ).toThrow(/TRUST_PROXY/);
      }
    });

    it("configures Express trust proxy explicitly without ever enabling boolean `true`", () => {
      const directApp = createApp(
        validateEnv({ JWT_SECRET: STRONG_SECRET, TRUST_PROXY: "false" })
      );
      expect(directApp.get("trust proxy")).toBe(false);

      const singleHopApp = createApp(
        validateEnv({ JWT_SECRET: STRONG_SECRET, TRUST_PROXY: "1" })
      );
      expect(singleHopApp.get("trust proxy")).toBe(1);

      const legacyTrueApp = createApp(
        validateEnv({ JWT_SECRET: STRONG_SECRET, TRUST_PROXY: "true" })
      );
      expect(legacyTrueApp.get("trust proxy")).toBe(1);
      expect(legacyTrueApp.get("trust proxy")).not.toBe(true);
    });

    it("normalizes IPv4, IPv4-mapped IPv6, and IPv6 /56 prefixes in extractClientIpKey", () => {
      expect(extractClientIpKey({ ip: "203.0.113.5" } as never)).toBe("203.0.113.5");
      expect(extractClientIpKey({ ip: "::ffff:203.0.113.5" } as never)).toBe(
        "203.0.113.5"
      );
      expect(
        extractClientIpKey({ ip: "2001:0db8:85a3:0102:1111:2222:3333:4444" } as never)
      ).toBe("2001:db8:85a3:100::/56");
    });

    it("ignores spoofed X-Forwarded-For headers when TRUST_PROXY='false' (direct exposure)", async () => {
      process.env.RATE_LIMIT_AUTH_MAX = "2";
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const testApp = createApp(
        validateEnv({
          NODE_ENV: "production",
          JWT_SECRET: STRONG_SECRET,
          TRUST_PROXY: "false",
          RATE_LIMIT_AUTH_MAX: "2",
        })
      );

      // Attacker injects changing X-Forwarded-For values trying to evade per-IP auth limits
      const res1 = await request(testApp)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", "198.51.100.1")
        .send({ email: "attacker@example.com", password: "wrong-password" });
      const res2 = await request(testApp)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", "198.51.100.2")
        .send({ email: "attacker@example.com", password: "wrong-password" });
      const res3 = await request(testApp)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", "198.51.100.3")
        .send({ email: "attacker@example.com", password: "wrong-password" });

      expect(res1.status).toBe(401);
      expect(res2.status).toBe(401);
      expect(res3.status).toBe(429);
      expect(res3.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      errSpy.mockRestore();
    });

    it("extracts rightmost untrusted client IP when TRUST_PROXY='1' and blocks left-side XFF spoofing", async () => {
      process.env.RATE_LIMIT_AUTH_MAX = "2";
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const testApp = createApp(
        validateEnv({
          NODE_ENV: "production",
          JWT_SECRET: STRONG_SECRET,
          TRUST_PROXY: "1",
          RATE_LIMIT_AUTH_MAX: "2",
        })
      );

      // Proxy appends true client IP (203.0.113.10) to the right of attacker-controlled prefix
      const c1r1 = await request(testApp)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", "1.1.1.1, 203.0.113.10")
        .send({ email: "u1@example.com", password: "bad" });
      const c1r2 = await request(testApp)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", "2.2.2.2, 203.0.113.10")
        .send({ email: "u1@example.com", password: "bad" });
      const c1r3 = await request(testApp)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", "3.3.3.3, 203.0.113.10")
        .send({ email: "u1@example.com", password: "bad" });

      // Legitimate second client behind the same proxy retains an isolated quota
      const c2r1 = await request(testApp)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", "203.0.113.20")
        .send({ email: "u2@example.com", password: "bad" });

      expect(c1r1.status).toBe(401);
      expect(c1r2.status).toBe(401);
      expect(c1r3.status).toBe(429);
      expect(c1r3.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(c2r1.status).toBe(401);
    });

    it("extracts client IP behind a two-hop topology (TRUST_PROXY='2', e.g. CDN + reverse proxy)", async () => {
      process.env.RATE_LIMIT_AUTH_MAX = "2";
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const testApp = createApp(
        validateEnv({
          NODE_ENV: "production",
          JWT_SECRET: STRONG_SECRET,
          TRUST_PROXY: "2",
          RATE_LIMIT_AUTH_MAX: "2",
        })
      );

      // Rightmost hops: peer socket -> 10.0.0.2 (CDN edge) -> 198.51.100.42 (real client)
      const r1 = await request(testApp)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", "9.9.9.9, 198.51.100.42, 10.0.0.2")
        .send({ email: "u@example.com", password: "bad" });
      const r2 = await request(testApp)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", "8.8.8.8, 198.51.100.42, 10.0.0.2")
        .send({ email: "u@example.com", password: "bad" });
      const r3 = await request(testApp)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", "7.7.7.7, 198.51.100.42, 10.0.0.2")
        .send({ email: "u@example.com", password: "bad" });

      const otherClient = await request(testApp)
        .post("/api/v1/auth/login")
        .set("X-Forwarded-For", "198.51.100.99, 10.0.0.2")
        .send({ email: "other@example.com", password: "bad" });

      expect(r1.status).toBe(401);
      expect(r2.status).toBe(401);
      expect(r3.status).toBe(429);
      expect(otherClient.status).toBe(401);
    });
  });

  describe("SEC-OPS-3: Production Start Script & Fail-Closed Compiled Entrypoint", () => {
    it("defines production `start` script pointing strictly to `dist/src/server.js` without dev runners", () => {
      const backendRoot = path.resolve(__dirname, "..");
      const pkg = JSON.parse(
        fs.readFileSync(path.join(backendRoot, "package.json"), "utf8")
      ) as { scripts?: Record<string, string> };

      expect(pkg.scripts?.start).toBe("node dist/src/server.js");
      expect(pkg.scripts?.start).not.toMatch(/\b(tsx|ts-node|nodemon|watch|dev)\b/i);

      const compiledEntry = path.join(backendRoot, "dist", "src", "server.js");
      expect(fs.existsSync(compiledEntry)).toBe(true);
    });

    it("fails fast at compiled startup when JWT_SECRET is missing (without loading workspace .env)", () => {
      const compiledEntry = path.resolve(__dirname, "../dist/src/server.js");
      expect(fs.existsSync(compiledEntry)).toBe(true);

      // Run in os.tmpdir() so dotenv.config() cannot touch backend/.env or production Neon credentials
      const missingSecretProc = spawnSync(process.execPath, [compiledEntry], {
        cwd: os.tmpdir(),
        env: {
          NODE_ENV: "production",
          PATH: process.env.PATH || "",
        },
        encoding: "utf8",
      });

      expect(missingSecretProc.status).toBe(1);
      expect(missingSecretProc.stderr).toContain("[GrammarPath API] Startup aborted:");
      expect(missingSecretProc.stderr).toContain("JWT_SECRET");

      const leakedValue = "too-short-secret-value";
      const shortSecretProc = spawnSync(process.execPath, [compiledEntry], {
        cwd: os.tmpdir(),
        env: {
          NODE_ENV: "production",
          JWT_SECRET: leakedValue,
          PATH: process.env.PATH || "",
        },
        encoding: "utf8",
      });

      expect(shortSecretProc.status).toBe(1);
      expect(shortSecretProc.stderr).toContain("JWT_SECRET must be at least 32 characters");
      expect(shortSecretProc.stderr).not.toContain(leakedValue);
    });
  });
});

