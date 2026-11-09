import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { z } from "zod";
import { createApp } from "./app.js";
import { createLobbyService } from "./lobby/service.js";

// Both src/index.ts and dist/index.js are three directories below the root.
dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const environment = z.object({
  SERVER_HOST: z.string().min(1).default("127.0.0.1"),
  SERVER_PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  DATABASE_URL: z.string().url(),
}).safeParse(process.env);

if (!environment.success) {
  console.error("Invalid server configuration:", environment.error.flatten().fieldErrors);
  process.exit(1);
}

const { SERVER_HOST: host, SERVER_PORT: port } = environment.data;
const prisma = new PrismaClient();

try {
  // Fail at startup rather than showing users a working HTTP server with no DB.
  await prisma.$connect();
} catch (error) {
  console.error("Cannot connect to PostgreSQL. Run npm run db:setup first.", error);
  await prisma.$disconnect();
  process.exit(1);
}

const lobby = createLobbyService(prisma);
const server = createApp(lobby).listen(port, host, () => {
  console.info(`Werewolf prototype listening on http://${host}:${port}`);
});

// Stop accepting requests and release the database connection on Ctrl+C.
let closing = false;
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (closing) return;
    closing = true;
    server.close(() => { void prisma.$disconnect(); });
  });
}
