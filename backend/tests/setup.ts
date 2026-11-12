// Ephemeral Vitest test bootstrap only (never imported in src/ production builds).
if (process.env.VITEST) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
    process.env.JWT_SECRET = `vitest-ephemeral-signing-key-${process.pid}-grammarpath-test`;
  }
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "test";
  }

  // Fail closed when Vitest runs without an explicit DATABASE_URL (prevents
  // @prisma/client from silently autoloading backend/.env via schemaEnvPath).
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.trim() === "") {
    const blockedUrl = "postgresql://staging_env_required:blocked@127.0.0.1:1/staging_db_required";
    process.env.DATABASE_URL = blockedUrl;
    process.env.DIRECT_URL = blockedUrl;
    process.env.POOLED_DATABASE_URL = blockedUrl;
  }

  // Prevent Prisma/dotenv autoloaders from pulling GEMINI_API_KEY out of backend/.env
  // unless explicitly injected by the caller or staging test runner.
  if (!Object.prototype.hasOwnProperty.call(process.env, "GEMINI_API_KEY")) {
    process.env.GEMINI_API_KEY = "";
  }
}

