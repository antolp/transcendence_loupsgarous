now with registration (no account no password but the groundwork is here) and ORM 

next : websockets, then actual server-side game loop

## First-time setup

```bash
cp .env.example .env
npm install
npm run db:setup
npm run dev
```

Open http://127.0.0.1:5173. 

### How the lobby works

- `POST /api/lobby/register` creates a guest and returns a one-time random token.
- `GET /api/lobby/state` requires `Authorization: Bearer <token>` and returns the roster.
- The browser remembers the guest ID and token in local storage; PostgreSQL stores only the token's SHA-256 hash (usuful to expend to real account)

### commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the frontend and backend |
| `npm run build` | Build contracts, generated Prisma client, server, and frontend |
| `npm run typecheck` | Type-check server and frontend |
| `npm run db:up` | Start PostgreSQL and wait for its health check |
| `npm run db:down` | Stop the database without deleting its data |
| `npm run db:generate` | Generate the TypeScript Prisma client |
| `npm run db:migrate` | Apply committed migrations |
| `npm run db:seed` | Ensure the single `demo` lobby exists |

explore prisma :
`npm exec -w @ft/server -- prisma studio`

When changing the Prisma schema, create a migration with `npm exec -w @ft/server -- prisma migrate dev --name <name>` and commit it. Do not run `docker compose down -v` unless you want to delete the entire database.

### project files/directories

```text
apps/web/                 React frontend and HTTP lobby client
apps/server/src/app.ts    Express API endpoints and error handling
apps/server/src/lobby/    Database tracked registration and lobby snapshots
apps/server/prisma/       Prisma schema, clean migration, idempotent  seed
packages/contracts/       Shared TypeScript types and Zod request schemas
```
# TO-DO
- the app is HTTP-only and binds to localhost for now
- full deployment (database service only containerized)