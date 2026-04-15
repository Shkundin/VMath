# VisualMath Server

`backend` is the production NestJS backend for VisualMath.

It lives inside the existing `pnpm` monorepo and deliberately reuses the current repository structure:

- shared DTOs, error codes, and websocket contracts stay in `packages/shared`
- reusable API clients stay in `packages/integration`
- `packages/server-mock` remains available as a dev fallback
- mobile can switch to the real backend by pointing its API base URL to this service

## Delivered scope

- versioned REST API under `/api/v1`
- JWT auth with refresh token rotation and server-side refresh session storage
- RBAC for `student`, `teacher`, and `admin`
- lectures, lecture blocks, and normalized subjects
- module library and lecture composition APIs
- live lesson sessions with realtime websocket sync
- checking blocks, submissions, grading, results, stats, and CSV export
- Swagger/OpenAPI, health checks, Docker, Render config, migrations, seeds, and tests

## Local development

1. Copy the env template.
2. Start PostgreSQL or Supabase locally.
3. Install dependencies.
4. Run migrations and seed data.
5. Start the backend.

Example commands from the repo root:

```bash
cp .env.example .env
pnpm install --frozen-lockfile=false
pnpm build:backend
pnpm --filter @vm/server db:migrate
pnpm --filter @vm/server db:seed
pnpm dev:backend
```

If you want to keep using the mock service during frontend work, keep using:

```bash
pnpm dev:server
```

## Local URLs

- Health: `http://localhost:8787/api/v1/health`
- Swagger UI: `http://localhost:8787/api/docs`
- OpenAPI JSON: `http://localhost:8787/api/v1/openapi.json`
- WebSocket endpoint: `ws://localhost:8787/ws`

## Demo users from the seed

- `teacher` / `teacher`
- `student` / `student`
- `admin` / `admin`

## Tests

```bash
pnpm test:backend
```

The backend test suite covers:

- unit tests for grading, auth helpers, permissions, and session transitions
- integration tests for auth and lecture retrieval
- e2e happy paths for the student flow and teacher flow

## Deployment

Render and Docker guidance lives in:

- [DEPLOY_RENDER.md](./DEPLOY_RENDER.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [DATA_MODEL.md](./DATA_MODEL.md)
- [SESSION_EVENTS.md](./SESSION_EVENTS.md)
- [ACCEPTANCE_CHECKLIST.md](./ACCEPTANCE_CHECKLIST.md)
