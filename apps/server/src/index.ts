import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { z } from "zod";
import { createApp } from "./app.js";

//Load environnement configuration
//Works from both src/index.ts and the compiled dist/index.js
dotenv.config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url))
});

//Validate using Zod
const environment = z.object({
  SERVER_HOST: z.string().min(1).default("127.0.0.1"),
  SERVER_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
}).safeParse(process.env);

if (!environment.success) {
  console.error(
    "Invalid server configuration:",
    environment.error.flatten().fieldErrors
  );
  process.exit(1);
}

const { SERVER_HOST: host, SERVER_PORT: port } = environment.data;

//Start the server
const server = createApp().listen(port, host, () => {
  console.info(`Werewolf prototype listening on http://${host}:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close());
}