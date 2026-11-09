import express, { type ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { registerLobbySchema, type ApiError, type HealthResponse } from "@ft/contracts";
import { LobbyError } from "./lobby/errors.js";
import type { LobbyService } from "./lobby/service.js";

// Stable error format so the browser can display friendly messages.
function apiError(code: string, message: string): ApiError {
  return { error: { code, message } };
}

// All private lobby requests authenticate using the token returned at registration.
function bearerToken(header: string | undefined): string {
  const token = /^Bearer ([a-f0-9]{64})$/.exec(header ?? "")?.[1];
  if (!token) throw new LobbyError("UNAUTHORIZED", "Missing or invalid guest token", 401);
  return token;
}

// The service handles business logic; Express only validates HTTP input and output.
export function createApp(lobby: LobbyService) {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "16kb" }));

  app.get("/api/health", (_request, response) => {
    const health: HealthResponse = { status: "ok", service: "werewolf-server" };
    response.json(health);
  });

  app.post("/api/lobby/register", async (request, response) => {
    const { username } = registerLobbySchema.parse(request.body);
    const credentials = await lobby.register(username);
    response.set("Cache-Control", "no-store").status(201).json(credentials);
  });

  app.get("/api/lobby/state", async (request, response) => {
    const snapshot = await lobby.getState(bearerToken(request.header("Authorization")));
    response.set("Cache-Control", "no-store").json(snapshot);
  });

  app.use((_request, response) => {
    response.status(404).json(apiError("NOT_FOUND", "Route not found"));
  });

  // Express 5 forwards errors thrown by async route handlers to this middleware.
  const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
    if (error instanceof LobbyError) {
      response.status(error.status).json(apiError(error.code, error.message));
    } else if (error instanceof ZodError) {
      response.status(400).json(apiError("INVALID_INPUT", "Invalid request data"));
    } else if ((error as { type?: string } | null)?.type === "entity.too.large") {
      response.status(413).json(apiError("PAYLOAD_TOO_LARGE", "Request body exceeds limit"));
    } else if ((error as { type?: string } | null)?.type === "entity.parse.failed") {
      response.status(400).json(apiError("INVALID_JSON", "Malformed JSON body"));
    } else {
      console.error("Unhandled request error", error);
      response.status(500).json(apiError("INTERNAL_ERROR", "Internal server error"));
    }
  };
  app.use(errorHandler);
  return app;
}
