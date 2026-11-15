import { chromium } from "/Users/kd.quach03/Documents/grammarpath-app/frontend/node_modules/playwright/index.mjs";
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import dotenv from "/Users/kd.quach03/Documents/grammarpath-app/backend/node_modules/dotenv/lib/main.js";
import assert from "node:assert/strict";

const APP_DIR = "/Users/kd.quach03/Documents/grammarpath-app";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = `${APP_DIR}/reports/phase-3.3/artifacts`;

if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

const stagingEnvRaw = fs.readFileSync(`${APP_DIR}/backend/.env.staging`, "utf-8");
const stagingEnv = dotenv.parse(stagingEnvRaw);

async function waitForUrl(url, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function freePort(port) {
  try {
    const stdout = execSync(`lsof -ti :${port} 2>/dev/null || true`, { encoding: "utf-8" }).trim();
    if (stdout) {
      const pids = stdout.split("\n").filter(Boolean);
      for (const pid of pids) {
        try {
          process.kill(Number(pid), "SIGKILL");
        } catch {}
      }
    }
  } catch {}
}

async function cleanupUser(email) {
  try {
    const { PrismaClient } = await import(
      "/Users/kd.quach03/Documents/grammarpath-app/backend/node_modules/@prisma/client/index.js"
    );
    const client = new PrismaClient({
      datasources: { db: { url: stagingEnv.DATABASE_URL } },
    });
    const user = await client.user.findUnique({ where: { email } });
    if (user) {
      await client.diagnosticAssessmentItem.deleteMany({
        where: { assessment: { userId: user.id } },
      });
      await client.diagnosticAssessment.deleteMany({ where: { userId: user.id } });
      await client.dailyLearningPlanItem.deleteMany({
        where: { plan: { userId: user.id } },
      });
      await client.dailyLearningPlan.deleteMany({ where: { userId: user.id } });
      await client.userLearningPreferences.deleteMany({ where: { userId: user.id } });
      await client.conceptMasteryEvent.deleteMany({ where: { userId: user.id } });
      await client.conceptReviewSchedule.deleteMany({ where: { userId: user.id } });
      await client.userConceptMastery.deleteMany({ where: { userId: user.id } });
      await client.questionAttemptItem.deleteMany({ where: { userId: user.id } });
      await client.exerciseAttempt.deleteMany({ where: { userId: user.id } });
      await client.learningProgress.deleteMany({ where: { userId: user.id } });
      await client.user.delete({ where: { id: user.id } });
      console.log(`[cleanup] Cleaned up temporary test user: ${email} (${user.id})`);
    }
    await client.$disconnect();
  } catch (err) {
    console.warn("[cleanup] Warning during user cleanup:", err.message);
  }
}

async function run() {
  const ts = Date.now();
  const email = `phase33-e2e-${ts}@grammarpath.local`;
  const password = "Phase33Experience123!";
  const displayName = "Phase33 Experience Tester";

  console.log("Preparing ports :4100 and :5173...");
  freePort(4100);
  freePort(5173);

  console.log("Starting backend on port 4100...");
  const backendProc = spawn(
    "node",
    ["scripts/run-with-staging-env.mjs", "--", "node", "dist/src/server.js"],
    {
      cwd: `${APP_DIR}/backend`,
      stdio: "inherit",
      env: { ...process.env, PORT: "4100" },
    }
  );

  console.log("Starting frontend on port 5173...");
  const frontendProc = spawn(
    "npx",
    ["vite", "--port", "5173", "--host", "127.0.0.1", "--strictPort"],
    {
      cwd: `${APP_DIR}/frontend`,
      stdio: "inherit",
      env: { ...process.env, VITE_API_BASE_URL: "http://localhost:4100" },
    }
  );

  let browser;
  const consoleErrors = [];
  const pageErrors = [];

  try {
    await waitForUrl("http://localhost:4100/api/v1/health", 30000);
    await waitForUrl("http://localhost:5173/", 30000);
    console.log("Both backend & frontend are ready.");

    browser = await chromium.launch({
      executablePath: CHROME_PATH,
      headless: true,
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    page.on("console", (msg) => {
      console.log(`[Browser Console] [${msg.type()}] ${msg.text()}`);
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => {
      console.log(`[Browser PageError] ${err.message}`);
      pageErrors.push(err.message);
    });

    // ─── Journey 1: New Learner Registration & Onboarding Diagnostic ──────
    console.log("[Journey 1] Navigating to /dashboard...");
    await page.goto("http://localhost:5173/dashboard", { waitUntil: "networkidle" });

    // Open Auth modal
    await page.getByRole("button", { name: /sign in \/ create account/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await dialog.getByRole("button", { name: /^create account$/i }).click();

    await dialog.locator('#displayName').fill(displayName);
    await dialog.locator('#email').fill(email);
    await dialog.locator('#password').fill(password);
    await dialog.locator('form button[type="submit"]').click();

    console.log("[Journey 1] Registered. Waiting for Dashboard to load...");
    await page.getByText(new RegExp(`welcome back, ${displayName}`, "i")).waitFor({ timeout: 15000 });

    // Click Onboarding Settings button in Dashboard header
    console.log("[Journey 1] Opening Onboarding Modal...");
    await page.locator('button[title="Cài đặt mục tiêu học tập"]').click();

    // Verify Onboarding Modal rendered
    await page.getByText("Thiết lập Kế hoạch Học tập").waitFor();
    await page.getByText("1. Mục tiêu học tập chính").waitFor();

    // Advance to Choose Diagnostic
    await page.getByRole("button", { name: "Tiếp tục" }).click();
    await page.getByText("Đánh giá Sơ bộ Ngữ pháp?").waitFor();

    // Select "Làm bài đánh giá 5 phút"
    await page.getByText("Làm bài đánh giá 5 phút").click();
    await page.getByText("Bài Đánh giá Sơ bộ").waitFor();

    // Fill diagnostic answers
    const diagInputs = page.locator('input[placeholder="Nhập câu trả lời..."]');
    const inputCount = await diagInputs.count();
    console.log(`[Journey 1] Found ${inputCount} diagnostic questions to answer...`);
    assert.ok(inputCount > 0, "Diagnostic questions must be present");

    for (let i = 0; i < inputCount; i++) {
      await diagInputs.nth(i).fill("is doing");
    }

    // Submit diagnostic
    await page.getByRole("button", { name: /nộp bài & xem kết quả/i }).click();
    await page.getByRole("heading", { name: "Kết Quả Đánh Giá" }).waitFor();
    console.log("[Journey 1] Diagnostic results displayed.");

    // Take Artifact 1 Screenshot: Onboarding & Diagnostic Results
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/01-onboarding-and-diagnostic.png`,
      fullPage: true,
    });
    console.log("[Screenshot] Saved 01-onboarding-and-diagnostic.png");

    // Close onboarding / go to learning path
    await page.getByRole("button", { name: "Vào Lộ Trình Học Tập Cá Nhân" }).click();

    // ─── Journey 2: Personalized Learning Path Overview ────────────────────
    console.log("[Journey 2] Verifying Learning Path Page...");
    await page.waitForURL("**/learning-path");
    await page.getByRole("heading", { name: /Lộ Trình Học Tập Cá Nhân/i }).waitFor();
    await page.getByText(/Lộ trình Murphy 4th Edition/i).waitFor();

    // Take Artifact 2 Screenshot: Learning Path Overview
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/02-learning-path-overview.png`,
      fullPage: true,
    });
    console.log("[Screenshot] Saved 02-learning-path-overview.png");

    // ─── Journey 3: Unified Study Session (Theory -> Practice -> Grading) ──
    console.log("[Journey 3] Navigating to /study-session?unit=1...");
    await page.goto("http://localhost:5173/study-session?unit=1", { waitUntil: "networkidle" });

    // Verify Theory Tab
    await page.getByText("Nội dung Lý Thuyết Chuẩn Giáo Trình").waitFor();
    await page.getByText(/Ví dụ minh họa ngữ pháp/i).first().waitFor();

    // Take Artifact 3 Screenshot: Unified Study Session Theory
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/03-unified-study-session-theory.png`,
      fullPage: true,
    });
    console.log("[Screenshot] Saved 03-unified-study-session-theory.png");

    // Switch to Practice Tab
    console.log("[Journey 3] Switching to Practice Tab...");
    await page.getByRole("button", { name: "Luyện tập", exact: true }).click();
    await page.getByText(/Bài tập 1\.1/i).first().waitFor();

    // Fill practice answers (handles both text inputs and option buttons)
    const questionCards = page.locator('div:has(> div > span:text-matches("^Câu [0-9]+"))');
    const qCount = await questionCards.count();
    console.log(`[Journey 3] Found ${qCount} questions in exercise...`);

    if (qCount > 0) {
      for (let i = 0; i < qCount; i++) {
        const card = questionCards.nth(i);
        const textInput = card.locator('input[placeholder="Nhập câu trả lời vào đây..."]');
        if ((await textInput.count()) > 0) {
          await textInput.fill(i === 0 ? "She's taking a picture" : "is eating");
        } else {
          const optionBtn = card.locator("button").first();
          if ((await optionBtn.count()) > 0) {
            await optionBtn.click();
          }
        }
      }
    } else {
      // Fallback: fill any text inputs or option buttons
      const practiceInputs = page.locator('input[placeholder="Nhập câu trả lời vào đây..."]');
      const pCount = await practiceInputs.count();
      for (let i = 0; i < pCount; i++) {
        await practiceInputs.nth(i).fill(i === 0 ? "She's taking a picture" : "is eating");
      }
    }

    // Submit Exercise
    await page.getByRole("button", { name: /nộp bài & chấm điểm/i }).click();

    // Verify Grading Summary
    await page.getByRole("heading", { name: "Tổng Kết Buổi Học" }).waitFor();
    await page.getByText("Chi tiết lời giải & giải thích ngữ pháp").first().waitFor();

    // Take Artifact 4 Screenshot: Practice & Server Grading
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/04-unified-study-session-practice-and-grading.png`,
      fullPage: true,
    });
    console.log("[Screenshot] Saved 04-unified-study-session-practice-and-grading.png");

    // ─── Journey 4: Daily Learning Plan & Active Streak on Dashboard ───────
    console.log("[Journey 4] Returning to /dashboard...");
    await page.goto("http://localhost:5173/dashboard", { waitUntil: "networkidle" });

    // Verify Active Streak bar
    await page.getByText(/Chuỗi học tập/i).first().waitFor();
    await page.getByText("Kế hoạch học tập hôm nay").first().waitFor();

    // Toggle a daily plan item checkbox
    const planButtons = page.locator('button[title="Đánh dấu đã xong"]');
    if ((await planButtons.count()) > 0) {
      console.log("[Journey 4] Toggling Daily Plan Item status...");
      await planButtons.first().click();
      await page.waitForTimeout(1000);
    }

    // Take Artifact 5 Screenshot: Daily Plan on Dashboard
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/05-daily-plan-dashboard.png`,
      fullPage: true,
    });
    console.log("[Screenshot] Saved 05-daily-plan-dashboard.png");

    // ─── Journey 5: Spaced Repetition Review Center ───────────────────────
    console.log("[Journey 5] Navigating to /reviews...");
    await page.goto("http://localhost:5173/reviews", { waitUntil: "networkidle" });
    await page.getByText(/Trung tâm Ôn tập/i).first().waitFor();

    // ─── Journey 6: Responsive Mobile UX at 375×812 ────────────────────────
    console.log("[Journey 6] Testing mobile viewport at 375x812...");
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("http://localhost:5173/dashboard", { waitUntil: "networkidle" });

    // Check for horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    console.log(`[Journey 6] Horizontal overflow detected: ${hasHorizontalOverflow}`);
    assert.equal(hasHorizontalOverflow, false, "Dashboard must NOT have horizontal overflow on mobile");

    // Take Artifact 6 Screenshot: Mobile Responsive Viewport
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/06-mobile-responsive-375x812.png`,
      fullPage: true,
    });
    console.log("[Screenshot] Saved 06-mobile-responsive-375x812.png");

    console.log("\n=======================================================");
    console.log("   ALL 6 PHASE 3.3 USER JOURNEYS VERIFIED SUCCESSFULLY!   ");
    console.log("=======================================================\n");
  } finally {
    if (browser) await browser.close();
    backendProc.kill("SIGKILL");
    frontendProc.kill("SIGKILL");
    freePort(4100);
    freePort(5173);
    await cleanupUser(email);
  }
}

run()
  .then(() => {
    console.log("[E2E Run] Completed successfully with exit code 0.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("[E2E Run] Error during browser verification:", err);
    process.exit(1);
  });
