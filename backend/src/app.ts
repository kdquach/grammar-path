import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import apiV1Router from "./routes";
import { errorHandler, AppError } from "./middleware/error-handler";
import { getEnv, AppEnvConfig } from "./config/env";

export function createApp(envOverride?: AppEnvConfig): Express {
  const env = envOverride ?? getEnv();
  const app = express();

  app.disable("x-powered-by");
  // Explicit reverse-proxy hop policy: `false` (ignores forwarded headers) or bounded integer 1..10.
  // Permissive boolean `true` is never set so attacker-supplied X-Forwarded-For prefixes are ignored.
  app.set("trust proxy", env.trustProxy);

  // Security headers
  app.use(helmet());

  // Strict CORS origin allowlist (permits requests without Origin header such as curl/Supertest)
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }
        const allowedOrigins = envOverride ? envOverride.corsOrigins : getEnv().corsOrigins;
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(AppError.forbidden("Origin not allowed by CORS policy", "CORS_FORBIDDEN"));
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      optionsSuccessStatus: 204,
    })
  );

  // Bounded body parsers
  app.use(express.json({ limit: env.bodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: env.bodyLimit }));

  // Mount API v1 routes
  app.use("/api/v1", apiV1Router);

  // 404 handler for undefined routes
  app.use((req, _res, next) => {
    next(new AppError(404, "NOT_FOUND", `Cannot ${req.method} ${req.originalUrl}`));
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
