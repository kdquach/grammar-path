// Ephemeral Vitest test bootstrap only (never imported in src/ production builds).
if (process.env.VITEST) {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length < 32) {
    process.env.JWT_SECRET = `vitest-ephemeral-signing-key-${process.pid}-grammarpath-test`;
  }
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = "test";
  }
}

