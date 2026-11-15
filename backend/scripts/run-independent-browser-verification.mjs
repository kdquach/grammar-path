import { chromium } from "/Users/kd.quach03/Documents/grammarpath-app/frontend/node_modules/playwright/index.mjs";
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import dotenv from "/Users/kd.quach03/Documents/grammarpath-app/backend/node_modules/dotenv/lib/main.js";
import assert from "node:assert/strict";

const APP_DIR = "/Users/kd.quach03/Documents/grammarpath-app";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ARTIFACTS_DIR = `${APP_DIR}/reports/phase-3.1/artifacts`;

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

async function run() {
  const ts = Date.now();
  const email = `audit-p31-e2e-${ts}@grammarpath.local`;
  const password = "BrowserE2ePassword123!";
  const displayName = "Independent QA Auditor";

  console.log("Preparing ports :4100 and :5173...");
  freePort(4100);
  freePort(5173);

  console.log("Starting staging backend on :4100 and frontend dev on :5173...");
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
        consoleErrors.push(msg.text());
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

    // 1. Signed-out /dashboard access test
    console.log("1. Verifying signed-out /dashboard access...");
    await page.goto("http://localhost:5173/dashboard", { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /learning dashboard/i }).waitFor();
    const guestButton = page.getByRole("button", { name: /sign in \/ create account/i });
    assert.ok(await guestButton.isVisible(), "Guest callout button should be visible");

    // 2. Register brand new user from AuthModal
    console.log("2. Registering brand new test user...");
    await guestButton.click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    await dialog.getByRole("button", { name: /^create account$/i }).click();
    await dialog.locator("#displayName").fill(displayName);
    await dialog.locator("#email").fill(email);
    await dialog.locator("#password").fill(password);
    await dialog.locator('button[data-testid="auth-submit-button"]').click();
    await dialog.waitFor({ state: "detached", timeout: 15000 });

    // 3. Verify Empty Dashboard state (shows '—', never 0% accuracy)
    console.log("3. Verifying empty dashboard state...");
    const accCard = page.getByTestId("dashboard-accuracy-card");
    await accCard.waitFor({ timeout: 15000 });
    const emptyAccText = await accCard.textContent();
    assert.ok(emptyAccText.includes("—"), `Expected '—' in empty accuracy card, got: ${emptyAccText}`);
    assert.ok(emptyAccText.includes("No evaluated answers yet"));
    assert.ok(!emptyAccText.includes("0%"), "Must NOT display 0% accuracy when 0 evaluated");
    await page.screenshot({ path: `${ARTIFACTS_DIR}/01-dashboard-empty-state.png` });

    // Check desktop horizontal overflow on /dashboard
    const dashDesktopOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    assert.equal(dashDesktopOverflow, false, "Dashboard has horizontal overflow on desktop");

    // 4. Partial Exercise Submission (Exercise 1.3: 1 correct, 1 wrong, 6 skipped)
    console.log("4. Performing partial exercise submission on Exercise 1.3...");
    await page.goto("http://localhost:5173/units/1", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /exercises overview/i }).click();
    await page.getByRole("button", { name: /exercise 1\.3/i }).click();

    const inputs = page.locator('input[type="text"]');
    await inputs.nth(0).waitFor();
    await inputs.nth(0).fill("I'm not listening"); // 1.3-q3 correct
    await inputs.nth(1).fill("wrong e2e answer");  // 1.3-q4 wrong
    // remaining 6 blanks intentionally left empty

    await page.getByRole("button", { name: /check entire exercise/i }).click();
    await page.getByText(/Exercise Evaluation Summary/i).waitFor({ timeout: 15000 });

    // 5. Reload Persistence: confirm restored states distinguish Correct / Incorrect / Unanswered
    console.log("5. Testing reload persistence and restored unanswered badges...");
    await page.reload({ waitUntil: "networkidle" });
    await page.getByRole("button", { name: /exercises overview/i }).click();
    await page.getByRole("button", { name: /exercise 1\.3/i }).click();
    await page.getByText(/Unanswered/i).first().waitFor({ timeout: 15000 });
    const skippedCountBadges = await page.getByText(/^Unanswered$/).count();
    assert.equal(skippedCountBadges, 6, `Expected 6 Unanswered badges after reload, got ${skippedCountBadges}`);
    await page.screenshot({ path: `${ARTIFACTS_DIR}/02-exercise-restored-unanswered.png` });

    // 6. Dashboard accuracy calculation (1/2 = 50.0% accuracy, 6 skipped)
    console.log("6. Verifying dashboard accuracy calculation and 14-day activity chart...");
    await page.goto("http://localhost:5173/dashboard", { waitUntil: "networkidle" });
    await page.getByTestId("dashboard-accuracy-card").waitFor({ timeout: 15000 });
    const afterPartialText = await page.getByTestId("dashboard-accuracy-card").textContent();
    assert.ok(afterPartialText.includes("50%"), `Expected 50% accuracy after 1 right / 1 wrong / 6 skipped, got: ${afterPartialText}`);
    assert.ok(afterPartialText.includes("6"), "Expected 6 skipped displayed");
    assert.ok(await page.getByRole("img", { name: /14-day study activity bar chart/i }).isVisible());

    // 7. /progress page agreement: distinguishes answered & skipped on recent attempt
    console.log("7. Verifying /progress page agreement...");
    await page.goto("http://localhost:5173/progress", { waitUntil: "networkidle" });
    await page.getByText(/\(2 answered, 6 skipped\)/i).waitFor({ timeout: 15000 });

    // 8. Mistake Retry on /mistakes: retry 1.3-q4 with "She's having" -> resolved
    console.log("8. Verifying mistake retry remediation...");
    await page.goto("http://localhost:5173/mistakes", { waitUntil: "networkidle" });
    const mistakeInput = page.locator('div.space-y-4 input[type="text"]').first();
    await mistakeInput.waitFor({ timeout: 15000 });
    await mistakeInput.fill("She's having");
    await page.getByRole("button", { name: /check correction/i }).click();
    await page.getByText(/resolved! cleared from mistakes list/i).waitFor({ timeout: 15000 });

    // 9. Dashboard reflection after retry (2/3 = 66.7% accuracy, 0 mistakes)
    console.log("9. Verifying dashboard reflection after mistake retry...");
    await page.goto("http://localhost:5173/dashboard", { waitUntil: "networkidle" });
    await page.getByTestId("dashboard-accuracy-card").waitFor({ timeout: 15000 });
    const afterRetryText = await page.getByTestId("dashboard-accuracy-card").textContent();
    assert.ok(afterRetryText.includes("66.7%"), `Expected 66.7% accuracy after mistake retry, got: ${afterRetryText}`);
    assert.ok(afterRetryText.includes("Mistake Retry: 1"), "Expected Mistake Retry source badge");
    await page.screenshot({ path: `${ARTIFACTS_DIR}/03-dashboard-after-partial-and-retry.png` });

    // 10. TOEIC drill navigation, Part 5 filter, and answer check
    console.log("10. Verifying TOEIC drill navigation and practice modal...");
    await page.goto("http://localhost:5173/roadmap", { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Part 5", exact: true }).click();
    await page.getByRole("button", { name: /luyện 5 câu toeic part 5/i }).first().click();
    const toeicDialog = page.getByRole("dialog");
    await toeicDialog.waitFor({ timeout: 20000 });
    await toeicDialog.getByText(/Chọn đáp án chính xác/i).waitFor({ timeout: 25000 });
    await page.screenshot({ path: `${ARTIFACTS_DIR}/04-toeic-drill.png` });
    await toeicDialog.locator("div.grid button").first().click();
    await toeicDialog.getByRole("button", { name: /kiểm tra đáp án/i }).click();
    await toeicDialog.getByText(/Đáp án đúng là/i).waitFor({ timeout: 20000 });
    await toeicDialog.getByRole("button", { name: "Đóng" }).first().click();
    await toeicDialog.waitFor({ state: "detached", timeout: 15000 });

    await page.goto("http://localhost:5173/dashboard", { waitUntil: "networkidle" });
    await page.getByTestId("dashboard-accuracy-card").waitFor({ timeout: 15000 });
    await page.getByText(/TOEIC Drill/i).first().waitFor({ timeout: 15000 });

    // 11. Mobile 375x812 responsive viewport check
    console.log("11. Verifying mobile viewport responsiveness (375x812)...");
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("http://localhost:5173/dashboard", { waitUntil: "networkidle" });
    const dashMobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    assert.equal(dashMobileOverflow, false, "Dashboard has horizontal overflow on 375px mobile");
    await page.screenshot({ path: `${ARTIFACTS_DIR}/05-dashboard-mobile-responsive.png` });

    await page.goto("http://localhost:5173/roadmap", { waitUntil: "networkidle" });
    const roadmapMobileOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    assert.equal(roadmapMobileOverflow, false, "Roadmap has horizontal overflow on 375px mobile");

    // 12. Errors and 5xx assertions
    assert.deepEqual(consoleErrors, [], `Console errors observed: ${consoleErrors.join(" | ")}`);
    assert.deepEqual(pageErrors, [], `Page errors observed: ${pageErrors.join(" | ")}`);
    assert.deepEqual(failed5xx, [], `5xx responses observed: ${failed5xx.join(" | ")}`);

    const summary = {
      status: "PASS",
      verifiedEmail: email,
      desktopOverflow: dashDesktopOverflow,
      mobileDashboardOverflow: dashMobileOverflow,
      mobileRoadmapOverflow: roadmapMobileOverflow,
      consoleErrorsCount: consoleErrors.length,
      pageErrorsCount: pageErrors.length,
      failed5xxCount: failed5xx.length,
      screenshotsCaptured: [
        "01-dashboard-empty-state.png",
        "02-exercise-restored-unanswered.png",
        "03-dashboard-after-partial-and-retry.png",
        "04-toeic-drill.png",
        "05-dashboard-mobile-responsive.png",
      ],
    };

    console.log("\n=== PLAYWRIGHT VERIFICATION SUMMARY ===");
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    if (browser) await browser.close();
    backendProc.kill("SIGTERM");
    frontendProc.kill("SIGTERM");

    // Clean up temporary test user
    try {
      const { PrismaClient } = await import(
        "/Users/kd.quach03/Documents/grammarpath-app/backend/node_modules/@prisma/client/index.js"
      );
      const client = new PrismaClient({
        datasources: { db: { url: stagingEnv.DATABASE_URL } },
      });
      const deleted = await client.user.deleteMany({
        where: { email: { startsWith: "audit-p31-e2e-" } },
      });
      console.log(`Cleaned up ${deleted.count} temporary audit test user(s).`);
      await client.$disconnect();
    } catch (cleanErr) {
      console.warn("Cleanup warning:", cleanErr.message);
    }

    freePort(4100);
    freePort(5173);
  }
}

run()
  .then(() => {
    console.log("PLAYWRIGHT COMPLETED SUCCESSFULLY WITH EXIT CODE 0.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("PLAYWRIGHT FAILED:", err);
    process.exit(1);
  });

