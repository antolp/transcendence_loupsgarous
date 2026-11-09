import { z } from "zod";

// This prototype has exactly one persisted lobby; both applications use its ID.
export const LOBBY_ROOM_ID = "demo" as const;

// Validate untrusted browser input at the API boundary (2-20 visible characters).
export const usernameSchema = z.string().trim().min(2).max(20)
  .regex(/^[\p{L}\p{N}_ -]+$/u, "Use letters, numbers, spaces, hyphens or underscores");
export const registerLobbySchema = z.object({ username: usernameSchema }).strict();

// Guest credentials are 32 random bytes encoded as 64 lowercase hex characters.
export const lobbyTokenSchema = z.string().regex(/^[a-f0-9]{64}$/);

export type LobbyPlayer = { id: string; username: string; isAdmin: boolean };
export type LobbyCredentials = { playerId: string; token: string; revision: number };

// Public roster + the caller's identity; no other guest's token is ever returned.
export type LobbySnapshot = {
  roomId: typeof LOBBY_ROOM_ID;
  revision: number;
  adminPlayerId: string | null;
  players: LobbyPlayer[];
  you: LobbyPlayer;
};

// Keep HTTP error responses consistent between the server and browser client.
export type ApiError = { error: { code: string; message: string } };
