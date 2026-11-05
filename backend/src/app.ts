import express, { Express } from "express";
import cors from "cors";
import apiV1Router from "./routes";
import { errorHandler, AppError } from "./middleware/error-handler";

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

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

