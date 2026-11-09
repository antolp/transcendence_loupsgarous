// Public entry point: applications import shared HTTP types from @ft/contracts.
export * from "./lobby.js";

// The health endpoint from Commit 1 stays available as a shared type.
export type HealthResponse = {
  status: "ok";
  service: "werewolf-server";
};
