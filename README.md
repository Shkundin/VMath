# VisualMath

VisualMath is a `pnpm` monorepo for an educational math platform. The current stack includes a production NestJS backend, an Expo/React Native mobile and web client, shared DTO packages, a typed integration SDK, math graphics primitives, and a mock server for local frontend work.

## Repository Structure

- `backend` - production API, PostgreSQL migrations, seeds, tests, Swagger/OpenAPI, WebSocket realtime, Docker, and Render deployment
- `apps/mobile` - Expo mobile/web client that uses the integration and graphics packages
- `packages/shared` - shared DTOs, error codes, roles, API contracts, and WebSocket contracts
- `packages/integration` - typed HTTP/WebSocket client SDK used by the app
- `packages/graphics` - math visualization primitives and visual state helpers
- `packages/server-mock` - local mock server for frontend development without the production backend

## Requirements

- Node.js with Corepack enabled
- `pnpm` 10.x, as declared in `package.json`
- PostgreSQL for the production backend locally; the default `.env.example` points to `127.0.0.1:54322`, which matches a typical local Supabase setup
- Expo tooling for mobile/web development

## Quick Start

From the repository root:

```bash
pnpm install --frozen-lockfile=false
cp .env.example .env
pnpm build:backend
pnpm --filter @vm/server db:migrate
pnpm --filter @vm/server db:seed
pnpm dev:backend
```

In a second terminal, start the client:

```bash
pnpm dev:mobile
```

If you want frontend development against the mock server instead of the production backend, run:

```bash
pnpm dev:server
```

## Local URLs

- Backend health: `http://localhost:8787/api/v1/health`
- Swagger UI: `http://localhost:8787/api/docs`
- OpenAPI JSON: `http://localhost:8787/api/v1/openapi.json`
- WebSocket endpoint: `ws://localhost:8787/ws`
- Expo dev server: opened by `pnpm dev:mobile`

## Useful Commands

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm build:backend
pnpm test:backend
pnpm --filter @vm/mobile run typecheck
pnpm --filter @vm/mobile build:web
```

## Authentication

The backend currently supports:

- password login for `student`, `teacher`, and `admin`
- student self-registration
- access and refresh JWTs with server-side refresh token rotation
- Google sign-in through backend-verified ID tokens
- VK ID sign-in through backend OAuth code exchange

Seeded local demo users after `pnpm --filter @vm/server db:seed`:

- `teacher` / `teacher`
- `student` / `student`
- `admin` / `admin`

## Runtime Configuration

Use `.env.example` as the source of truth for local configuration.

Important backend variables:

- `PORT`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `GOOGLE_OAUTH_CLIENT_IDS`, optional unless Google sign-in is enabled
- `VK_APP_ID`, optional unless VK ID sign-in is enabled
- `CORS_ORIGIN` and `WS_CORS_ORIGIN`, optional local/frontend allow-lists

Important client variables:

- `EXPO_PUBLIC_VM_API_BASE_URL`
- `EXPO_PUBLIC_VM_WS_URL`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
- `EXPO_PUBLIC_VK_APP_ID`

The web client defaults to its own origin in production and uses Vercel rewrites for REST API calls. WebSocket traffic should point at the Render backend, for example `wss://vmath.onrender.com/ws`.

## Deployment

- Frontend/web deployment: Vercel, with API rewrites in `vercel.json` and `apps/mobile/vercel.json`
- Backend deployment: Render web service backed by PostgreSQL/Supabase
- Render blueprint: [render.yaml](./render.yaml)
- Backend deployment notes: [backend/DEPLOY_RENDER.md](./backend/DEPLOY_RENDER.md)
- Environment template: [.env.example](./.env.example)

For an existing manually created Render service, set at least `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` in the Render Dashboard before deploy. Social login variables are required only when the matching provider is enabled.

## Backend Documentation

More detailed backend documentation lives in `backend`:

- [backend/README.md](./backend/README.md)
- [backend/ARCHITECTURE.md](./backend/ARCHITECTURE.md)
- [backend/DATA_MODEL.md](./backend/DATA_MODEL.md)
- [backend/SESSION_EVENTS.md](./backend/SESSION_EVENTS.md)
- [backend/ACCEPTANCE_CHECKLIST.md](./backend/ACCEPTANCE_CHECKLIST.md)
