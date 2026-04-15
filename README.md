# vm
@'
# VisualMath

Monorepo проекта VisualMath.

## Пакеты

- `apps/mobile` — мобильное приложение Expo / React Native
- `packages/shared` — DTO, ошибки, события
- `packages/integration` — HTTP / WebSocket / сервисы
- `packages/graphics` — 2D/3D визуализация
- `packages/server-mock` — mock API для локальной разработки

## Быстрый старт

```bash
pnpm install
pnpm typecheck
pnpm build
pnpm dev:server
pnpm dev:mobile

## Backend Plan

- Repo baseline:
  - monorepo on `pnpm`
  - existing app: `apps/mobile`
  - existing shared layers: `packages/shared`, `packages/integration`, `packages/server-mock`
  - production backend workspace: `backend`
  - existing mock contracts already cover auth, lectures, sessions, quiz submission, and basic WS events
- Implementation direction:
  - add a real NestJS backend workspace without deleting the existing mock server
  - expand shared DTOs/events carefully so current imports keep working
  - move real backend API under `/api/v1`
  - implement PostgreSQL/Supabase-backed auth, RBAC, lectures, modules, checking blocks, sessions, stats, and WebSocket sync
  - add migrations, seeds, tests, Swagger, Docker, Render config, and env docs
- Compatibility guardrails:
  - keep `packages/server-mock` as a dev fallback
  - preserve existing naming where possible
  - only add compatibility aliases if needed during transition to versioned routes
