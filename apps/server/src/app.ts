import express from "express";
import type { HealthResponse } from "@ft/contracts";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));

  app.get("/api/health", (_request, response) => {
    const payload: HealthResponse = {
      status: "ok",
      service: "werewolf-server"
    };
    response.json(payload);
  });

  app.use((_request, response) => {
    response.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "Route not found"
      }
    });
  });

  return app;
}