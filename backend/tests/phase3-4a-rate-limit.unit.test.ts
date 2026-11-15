import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import request from "supertest";

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]),
    user: {
      findUnique: vi.fn(),
    },
    unit: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    exercise: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    grammarConcept: {
      findUnique: vi.fn(),
    },
    conceptReviewSchedule: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    question: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
  },
}));

vi.mock("../src/lib/prisma", () => ({
  prisma: mockPrisma,
  default: mockPrisma,
}));

import { createApp } from "../src/app";
import { signJwtToken } from "../src/utils/jwt";
import { resetEnvCacheForTests } from "../src/config/env";
import { resetRateLimitersForTests } from "../src/middleware/rate-limit";

const USER_A = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  email: "user_a@grammarpath.local",
  displayName: "Learner A",
};

const USER_B = {
  id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  email: "user_b@grammarpath.local",
  displayName: "Learner B",
};

describe("Phase 3.4A — Rate Limiting Architecture Unit Tests", () => {
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    process.env = { ...originalEnv };
    resetEnvCacheForTests();
    await resetRateLimitersForTests();
  });

  afterEach(async () => {
    process.env = { ...originalEnv };
    resetEnvCacheForTests();
    await resetRateLimitersForTests();
  });

  describe("1. Submission Rate Limiting (POST /check, /reviews/:id/complete, etc.)", () => {
    it("enforces RATE_LIMIT_SUBMISSION_MAX on review completion and returns 429", async () => {
      process.env.RATE_LIMIT_SUBMISSION_MAX = "2";
      process.env.RATE_LIMIT_WINDOW_MS = "60000";

      const app = createApp();
      const token = signJwtToken(USER_A);
      const conceptId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

      mockPrisma.grammarConcept.findUnique.mockResolvedValue(null); // will return 404 once it hits controller

      // Request 1
      const res1 = await request(app)
        .post(`/api/v1/reviews/${conceptId}/complete`)
        .set("Authorization", `Bearer ${token}`)
        .send({ answers: { q1: "test" } });

      // Request 2
      const res2 = await request(app)
        .post(`/api/v1/reviews/${conceptId}/complete`)
        .set("Authorization", `Bearer ${token}`)
        .send({ answers: { q1: "test" } });

      // Request 3 -> hits rate limit!
      const res3 = await request(app)
        .post(`/api/v1/reviews/${conceptId}/complete`)
        .set("Authorization", `Bearer ${token}`)
        .send({ answers: { q1: "test" } });

      expect(res1.status).toBe(404); // passed limiter, reached service
      expect(res2.status).toBe(404); // passed limiter, reached service
      expect(res3.status).toBe(429); // blocked by submission limiter!
      expect(res3.body.success).toBe(false);
      expect(res3.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(res3.body.error.message).toContain("Too many submission attempts");
    });

    it("isolates submission quotas per authenticated user", async () => {
      process.env.RATE_LIMIT_SUBMISSION_MAX = "1";
      process.env.RATE_LIMIT_WINDOW_MS = "60000";

      const app = createApp();
      const tokenA = signJwtToken(USER_A);
      const tokenB = signJwtToken(USER_B);
      const conceptId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

      mockPrisma.grammarConcept.findUnique.mockResolvedValue(null);

      // User A makes 1 submission (quota exhausted)
      const resA1 = await request(app)
        .post(`/api/v1/reviews/${conceptId}/complete`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ answers: { q1: "test" } });
      expect(resA1.status).toBe(404);

      // User A makes 2nd submission -> blocked
      const resA2 = await request(app)
        .post(`/api/v1/reviews/${conceptId}/complete`)
        .set("Authorization", `Bearer ${tokenA}`)
        .send({ answers: { q1: "test" } });
      expect(resA2.status).toBe(429);

      // User B makes their first submission -> NOT blocked!
      const resB1 = await request(app)
        .post(`/api/v1/reviews/${conceptId}/complete`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ answers: { q1: "test" } });
      expect(resB1.status).toBe(404); // User B's quota is independent
    });
  });

  describe("2. General API Rate Limiting", () => {
    it("enforces RATE_LIMIT_GENERAL_MAX across general API routes and returns 429", async () => {
      process.env.RATE_LIMIT_GENERAL_MAX = "2";
      process.env.RATE_LIMIT_WINDOW_MS = "60000";

      const app = createApp();

      const res1 = await request(app).get("/api/v1/health");
      const res2 = await request(app).get("/api/v1/health");
      const res3 = await request(app).get("/api/v1/health");

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res3.status).toBe(429);
      expect(res3.body.success).toBe(false);
      expect(res3.body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(res3.body.error.message).toContain("Too many requests to the API");
    });
  });
});

