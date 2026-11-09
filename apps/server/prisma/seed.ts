import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

//database commands run independently of server startup, so load .env here too
dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });

const prisma = new PrismaClient();

try {
  // Upsert is safe to repeat, restarting development must not delete players.
  const room = await prisma.room.upsert({
    where: { id: "demo" },
    create: { id: "demo" },
    update: {},
  });
  console.info(`Seeded lobby '${room.id}' (revision ${room.revision})`);
} finally {
  await prisma.$disconnect();
}
