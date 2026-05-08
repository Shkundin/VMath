# VisualMath Server

`backend` is the production NestJS backend for VisualMath. It lives inside the top-level `pnpm` monorepo and shares contracts with the client through workspace packages instead of keeping separate duplicated API types.

## Workspace Fit

- `packages/shared` contains DTOs, error codes, roles, API contracts, and WebSocket contracts.
- `packages/integration` contains the typed HTTP/WebSocket SDK used by the app.
- `packages/graphics` owns math visualization primitives and visual state structures consumed by live sessions.
- `packages/server-mock` remains available as a lightweight local fallback for frontend work.
- `apps/mobile` can target this backend by setting the API and WebSocket environment variables.

## Delivered Scope

- versioned REST API under `/api/v1`
- Swagger/OpenAPI documentation
- JWT authentication with refresh token rotation
- password login, student self-registration, Google sign-in, and VK ID sign-in
- RBAC for `student`, `teacher`, and `admin`
- admin user management, role assignment, activation, and student group handling
- lecture catalog, lecture details, lecture blocks, and normalized subjects
- module library and lecture composition APIs
- live lesson sessions with WebSocket sync
- active block switching and visual module state updates
- checking blocks, submissions, grading, result publication, teacher statistics, and CSV export
- PostgreSQL migrations, seed data, tests, Docker config, and Render deployment config

## Local Development

1. Start PostgreSQL locally. The default `.env.example` uses `postgres://postgres:postgres@127.0.0.1:54322/postgres`, which matches a typical local Supabase database.
2. Copy the environment template.
3. Install dependencies.
4. Build the shared/backend packages.
5. Run migrations and seed data.
6. Start the backend.

Commands from the repository root:

```bash
cp .env.example .env
pnpm install --frozen-lockfile=false
pnpm build:backend
pnpm --filter @vm/server db:migrate
pnpm --filter @vm/server db:seed
pnpm dev:backend
```

The server runs on port `8787` by default.

If you want to keep using the mock service during frontend work:

```bash
pnpm dev:server
```

## Local URLs

- Health: `http://localhost:8787/api/v1/health`
- Swagger UI: `http://localhost:8787/api/docs`
- OpenAPI JSON: `http://localhost:8787/api/v1/openapi.json`
- WebSocket endpoint: `ws://localhost:8787/ws`

## Seeded Demo Users

These users exist after running `pnpm --filter @vm/server db:seed`:

- `teacher` / `teacher`
- `student` / `student`
- `admin` / `admin`

Migrations alone do not create demo users.

## Main Scripts

From the repository root:

```bash
pnpm dev:backend
pnpm build:backend
pnpm test:backend
```

Direct package scripts:

```bash
pnpm --filter @vm/server dev
pnpm --filter @vm/server build
pnpm --filter @vm/server typecheck
pnpm --filter @vm/server db:migrate
pnpm --filter @vm/server db:seed
pnpm --filter @vm/server test
pnpm --filter @vm/server start
```

## API And Realtime

- REST API is served under `/api/v1`.
- Swagger UI is served at `/api/docs`.
- Raw WebSocket transport is served at `/ws`.
- WebSocket authentication accepts an access token during upgrade.
- Session reconnects are handled through `JOIN_SESSION` or `SYNC_FROM_SEQUENCE`.
- Server session state is authoritative; clients should ignore stale events by sequence.

See [SESSION_EVENTS.md](./SESSION_EVENTS.md) for the current realtime contract.

## Environment

Use the root [.env.example](../.env.example) as the template.

Always-required production secrets:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

Common optional variables:

- `PORT`, defaults to `8787`
- `APP_URL`
- `API_BASE_URL`
- `TRUST_PROXY`
- `CORS_ORIGIN`
- `WS_CORS_ORIGIN`
- `GOOGLE_OAUTH_CLIENT_IDS`, required only for Google sign-in
- `VK_APP_ID`, required only for VK ID sign-in
- `VK_APP_IDS` and `VK_ANDROID_APP_ID`, optional compatibility allow-lists

Tokens and refresh secrets must never be logged or exposed to the client.

## Tests

```bash
pnpm test:backend
```

The backend test suite currently covers:

- unit tests for grading, auth helpers, permissions, and session transitions
- integration tests for auth and lecture retrieval
- end-to-end happy paths for student and teacher flows
- production configuration checks

## Deployment

The backend is intended to run as a Render web service backed by PostgreSQL/Supabase.

Primary deployment files:

- [../render.yaml](../render.yaml)
- [DEPLOY_RENDER.md](./DEPLOY_RENDER.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATA_MODEL.md](./DATA_MODEL.md)
- [ACCEPTANCE_CHECKLIST.md](./ACCEPTANCE_CHECKLIST.md)

Render build command:

```bash
corepack enable && pnpm install --frozen-lockfile=false --prod=false && pnpm --filter @vm/shared build && pnpm --filter @vm/server build
```

Render pre-deploy command:

```bash
pnpm --filter @vm/server db:migrate
```

Render start command:

```bash
pnpm --filter @vm/server start
```

Health check path:

```text
/api/v1/health
```

For manually created Render services, set `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` directly in the Render Dashboard. Blueprint changes do not backfill existing `sync: false` secrets.
