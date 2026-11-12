#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, "..");

const FORBIDDEN_PLACEHOLDERS = [
  "STAGING_USER",
  "STAGING_PASSWORD",
  "STAGING_HOST",
  "STAGING_POOLER_HOST",
  "REPLACE_WITH_",
  "ep-staging-example",
  "postgresql://user:password@host/",
];

const KNOWN_PLACEHOLDER_SECRETS = new Set([
  "your-super-secret-jwt-key-change-in-production",
  "grammarpath-dev-jwt-super-secret-key-32chars-minimum-2026",
  "changeme",
  "secret",
  "dev-secret",
  "jwt-secret",
  "default-secret",
  "replace-me",
]);

function fail(message) {
  console.error(`[Staging Isolation Guard] BLOCKED: ${message}`);
  process.exit(1);
}

function resolveStagingEnvPath() {
  const override = process.env.STAGING_ENV_FILE?.trim();
  if (!override) {
    return path.join(BACKEND_ROOT, ".env.staging");
  }
  const resolved = path.resolve(BACKEND_ROOT, override);
  const base = path.basename(resolved);
  if (
    base === ".env" ||
    base === ".env.local" ||
    base.startsWith(".env.prod") ||
    base.endsWith(".example") ||
    !(base === ".env.staging" || base.startsWith(".env.staging."))
  ) {
    fail(
      `Refusing STAGING_ENV_FILE='${base}'. Only '.env.staging' (never '.env', '.env.local', production files, or '.example' templates) is permitted.`
    );
  }
  return resolved;
}

function containsPlaceholder(value) {
  return FORBIDDEN_PLACEHOLDERS.some((marker) => value.includes(marker));
}

function validateStagingDatabaseUrl(rawUrl, varName) {
  if (!rawUrl || rawUrl.trim() === "") {
    fail(`${varName} is missing or empty in .env.staging.`);
  }
  if (containsPlaceholder(rawUrl)) {
    fail(`${varName} still contains template placeholder text.`);
  }

  let parsed;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    fail(`${varName} is not a valid URL.`);
  }

  if (parsed.protocol !== "postgresql:" && parsed.protocol !== "postgres:") {
    fail(`${varName} must use postgresql:// or postgres:// protocol.`);
  }
  if (!parsed.hostname || parsed.pathname.length <= 1) {
    fail(`${varName} must specify a hostname and target database name.`);
  }
  if (
    parsed.hostname.endsWith(".neon.tech") &&
    parsed.searchParams.get("sslmode") !== "require"
  ) {
    fail(`${varName} targeting *.neon.tech must specify sslmode=require.`);
  }

  return parsed;
}

function main() {
  const rawArgs = process.argv.slice(2);
  const checkOnly = rawArgs.includes("--check-only");
  const separatorIndex = rawArgs.indexOf("--");
  const commandArgs =
    separatorIndex >= 0
      ? rawArgs.slice(separatorIndex + 1)
      : rawArgs.filter((arg) => arg !== "--check-only");

  if (!checkOnly && commandArgs.length === 0) {
    fail(
      "Usage: node scripts/run-with-staging-env.mjs [--check-only] -- <command> [args...]"
    );
  }

  const stagingEnvPath = resolveStagingEnvPath();
  if (!fs.existsSync(stagingEnvPath)) {
    fail(
      `Missing ${stagingEnvPath}. Copy backend/.env.staging.example to backend/.env.staging, configure an isolated staging database (NEVER production Neon), and set STAGING_ISOLATED_CONFIRMED="true".`
    );
  }

  const parsedEnv = dotenv.parse(fs.readFileSync(stagingEnvPath, "utf8"));

  if ((parsedEnv.STAGING_ISOLATED_CONFIRMED || "").trim().toLowerCase() !== "true") {
    fail(
      'STAGING_ISOLATED_CONFIRMED must be set to "true" in .env.staging after verifying the target database is an isolated staging instance.'
    );
  }

  const dbUrlParsed = validateStagingDatabaseUrl(parsedEnv.DATABASE_URL, "DATABASE_URL");
  if (parsedEnv.DIRECT_URL && parsedEnv.DIRECT_URL.trim() !== "") {
    validateStagingDatabaseUrl(parsedEnv.DIRECT_URL, "DIRECT_URL");
  }
  if (parsedEnv.POOLED_DATABASE_URL && parsedEnv.POOLED_DATABASE_URL.trim() !== "") {
    validateStagingDatabaseUrl(parsedEnv.POOLED_DATABASE_URL, "POOLED_DATABASE_URL");
  }

  const jwtSecret = (parsedEnv.JWT_SECRET || "").trim();
  if (jwtSecret.length < 32 || containsPlaceholder(jwtSecret) || KNOWN_PLACEHOLDER_SECRETS.has(jwtSecret.toLowerCase())) {
    fail(
      "JWT_SECRET in .env.staging must be a dedicated >=32-character non-placeholder staging secret."
    );
  }

  const sanitizedDbTarget = `${dbUrlParsed.hostname}:${dbUrlParsed.port || "5432"}${dbUrlParsed.pathname}`;
  console.log(
    `[Staging Isolation Guard] Verified ${path.basename(stagingEnvPath)} -> target=${sanitizedDbTarget}`
  );

  if (checkOnly) {
    process.exit(0);
  }

  // Strip inherited sensitive vars before applying explicit .env.staging values.
  // Explicitly define empty-string sentinels for optional keys so dotenv/Prisma
  // cannot fall back to backend/.env.
  const childEnv = { ...process.env };
  const managedKeys = [
    "DATABASE_URL",
    "DIRECT_URL",
    "POOLED_DATABASE_URL",
    "JWT_SECRET",
    "JWT_EXPIRES_IN",
    "NODE_ENV",
    "PORT",
    "CORS_ORIGIN",
    "BODY_LIMIT",
    "TRUST_PROXY",
    "RATE_LIMIT_WINDOW_MS",
    "RATE_LIMIT_AUTH_MAX",
    "RATE_LIMIT_AI_MAX",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
  ];
  for (const key of managedKeys) {
    delete childEnv[key];
  }

  childEnv.DATABASE_URL = parsedEnv.DATABASE_URL.trim();
  childEnv.DIRECT_URL = (parsedEnv.DIRECT_URL || parsedEnv.DATABASE_URL).trim();
  childEnv.POOLED_DATABASE_URL = (parsedEnv.POOLED_DATABASE_URL || parsedEnv.DATABASE_URL).trim();
  childEnv.JWT_SECRET = jwtSecret;
  childEnv.JWT_EXPIRES_IN = (parsedEnv.JWT_EXPIRES_IN || "7d").trim();
  childEnv.NODE_ENV = (parsedEnv.NODE_ENV || "test").trim();
  childEnv.PORT = (parsedEnv.PORT || "4100").trim();
  childEnv.CORS_ORIGIN = (parsedEnv.CORS_ORIGIN || "http://localhost:5173").trim();
  childEnv.BODY_LIMIT = (parsedEnv.BODY_LIMIT || "100kb").trim();
  childEnv.TRUST_PROXY = (parsedEnv.TRUST_PROXY || "false").trim();
  childEnv.RATE_LIMIT_WINDOW_MS = (parsedEnv.RATE_LIMIT_WINDOW_MS || "900000").trim();
  childEnv.RATE_LIMIT_AUTH_MAX = (parsedEnv.RATE_LIMIT_AUTH_MAX || "15").trim();
  childEnv.RATE_LIMIT_AI_MAX = (parsedEnv.RATE_LIMIT_AI_MAX || "20").trim();
  childEnv.GEMINI_API_KEY = (parsedEnv.GEMINI_API_KEY || "").trim();
  childEnv.GEMINI_MODEL = (parsedEnv.GEMINI_MODEL || "").trim();
  childEnv.STAGING_ISOLATED_CONFIRMED = "true";
  childEnv.GRAMMARPATH_STAGING_ENV_LOADED = "1";

  const [cmd, ...args] = commandArgs;
  const result = spawnSync(cmd, args, {
    cwd: BACKEND_ROOT,
    env: childEnv,
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.error(`[Staging Isolation Guard] Failed to spawn '${cmd}': ${result.error.message}`);
    process.exit(1);
  }
  process.exit(result.status ?? 1);
}

main();

