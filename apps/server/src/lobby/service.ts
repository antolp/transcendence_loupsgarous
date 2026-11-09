import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  LOBBY_ROOM_ID, lobbyTokenSchema, usernameSchema,
  type LobbyCredentials, type LobbySnapshot,
} from "@ft/contracts";
import { LobbyError } from "./errors.js";

//Never store a raw guest token in PostgreSQL; store only its SHA-256 hash
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const unauthorized = () => new LobbyError("UNAUTHORIZED", "Invalid or expired guest token", 401);
const txOptions = { maxWait: 15_000, timeout: 20_000 };

//factory function returning an object containing two methods: register and getState
//then :
//    const lobby = createLobbyService(prisma);
//    await lobby.register("Alice"); etc
//All database access for the lobby lives here, not in the Express route handlers
export function createLobbyService(prisma: PrismaClient) {
  return {
    async register(rawUsername: string): Promise<LobbyCredentials> {
      const username = usernameSchema.parse(rawUsername);
      const playerId = randomUUID();
      const token = randomBytes(32).toString("hex");

    //registration logic all here
      try {
        //prisma.$transaction takes another function as an argument, tx parameter is a transaction-scoped Prisma client (ok)
        const revision = await prisma.$transaction(async (tx) => {
          //Updating the room locks its row for this transaction, two simultaneous registrations cannot both see an empty admin slot
          const room = await tx.room.update({
            where: { id: LOBBY_ROOM_ID },
            data: { revision: { increment: 1 } },
            select: { revision: true, adminPlayerId: true },
          });
          await tx.player.create({
            data: {
              id: playerId,
              roomId: LOBBY_ROOM_ID,
              username,
              usernameKey: username.toLowerCase(),
              tokenHash: hashToken(token),
            },
          });
          // first registrant is admin, later guests leave the field unchanged
          if (!room.adminPlayerId) {
            await tx.room.update({
              where: { id: LOBBY_ROOM_ID },
              data: { adminPlayerId: playerId },
            });
          }
          return room.revision;
        }, txOptions);
        return { playerId, token, revision };
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          throw new LobbyError("USERNAME_TAKEN", "That username is already in use", 409);
        }
        //Missing seed room is an operational error, not an invalid guest name.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
          throw new LobbyError("LOBBY_NOT_FOUND", "Run npm run db:seed first", 503);
        }
        throw error;
      }
    },

    async getState(token: string): Promise<LobbySnapshot> {
      if (!lobbyTokenSchema.safeParse(token).success) throw unauthorized();

      // RepeatableRead makes room revision, admin and player roster one snapshot
      return prisma.$transaction(async (tx) => {
        const me = await tx.player.findUnique({
          where: { tokenHash: hashToken(token) },
          select: { id: true, username: true, roomId: true },
        });
        if (!me || me.roomId !== LOBBY_ROOM_ID) throw unauthorized();

        const room = await tx.room.findUnique({
          where: { id: LOBBY_ROOM_ID },
          select: { revision: true, adminPlayerId: true },
        });
        if (!room) throw new LobbyError("LOBBY_NOT_FOUND", "Run npm run db:seed first", 503);

        const guests = await tx.player.findMany({
          where: { roomId: LOBBY_ROOM_ID },
          orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
          select: { id: true, username: true },
        });
        const players = guests.map((guest) => ({
          ...guest,
          isAdmin: guest.id === room.adminPlayerId,
        }));
        return {
          roomId: LOBBY_ROOM_ID,
          revision: room.revision,
          adminPlayerId: room.adminPlayerId,
          players,
          you: { id: me.id, username: me.username, isAdmin: me.id === room.adminPlayerId },
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
    },
  };
}

// Exposes the service's method signatures to the HTTP layer without duplication.
export type LobbyService = ReturnType<typeof createLobbyService>;
