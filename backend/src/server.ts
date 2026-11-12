import dotenv from "dotenv";
dotenv.config();

import { validateEnv, AppEnvConfig } from "./config/env";

let env: AppEnvConfig;
try {
  env = validateEnv(process.env);
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Invalid environment configuration";
  console.error(`[GrammarPath API] Startup aborted: ${message}`);
  process.exit(1);
}

// Import app and database client only after environment validation succeeds
import prisma from "./lib/prisma";
import { createApp } from "./app";

const app = createApp(env);

const server = app.listen(env.port, () => {
  console.log(`[GrammarPath API] Server listening on http://localhost:${env.port}`);
  console.log(`[GrammarPath API] Environment: ${env.nodeEnv}`);
  console.log(
    `[GrammarPath API] CORS allowlist count: ${env.corsOrigins.length}, Body limit: ${env.bodyLimit}, Trust proxy: ${env.trustProxy}`
  );
});

const shutdown = async (signal: string) => {
  console.log(`[GrammarPath API] Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log("[GrammarPath API] HTTP server and Prisma client disconnected.");
    process.exit(0);
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
