// Expected business errors carry an HTTP status and stable code for the frontend.
export class LobbyError extends Error {
  constructor(public readonly code: string, message: string, public readonly status: number) {
    super(message);
    this.name = "LobbyError";
  }
}
