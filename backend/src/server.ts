import dotenv from "dotenv";
dotenv.config();

import app from "./app";
import prisma from "./lib/prisma";

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

const server = app.listen(PORT, () => {
  console.log(`[GrammarPath API] Server listening on http://localhost:${PORT}`);
  console.log(`[GrammarPath API] Environment: ${process.env.NODE_ENV || "development"}`);
});

// Graceful shutdown
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

