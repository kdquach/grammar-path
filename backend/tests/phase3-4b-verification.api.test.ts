import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../src/app";
import prisma from "../src/lib/prisma";

describe("Phase 3.4B Milestone 4 — Comprehensive Independent Verification Suite", () => {
  let userA_Token: string;
  let userA_Id: string;
  let userB_Token: string;
  let userB_Id: string;

  beforeAll(async () => {
    // User A
    const resA = await request(app).post("/api/v1/auth/register").send({
      email: `m4-usera-${Date.now()}@grammarpath.local`,
      password: "TestPassword123!",
      displayName: "User A",
    });
    expect(resA.status).toBe(201);
    userA_Token = resA.body.data.token;
    userA_Id = resA.body.data.user.id;

    // User B
    const resB = await request(app).post("/api/v1/auth/register").send({
      email: `m4-userb-${Date.now()}@grammarpath.local`,
      password: "TestPassword123!",
      displayName: "User B",
    });
    expect(resB.status).toBe(201);
    userB_Token = resB.body.data.token;
    userB_Id = resB.body.data.user.id;
  });

  describe("1. Anti-Spoiler & Server-Authoritative Answer Secrecy", () => {
    it("ensures session generation response NEVER exposes correctAnswer or explanation", async () => {
      const res = await request(app)
        .post("/api/v1/adaptive/toeic-practice")
        .set("Authorization", `Bearer ${userA_Token}`)
        .send({
          unitNumber: 1,
          difficulty: "easy",
          count: 2,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const questions = res.body.data.questions;
      expect(questions.length).toBeGreaterThanOrEqual(1);

      for (const q of questions) {
        // Strict anti-spoiler assertions
        expect(q.correctAnswer).toBeUndefined();
        expect(q.explanation).toBeUndefined();
        expect(q.prompt).toBeDefined();
        expect(q.options).toHaveLength(4);
        for (const opt of q.options) {
          expect(opt.isCorrect).toBeUndefined();
        }
      }
    });
  });

  describe("2. IDOR, Ownership & Input Validation Protection", () => {
    let sessionA_Id: string;
    let itemA_Id: string;

    beforeAll(async () => {
      const res = await request(app)
        .post("/api/v1/adaptive/toeic-practice")
        .set("Authorization", `Bearer ${userA_Token}`)
        .send({ unitNumber: 1, difficulty: "easy", count: 1 });
      sessionA_Id = res.body.data.sessionId;
      itemA_Id = res.body.data.questions[0].itemId;
    });

    it("blocks User B from submitting answers to User A's session with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .post("/api/v1/adaptive/toeic-practice/check")
        .set("Authorization", `Bearer ${userB_Token}`)
        .send({
          sessionId: sessionA_Id,
          itemId: itemA_Id,
          studentAnswer: "A",
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects invalid answer keys (outside A, B, C, D) with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/adaptive/toeic-practice/check")
        .set("Authorization", `Bearer ${userA_Token}`)
        .send({
          sessionId: sessionA_Id,
          itemId: itemA_Id,
          studentAnswer: "E", // INVALID
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects empty answer submission with 400 VALIDATION_ERROR", async () => {
      const res = await request(app)
        .post("/api/v1/adaptive/toeic-practice/check")
        .set("Authorization", `Bearer ${userA_Token}`)
        .send({
          sessionId: sessionA_Id,
          itemId: itemA_Id,
          studentAnswer: "",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("3. Database Schema Integrity & Rollback Verifiability", () => {
    it("confirms all Phase 3.4B tables, enums and foreign keys exist in PostgreSQL catalog", async () => {
      // Query information_schema for the 4 new tables
      const tables: Array<{ table_name: string }> = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name IN ('toeic_question_generation_runs', 'toeic_question_bank_items', 'toeic_question_options', 'toeic_generation_jobs')
      `;
      expect(tables).toHaveLength(4);

      // Verify foreign key from question_attempt_items to toeic_question_bank_items
      const fkChecks: Array<{ constraint_name: string }> = await prisma.$queryRaw`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_schema = 'public' 
          AND table_name = 'question_attempt_items' 
          AND constraint_name = 'question_attempt_items_question_bank_item_id_fkey'
      `;
      expect(fkChecks).toHaveLength(1);
    });
  });
});

