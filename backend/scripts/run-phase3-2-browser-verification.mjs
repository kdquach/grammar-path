import { chromium } from "/Users/kd.quach03/Documents/grammarpath-app/frontend/node_modules/playwright/index.mjs";
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import dotenv from "/Users/kd.quach03/Documents/grammarpath-app/backend/node_modules/dotenv/lib/main.js";
import assert from "node:assert/strict";

const APP_DIR = "/Users/kd.quach03/Documents/grammarpath-app";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = `${APP_DIR}/reports/phase-3.2/artifacts`;

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
  const email = `phase32-e2e-${ts}@grammarpath.local`;
  const password = "MasteryBrowserE2e123!";
  const displayName = "Mastery Engine Tester";

  console.log("Preparing ports :4100 and :5173...");
  freePort(4100);
  freePort(5173);

  console.log("Starting staging backend on :4100 and frontend on :5173...");
  const backendProc = spawn(
    "node",
    ["dist/src/server.js"],
    {
      cwd: `${APP_DIR}/backend`,
      env: { ...process.env, ...stagingEnv, PORT: "4100" },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  backendProc.stdout.on("data", (d) => process.stdout.write(`[backend stdout] ${d}`));
  backendProc.stderr.on("data", (d) => process.stderr.write(`[backend stderr] ${d}`));

  const frontendProc = spawn(
    "./node_modules/.bin/vite",
    ["--port", "5173", "--strictPort"],
    {
      cwd: `${APP_DIR}/frontend`,
      env: { ...process.env, VITE_API_BASE_URL: "http://localhost:4100" },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  frontendProc.stdout.on("data", (d) => process.stdout.write(`[frontend stdout] ${d}`));
  frontendProc.stderr.on("data", (d) => process.stderr.write(`[frontend stderr] ${d}`));

  let browser;
  const consoleErrors = [];
  const pageErrors = [];
  const failed5xx = [];

  try {
    await waitForUrl("http://localhost:4100/api/v1/health", 30000);
    await waitForUrl("http://localhost:5173/", 30000);
    console.log("Servers ready.");

    browser = await chromium.launch({
      executablePath: CHROME_PATH,
      headless: true,
    });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (!text.includes("React Router Future Flag Warning")) {
          consoleErrors.push(text);
        }
      }
    });
    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });
    page.on("response", (res) => {
      if (res.status() >= 500) {
        failed5xx.push(`${res.status()} ${res.url()}`);
      }
    });

    // 1. Visit /dashboard & register brand new user
    console.log("1. Visiting /dashboard and registering test user...");
    await page.goto("http://localhost:5173/dashboard", { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /learning dashboard/i }).waitFor();
    const guestButton = page.getByRole("button", { name: /sign in \/ create account/i });
    assert.ok(await guestButton.isVisible(), "Guest callout button should be visible");

    await guestButton.click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await dialog.getByRole("button", { name: /^create account$/i }).click();
    await dialog.locator("#displayName").fill(displayName);
    await dialog.locator("#email").fill(email);
    await dialog.locator("#password").fill(password);
    await dialog.locator('button[data-testid="auth-submit-button"]').click();
    await dialog.waitFor({ state: "detached", timeout: 15000 });

    // 2. Verify Dashboard with Personalized Recommendation Banner and Mastery quick links
    console.log("2. Verifying Dashboard Mastery cards and Personalized Recommendation Banner...");
    const recCard = page.getByTestId("personalized-recommendation-card");
    await recCard.waitFor({ timeout: 15000 });
    const recText = await recCard.textContent();
    assert.ok(recText.includes("Khuyến nghị học tập cá nhân hóa"), "Recommendation banner should be visible");
    console.log(`[Dashboard] Recommendation: ${recText.slice(0, 100)}...`);

    // Verify quick pills
    await page.locator('a[href="/mastery"]').first().waitFor();
    await page.locator('a[href="/reviews"]').first().waitFor();

    // Capture Artifact 1
    const art1 = `${ARTIFACTS_DIR}/01-dashboard-mastery-and-recommendations.png`;
    await page.screenshot({ path: art1, fullPage: false });
    console.log(`[Artifact 1] Saved: ${art1}`);

    // 3. Complete Exercise 1.3 on Unit 1 to generate attempt telemetry
    console.log("3. Practicing Exercise 1.3 on Unit 1 to seed mastery evidence...");
    await page.goto("http://localhost:5173/units/1", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /exercises overview/i }).click();
    await page.getByRole("button", { name: /exercise 1\.3/i }).click();

    const inputs = page.locator('input[type="text"]');
    await inputs.nth(0).waitFor({ timeout: 15000 });
    await inputs.nth(0).fill("I'm not listening"); // 1.3-q3 correct
    await inputs.nth(1).fill("wrong e2e answer");  // 1.3-q4 wrong
    // remaining blanks left unanswered

    await page.getByRole("button", { name: /check entire exercise/i }).click();
    await page.getByText(/Exercise Evaluation Summary/i).waitFor({ timeout: 15000 });
    console.log("Exercise 1.3 submitted successfully.");
    await page.waitForTimeout(1000);

    // 4. Navigate to /mastery and verify overview
    console.log("4. Navigating to /mastery (Learning Mastery Engine)...");
    await page.goto("http://localhost:5173/mastery", { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /Độ thành thạo Ngữ pháp/i }).waitFor({ timeout: 15000 });

    // Trigger recalculation to ensure immediate consistency
    const recalcBtn = page.getByRole("button", { name: /tính lại/i });
    if (await recalcBtn.isVisible()) {
      await recalcBtn.click();
      await page.waitForTimeout(1500);
    }

    // Verify Metric grid
    await page.getByText("Mastered").first().waitFor();
    await page.getByText("Proficient").first().waitFor();
    await page.getByText("Practicing").first().waitFor();
    await page.getByText("Developing").first().waitFor();

    // Verify at least one concept card is displayed
    const conceptCards = page.locator("div.border.rounded-2xl.cursor-pointer");
    await conceptCards.first().waitFor({ timeout: 15000 });
    console.log(`Found ${await conceptCards.count()} concept card(s) on /mastery.`);

    // Test Search input
    console.log("Testing search filter on /mastery...");
    const searchInput = page.getByPlaceholder("Tìm theo tên chủ điểm...");
    await searchInput.fill("continuous");
    await page.waitForTimeout(400);
    assert.ok((await conceptCards.count()) > 0, "Filtered concept cards should be visible");
    await searchInput.clear();
    await page.waitForTimeout(400);

    // Capture Artifact 2
    const art2 = `${ARTIFACTS_DIR}/02-mastery-page-overview.png`;
    await page.screenshot({ path: art2, fullPage: false });
    console.log(`[Artifact 2] Saved: ${art2}`);

    // 5. Open Explainability Modal
    console.log("5. Opening Concept Explainability Modal...");
    await conceptCards.first().click();

    // Verify Explainability modal elements
    await page.getByText("Căn cứ xác định trạng thái").waitFor({ timeout: 10000 });
    await page.getByText("CÂU HỎI ĐỘC LẬP", { exact: true }).waitFor();
    await page.getByText("ĐÚNG / SAI", { exact: true }).waitFor();
    await page.getByText("LẦN LÀM LẠI", { exact: true }).waitFor();
    await page.getByText("ĐỘ ỔN ĐỊNH TRÍ NHỚ", { exact: true }).waitFor();
    await page.getByText("Bài học liên quan trong giáo trình").waitFor();

    // Capture Artifact 3
    const art3 = `${ARTIFACTS_DIR}/03-concept-explainability-modal.png`;
    await page.screenshot({ path: art3, fullPage: false });
    console.log(`[Artifact 3] Saved: ${art3}`);

    // Close modal
    await page.locator("button:has(svg.lucide-x)").click();
    await page.waitForTimeout(400);

    // 6. Review Center (/reviews)
    console.log("6. Preparing and navigating to Review Center (/reviews)...");

    // Make the user's review schedule due so we can test the interactive drill
    try {
      const { PrismaClient } = await import(
        "/Users/kd.quach03/Documents/grammarpath-app/backend/node_modules/@prisma/client/index.js"
      );
      const dbClient = new PrismaClient({
        datasources: { db: { url: stagingEnv.DATABASE_URL } },
      });
      const dbUser = await dbClient.user.findUnique({ where: { email } });
      if (dbUser) {
        await dbClient.conceptReviewSchedule.updateMany({
          where: { userId: dbUser.id },
          data: {
            dueAt: new Date(Date.now() - 3600000), // 1 hour ago
            reviewState: "due",
          },
        });
        console.log("[Review Center] Set schedule to DUE for interactive drill verification.");
      }
      await dbClient.$disconnect();
    } catch (e) {
      console.warn("Could not set schedule to due:", e.message);
    }

    await page.goto("http://localhost:5173/reviews", { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /Trung tâm Ôn tập Ngắt quãng/i }).waitFor({ timeout: 15000 });

    // Verify sections
    await page.getByText("Lịch ôn tập sắp tới").waitFor();

    // Start interactive drill
    const dueButton = page.getByRole("button", { name: /Ôn tập ngay/i }).first();
    await dueButton.waitFor({ timeout: 10000 });
    console.log("Starting interactive review drill...");
    await dueButton.click();

    await page.getByText("Spaced Repetition Drill").waitFor({ timeout: 10000 });
    const drillInput = page.getByPlaceholder("Nhập câu trả lời của bạn...").first();
    await drillInput.fill("is learning");

    // Capture Artifact 4: Review drill in progress
    const art4 = `${ARTIFACTS_DIR}/04-review-center-drill.png`;
    await page.screenshot({ path: art4, fullPage: false });
    console.log(`[Artifact 4] Saved: ${art4}`);

    // Submit review drill
    await page.getByRole("button", { name: /Nộp bài & Cập nhật lịch/i }).click();
    await page.getByText(/Hoàn thành/i).waitFor({ timeout: 10000 });
    await page.getByRole("button", { name: /Xác nhận & Đóng/i }).click();
    await page.waitForTimeout(500);

    // 7. Mobile Viewport Responsiveness Test
    console.log("7. Testing mobile viewport responsiveness (375x812)...");
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("http://localhost:5173/mastery", { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /Độ thành thạo Ngữ pháp/i }).waitFor({ timeout: 15000 });

    const mobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    assert.equal(mobileOverflow, false, "Mobile viewport must not have horizontal overflow");

    // Capture Artifact 5
    const art5 = `${ARTIFACTS_DIR}/05-mobile-responsive-mastery.png`;
    await page.screenshot({ path: art5, fullPage: false });
    console.log(`[Artifact 5] Saved: ${art5}`);

    // 8. Assert error logs
    console.log("8. Checking error logs...");
    console.log(`Console errors: ${consoleErrors.length}`);
    console.log(`Page errors: ${pageErrors.length}`);
    console.log(`5xx errors: ${failed5xx.length}`);

    assert.equal(failed5xx.length, 0, `Unexpected 5xx errors: ${failed5xx.join(", ")}`);
    assert.equal(pageErrors.length, 0, `Unexpected page errors: ${pageErrors.join(", ")}`);

    console.log("[PASS] All browser E2E scenarios executed successfully!");
  } finally {
    if (browser) await browser.close().catch(() => {});
    backendProc.kill("SIGTERM");
    frontendProc.kill("SIGTERM");
    freePort(4100);
    freePort(5173);

    // Clean up test user in database
    await cleanupUser(email);
  }
}

run()
  .then(() => {
    console.log("Browser verification finished with code 0.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Browser verification failed:", err);
    process.exit(1);
  });
