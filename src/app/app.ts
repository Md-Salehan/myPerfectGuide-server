import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";

import { apiRouter } from "@/app/api-router";
import { rootRouter } from "@/app/routes";
import {
  errorHandler,
  notFoundHandler,
  requestId,
  requestLogger,
} from "@/shared/middleware";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);

  app.use(requestId);
  app.use(requestLogger);
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  // /health (unthrottled) + everything else
  app.use(rootRouter);
  // Versioned API (rate-limited, auth-ready)
  app.use("/api/v1", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}