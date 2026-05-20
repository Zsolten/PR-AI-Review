import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import { ZodError } from "zod";
import type { Env } from "./config/env.js";
import type { AppContainer } from "./services/container.js";
import { createApiRouter } from "./routes/index.js";
import { AppError } from "./utils/errors.js";

export function createApp(env: Env, container: AppContainer): Express {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    })
  );

  app.use(
    "/api/webhooks/github",
    express.raw({ type: "application/json" }),
    (req, _res, next) => {
      const raw = req.body as Buffer;
      (req as Request & { rawBody?: string }).rawBody = raw.toString("utf8");
      try {
        req.body = JSON.parse((req as Request & { rawBody?: string }).rawBody ?? "{}");
      } catch {
        req.body = {};
      }
      next();
    }
  );

  app.use(express.json({ limit: "2mb" }));

  app.use("/api", createApiRouter(container));

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: err.message,
        code: err.code,
      });
      return;
    }

    if (err instanceof ZodError) {
      res.status(400).json({ error: "Validation failed", details: err.flatten() });
      return;
    }

    console.error(err);
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  });

  return app;
}
