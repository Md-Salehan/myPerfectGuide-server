import type { Server } from "http";

import { createApp } from "@/app/app";
import { env } from "@/config/env";
import { prisma } from "@/config/database";

const app = createApp();

const server: Server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(
    `[server] EdTech API listening on http://localhost:${env.PORT} (env=${env.NODE_ENV})`,
  );
});

/**
 * Graceful shutdown.
 *
 * Closes the HTTP server, then disconnects Prisma (drains the connection pool)
 * so restarts in production don't leak connections.
 */
function shutdown(signal: NodeJS.Signals): void {
  // eslint-disable-next-line no-console
  console.log(`[server] Received ${signal}. Shutting down gracefully...`);
  server.close(async (err) => {
    if (err) {
      // eslint-disable-next-line no-console
      console.error("[server] Error closing HTTP server:", err);
      process.exit(1);
    }
    try {
      await prisma.$disconnect();
      // eslint-disable-next-line no-console
      console.log("[server] Shutdown complete.");
      process.exit(0);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[server] Error disconnecting Prisma:", e);
      process.exit(1);
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  // eslint-disable-next-line no-console
  console.error("[server] Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  // eslint-disable-next-line no-console
  console.error("[server] Uncaught exception:", err);
  process.exit(1);
});