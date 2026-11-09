-- First Wwerewolf migration, only room and guest identities
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "adminPlayerId" TEXT,
    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "usernameKey" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Player_tokenHash_key" ON "Player"("tokenHash");
CREATE UNIQUE INDEX "Player_roomId_usernameKey_key" ON "Player"("roomId", "usernameKey");
CREATE INDEX "Player_roomId_joinedAt_idx" ON "Player"("roomId", "joinedAt");
ALTER TABLE "Player" ADD CONSTRAINT "Player_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
