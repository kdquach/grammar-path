import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const BACKEND_ROOT = path.resolve(__dirname, "..");
const RUNNER_PATH = path.join(BACKEND_ROOT, "scripts", "run-with-staging-env.mjs");
const VALID_JWT = "staging-only-test-signing-key-with-sufficient-entropy-48chars";

function createTempStagingFile(contents: string): { dir: string; filePath: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gp-staging-guard-"));
  const filePath = path.join(dir, ".env.staging.test");
  fs.writeFileSync(filePath, contents, "utf8");
  return { dir, filePath };
}

describe("Phase 1.7 Staging Environment Isolation & Fail-Closed Guard", () => {
  it("fails closed when backend/.env.staging is missing", () => {
    const missingPath = path.join(os.tmpdir(), `.env.staging.missing-${Date.now()}`);
    const proc = spawnSync(process.execPath, [RUNNER_PATH, "--check-only"], {
      cwd: BACKEND_ROOT,
      env: {
        PATH: process.env.PATH || "",
        STAGING_ENV_FILE: missingPath,
      },
      encoding: "utf8",
    });

    expect(proc.status).toBe(1);
    expect(proc.stderr).toContain("[Staging Isolation Guard] BLOCKED");
    expect(proc.stderr).toContain(".env.staging");
  });

  it("refuses .env, .env.local, and .example files via STAGING_ENV_FILE override", () => {
    for (const forbidden of [".env", ".env.local", ".env.staging.example"]) {
      const proc = spawnSync(process.execPath, [RUNNER_PATH, "--check-only"], {
        cwd: BACKEND_ROOT,
        env: {
          PATH: process.env.PATH || "",
          STAGING_ENV_FILE: forbidden,
        },
        encoding: "utf8",
      });

      expect(proc.status).toBe(1);
      expect(proc.stderr).toContain("Refusing STAGING_ENV_FILE");
    }
  });

  it("blocks execution when STAGING_ISOLATED_CONFIRMED is not 'true' or placeholders remain", () => {
    const unconfirmed = createTempStagingFile(
      [
        'STAGING_ISOLATED_CONFIRMED="false"',
        'DATABASE_URL="postgresql://localuser:localpass@localhost:5432/grammarpath_staging"',
        `JWT_SECRET="${VALID_JWT}"`,
      ].join("\n")
    );

    try {
      const p1 = spawnSync(process.execPath, [RUNNER_PATH, "--check-only"], {
        cwd: BACKEND_ROOT,
        env: { PATH: process.env.PATH || "", STAGING_ENV_FILE: unconfirmed.filePath },
        encoding: "utf8",
      });
      expect(p1.status).toBe(1);
      expect(p1.stderr).toContain("STAGING_ISOLATED_CONFIRMED");
    } finally {
      fs.rmSync(unconfirmed.dir, { recursive: true, force: true });
    }

    const placeholderUrl = createTempStagingFile(
      [
        'STAGING_ISOLATED_CONFIRMED="true"',
        'DATABASE_URL="postgresql://STAGING_USER:STAGING_PASSWORD@STAGING_HOST:5432/grammarpath_staging"',
        `JWT_SECRET="${VALID_JWT}"`,
      ].join("\n")
    );

    try {
      const p2 = spawnSync(process.execPath, [RUNNER_PATH, "--check-only"], {
        cwd: BACKEND_ROOT,
        env: { PATH: process.env.PATH || "", STAGING_ENV_FILE: placeholderUrl.filePath },
        encoding: "utf8",
      });
      expect(p2.status).toBe(1);
      expect(p2.stderr).toContain("placeholder");
    } finally {
      fs.rmSync(placeholderUrl.dir, { recursive: true, force: true });
    }
  });

  it("requires sslmode=require on remote *.neon.tech staging URLs and a valid staging JWT_SECRET", () => {
    const neonNoSsl = createTempStagingFile(
      [
        'STAGING_ISOLATED_CONFIRMED="true"',
        'DATABASE_URL="postgresql://stg_user:stg_pass@ep-cool-staging-123.us-east-2.aws.neon.tech/grammarpath_staging"',
        `JWT_SECRET="${VALID_JWT}"`,
      ].join("\n")
    );

    try {
      const proc = spawnSync(process.execPath, [RUNNER_PATH, "--check-only"], {
        cwd: BACKEND_ROOT,
        env: { PATH: process.env.PATH || "", STAGING_ENV_FILE: neonNoSsl.filePath },
        encoding: "utf8",
      });
      expect(proc.status).toBe(1);
      expect(proc.stderr).toContain("sslmode=require");
    } finally {
      fs.rmSync(neonNoSsl.dir, { recursive: true, force: true });
    }
  });

  it("injects only .env.staging values into child env, neutralizes inherited/fallback keys, and redacts secrets in logs", () => {
    const validStaging = createTempStagingFile(
      [
        'STAGING_ISOLATED_CONFIRMED="true"',
        'NODE_ENV="test"',
        'PORT=4199',
        'DATABASE_URL="postgresql://stg_user:topsecretpassword999@localhost:5432/grammarpath_staging"',
        `JWT_SECRET="${VALID_JWT}"`,
        'GEMINI_API_KEY=""',
      ].join("\n")
    );

    try {
      const probeScript = [
        "const payload = {",
        "  db: process.env.DATABASE_URL,",
        "  gemini: process.env.GEMINI_API_KEY,",
        "  hasGeminiProp: Object.prototype.hasOwnProperty.call(process.env, 'GEMINI_API_KEY'),",
        "  port: process.env.PORT,",
        "  flag: process.env.GRAMMARPATH_STAGING_ENV_LOADED,",
        "};",
        "console.log(JSON.stringify(payload));",
      ].join(" ");

      const proc = spawnSync(
        process.execPath,
        [RUNNER_PATH, "--", process.execPath, "-e", probeScript],
        {
          cwd: BACKEND_ROOT,
          env: {
            PATH: process.env.PATH || "",
            STAGING_ENV_FILE: validStaging.filePath,
            DATABASE_URL: "postgresql://inherited:should_be_stripped@bad-host/wrongdb",
            GEMINI_API_KEY: "inherited-should-be-stripped",
          },
          encoding: "utf8",
        }
      );

      expect(proc.status).toBe(0);
      const lines = proc.stdout.trim().split("\n");
      const guardLine = lines[0];
      expect(guardLine).toContain("target=localhost:5432/grammarpath_staging");
      // Guard log line and stderr must never echo DB password or JWT_SECRET
      expect(guardLine).not.toContain("topsecretpassword999");
      expect(guardLine).not.toContain(VALID_JWT);
      expect(proc.stderr).not.toContain("topsecretpassword999");
      expect(proc.stderr).not.toContain(VALID_JWT);

      const lastJson = JSON.parse(lines[lines.length - 1]);
      expect(lastJson.db).toBe(
        "postgresql://stg_user:topsecretpassword999@localhost:5432/grammarpath_staging"
      );
      expect(lastJson.gemini).toBe("");
      expect(lastJson.hasGeminiProp).toBe(true);
      expect(lastJson.port).toBe("4199");
      expect(lastJson.flag).toBe("1");
    } finally {
      fs.rmSync(validStaging.dir, { recursive: true, force: true });
    }
  });

  it("setup.ts pins fail-closed DATABASE_URL and empty GEMINI_API_KEY when invoked without an explicit DB env", () => {
    const setupTs = fs.readFileSync(path.join(BACKEND_ROOT, "tests", "setup.ts"), "utf8");
    expect(setupTs).toContain("127.0.0.1:1/staging_db_required");
    expect(setupTs).toContain('process.env.GEMINI_API_KEY = ""');
  });
});
