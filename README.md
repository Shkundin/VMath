# VisualMath

VisualMath is a `pnpm` monorepo for an educational math platform with a production NestJS backend and an Expo/React Native client.

## Workspaces

- `backend` — production API, PostgreSQL migrations, seeds, tests, Render deployment
- `apps/mobile` — Expo mobile/web client
- `packages/shared` — shared DTOs, errors, websocket contracts
- `packages/integration` — HTTP/WebSocket client SDK used by the app
- `packages/graphics` — math visualization primitives
- `packages/server-mock` — mock server for local frontend work

## Quick Start

```bash
pnpm install --frozen-lockfile=false
cp .env.example .env
pnpm --filter @vm/server db:migrate
pnpm --filter @vm/server db:seed
pnpm dev:backend
pnpm dev:mobile
```

## Useful Commands

```bash
pnpm test:backend
pnpm --filter @vm/mobile run typecheck
pnpm build:backend
```

## Authentication

- password login for `student`, `teacher`, and `admin`
- student self-registration
- Google sign-in via backend-verified ID tokens
- VK ID sign-in via OAuth code exchange through the backend

## Deployment

- Render blueprint: [render.yaml](./render.yaml)
- Backend deployment notes: [backend/DEPLOY_RENDER.md](./backend/DEPLOY_RENDER.md)
- Environment template: [.env.example](./.env.example)
- For an existing manually created Render Docker service, set `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` in the Render Dashboard before deploy.
