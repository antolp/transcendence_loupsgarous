import type { ApiError, LobbyCredentials, LobbySnapshot } from "@ft/contracts";

// Browser-facing API errors preserve the server's machine-readable error code.
export class LobbyApiError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "LobbyApiError";
  }
}

// Centralize JSON decoding and HTTP errors so UI components stay focused on UI.
async function asJson<T>(response: Response): Promise<T> {
  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = (payload as Partial<ApiError> | null)?.error;
    throw new LobbyApiError(error?.code ?? "HTTP_ERROR", error?.message ?? `HTTP ${response.status}`);
  }
  // A cast is not runtime validation: the backend validates request input.
  return payload as T;
}

export async function register(username: string): Promise<LobbyCredentials> {
  const response = await fetch("/api/lobby/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
    cache: "no-store",
  });
  return asJson<LobbyCredentials>(response);
}

export async function fetchLobbyState(token: string): Promise<LobbySnapshot> {
  const response = await fetch("/api/lobby/state", {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  return asJson<LobbySnapshot>(response);
}
