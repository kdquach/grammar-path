import { chromium } from "/Users/kd.quach03/Documents/grammarpath-app/frontend/node_modules/playwright/index.mjs";
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import dotenv from "/Users/kd.quach03/Documents/grammarpath-app/backend/node_modules/dotenv/lib/main.js";
import assert from "node:assert/strict";

const APP_DIR = "/Users/kd.quach03/Documents/grammarpath-app";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = `${APP_DIR}/reports/phase-3.4/artifacts`;

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
    const stdout = execSync(`lsof -ti :${port} -sTCP:LISTEN 2>/dev/null || true`, { encoding: "utf-8" }).trim();
    if (stdout) {
      const pids = stdout.split("\n").filter(Boolean);
      for (const pid of pids) {
        const numPid = Number(pid);
        if (numPid === process.pid) continue;
        try {
          process.kill(numPid, "SIGKILL");
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
  const emailA = `phase34a-userA-${ts}@grammarpath.local`;
  const emailB = `phase34a-userB-${ts}@grammarpath.local`;
  const password = "Phase34aSecurity123!";
  const displayNameA = "Phase34A Tester A";
  const displayNameB = "Phase34A Tester B";

  console.log("Preparing ports :4100 and :5173...");
  freePort(4100);
  freePort(5173);

  console.log("Building backend and frontend...");
  execSync("npm run build", { cwd: `${APP_DIR}/backend`, stdio: "inherit" });
  execSync("npm run build", { cwd: `${APP_DIR}/frontend`, stdio: "inherit" });

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
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.error(`[Browser Console Error] ${msg.text()}`);
        consoleErrors.push(msg.text());
      }
    });

    page.on("pageerror", (err) => {
      console.error(`[Browser Page Error] ${err.message}`);
      pageErrors.push(err.message);
    });

    // ─── Journey 1: Registration of User A ────────────────────────────────────
    console.log("\n--- Journey 1: Register User A ---");
    await page.goto("http://localhost:5173/");
    await page.waitForLoadState("networkidle");

    const authResA = await fetch("http://localhost:4100/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailA, password, displayName: displayNameA }),
    });
    assert.equal(authResA.status, 201, "User A registration failed");
    const authDataA = await authResA.json();
    const tokenA = authDataA.data.token;
    const userIdA = authDataA.data.user.id;
    console.log(`User A registered successfully: ${userIdA}`);

    // Register User B for IDOR testing
    const authResB = await fetch("http://localhost:4100/api/v1/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: emailB, password, displayName: displayNameB }),
    });
    assert.equal(authResB.status, 201, "User B registration failed");
    const authDataB = await authResB.json();
    const tokenB = authDataB.data.token;
    const userIdB = authDataB.data.user.id;
    console.log(`User B registered successfully: ${userIdB}`);

    // Set auth token in localStorage for User A
    await page.evaluate((tok) => {
      localStorage.setItem("grammarpath_token", tok);
    }, tokenA);

    // ─── Journey 2: Seed Due Review Schedule on Staging ───────────────────────
    console.log("\n--- Journey 2: Seed Due Review for User A ---");
    const { PrismaClient } = await import(
      "/Users/kd.quach03/Documents/grammarpath-app/backend/node_modules/@prisma/client/index.js"
    );
    const dbClient = new PrismaClient({
      datasources: { db: { url: stagingEnv.DATABASE_URL } },
    });

    const concept1 = await dbClient.grammarConcept.findFirst({
      where: { code: "unit.001" },
    });
    assert(concept1, "Concept unit.001 must exist in database");

    const dueScheduleA = await dbClient.conceptReviewSchedule.create({
      data: {
        userId: userIdA,
        conceptId: concept1.id,
        stabilityDays: 2.0,
        intervalDays: 2,
        reviewCount: 1,
        consecutiveCorrect: 1,
        reviewState: "due",
        dueAt: new Date(Date.now() - 3600000), // 1 hour ago (overdue)
      },
    });
    console.log(`Seeded due review schedule: ${dueScheduleA.id}`);

    // ─── Journey 3: Navigate to Review Center & Complete with Correct Answer ──
    console.log("\n--- Journey 3: Interactive Review Center (Correct Answer) ---");
    await page.goto("http://localhost:5173/reviews");
    await page.waitForLoadState("networkidle");

    // Verify due concept is visible
    await page.waitForSelector("text=Present continuous", { timeout: 10000 });
    console.log("Due review card rendered on Review Center page.");

    // Click 'Ôn tập ngay' to open modal
    const startReviewBtn = await page.waitForSelector("button:has-text('Ôn tập ngay')", {
      timeout: 10000,
    });
    await startReviewBtn.click();
    await page.waitForSelector("text=Spaced Repetition Drill", { timeout: 10000 });
    console.log("Drill modal opened.");

    // Fill in inputs
    const inputs = await page.$$("input[placeholder='Nhập câu trả lời của bạn...']");
    console.log(`Found ${inputs.length} question input fields.`);
    assert(inputs.length > 0, "Must have at least one practice question");

    // Fetch the practice questions to know the correct answer
    const dueReviewsRes = await fetch("http://localhost:4100/api/v1/reviews/due", {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const dueReviewsData = await dueReviewsRes.json();
    const practiceQuestions = dueReviewsData.data.items[0].practiceQuestions;
    const firstPracticeQ = practiceQuestions[0];

    // Fill all inputs with real correct answers from DB
    for (let i = 0; i < practiceQuestions.length && i < inputs.length; i++) {
      const q = practiceQuestions[i];
      const dbQ = await dbClient.question.findUnique({
        where: { id: q.id },
        include: { answerKey: true, acceptedAnswers: true },
      });
      const realCorrectAnswer = dbQ?.correctAnswerText || dbQ?.answerKey?.answerText || "am doing";
      console.log(`Question ${i + 1}: "${q.questionContent}" -> Expected: "${realCorrectAnswer}"`);
      await inputs[i].fill(realCorrectAnswer);
    }

    // Submit review drill
    const submitBtn = await page.waitForSelector("button:has-text('Nộp bài & Cập nhật lịch')");
    await submitBtn.click();

    // Verify feedback appears
    await page.waitForSelector("text=Hoàn thành xuất sắc!", { timeout: 10000 });
    console.log("Server feedback rendered: 'Hoàn thành xuất sắc!'");

    // Take screenshot of success feedback
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/phase3-4a-01-correct-review.png`,
      fullPage: true,
    });
    console.log("Saved artifact: phase3-4a-01-correct-review.png");

    // Close review modal
    const closeBtn = await page.waitForSelector("button:has-text('Xác nhận & Đóng')");
    await closeBtn.click();
    await page.waitForTimeout(1000);

    // Verify schedule was updated in DB
    const updatedScheduleA = await dbClient.conceptReviewSchedule.findUnique({
      where: { id: dueScheduleA.id },
    });
    assert.equal(updatedScheduleA.stabilityDays, 4.0, "Stability must double to 4.0");
    console.log(`Verified DB: Stability days expanded to ${updatedScheduleA.stabilityDays}`);

    // ─── Journey 4: Tampered Payload Neutralization ────────────────────────────
    console.log("\n--- Journey 4: Verify Tampered Client Payload is Ignored ---");
    const tamperedPayload = {
      scheduleId: dueScheduleA.id,
      answers: {
        [firstPracticeQ.id]: "blatantly incorrect answer 999",
      },
      isCorrect: true, // Tampered field
      correctCount: 99, // Tampered field
      accuracy: 100, // Tampered field
    };

    const tamperRes = await page.evaluate(
      async ({ token, conceptId, payload }) => {
        const r = await fetch(`http://localhost:4100/api/v1/reviews/${conceptId}/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        return { status: r.status, data: await r.json() };
      },
      { token: tokenA, conceptId: concept1.id, payload: tamperedPayload }
    );

    assert.equal(tamperRes.status, 200, "Request should succeed");
    assert.equal(tamperRes.data.data.accuracy, 0, "Server must evaluate accuracy as 0%");
    assert.equal(tamperRes.data.data.correctCount, 0, "Server must evaluate correctCount as 0");
    assert.equal(tamperRes.data.data.status, "reinforcement_needed");
    assert.equal(tamperRes.data.data.results[0].isCorrect, false);
    console.log("Verified: Client-supplied isCorrect: true & correctCount: 99 were completely neutralized.");

    // Verify DB attempt item recorded as incorrect
    const latestAttemptItem = await dbClient.questionAttemptItem.findFirst({
      where: { userId: userIdA, questionId: firstPracticeQ.id },
      orderBy: { createdAt: "desc" },
    });
    assert.equal(latestAttemptItem.isCorrect, false, "DB record must be isCorrect: false");
    assert.equal(latestAttemptItem.attemptStatus, "incorrect");
    console.log("Verified DB: questionAttemptItem has isCorrect: false and status: incorrect.");

    // ─── Journey 5: Cross-User IDOR Defense ───────────────────────────────────
    console.log("\n--- Journey 5: Verify Cross-User IDOR is Blocked (403 Forbidden) ---");
    const rawIdorRes = await fetch(`http://localhost:4100/api/v1/reviews/${concept1.id}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenB}`, // User B!
      },
      body: JSON.stringify({
        scheduleId: dueScheduleA.id, // User A's schedule!
        answers: { [firstPracticeQ.id]: "test" },
      }),
    });
    const idorData = await rawIdorRes.json();

    assert.equal(rawIdorRes.status, 403, "Must return 403 Forbidden on IDOR");
    assert.equal(idorData.error.code, "FORBIDDEN");
    console.log("Verified: User B was blocked with 403 FORBIDDEN when attempting to complete User A's review schedule.");

    // ─── Journey 6: Schedule Consistency & Deduplication ─────────────────────
    console.log("\n--- Journey 6: Reload & Consistency Verification ---");
    await page.goto("http://localhost:5173/reviews");
    await page.waitForLoadState("networkidle");

    // Take screenshot of updated review center
    await page.screenshot({
      path: `${ARTIFACTS_DIR}/phase3-4a-02-schedule-consistent.png`,
      fullPage: true,
    });
    console.log("Saved artifact: phase3-4a-02-schedule-consistent.png");

    await dbClient.$disconnect();
    console.log("\nAll 6 browser verification journeys PASSED successfully.");
  } finally {
    if (browser) await browser.close();
    freePort(4100);
    freePort(5173);
    backendProc.kill();
    frontendProc.kill();

    // Clean up temporary test users from staging
    await cleanupUser(emailA);
    await cleanupUser(emailB);
  }

  assert.equal(consoleErrors.length, 0, `Expected 0 console errors, got: ${consoleErrors.join("; ")}`);
  assert.equal(pageErrors.length, 0, `Expected 0 page errors, got: ${pageErrors.join("; ")}`);
}

run()
  .then(() => {
    console.log("[E2E Run] Completed successfully with exit code 0.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("FATAL BROWSER VERIFICATION ERROR:", err);
    process.exit(1);
  });

