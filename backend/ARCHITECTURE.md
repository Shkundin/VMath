# Architecture

## Repository fit

The backend lives in the top-level `backend` workspace inside the existing `pnpm` monorepo instead of creating a parallel stack.

- `packages/shared` contains cross-workspace DTOs, error codes, and websocket contracts.
- `packages/integration` contains HTTP and websocket clients that now target the real backend.
- `packages/server-mock` is intentionally preserved as a local fallback.

## Main backend modules

- `auth`: login, refresh rotation, logout, `me`, password hashing, token signing, JWT guard
- `users`: admin-only user management, role assignment, activation, student `groupName` rule
- `lectures`: lecture catalog, filtering, lecture details, lecture blocks, lecture authoring
- `modules`: reusable content module library, questionnaire persistence, checking block composition
- `sessions`: lesson session lifecycle, participants, active block switching, visual state sync, websocket publishing
- `results`: grading, result publication, teacher statistics, CSV export
- `database`: Postgres pool, migrations, seeds
- `health`: health endpoints for local checks and deployment probes

## Persistence model

PostgreSQL is the source of truth. Supabase is the intended managed Postgres provider and also the place for future auth admin flows and asset storage integration.

- refresh sessions are stored server-side in `refresh_tokens`
- lecture and module structures are relational, with JSONB only where flexible payloads are needed
- realtime session changes are appended to `session_events`
- the current session sequence lives in `lesson_sessions.event_sequence`

## Request and auth flow

1. Client calls `/api/v1/auth/login`.
2. Backend validates credentials using `scrypt` password hashes.
3. Backend issues an access token and a refresh token.
4. The refresh token is hashed and stored in `refresh_tokens`.
5. `/api/v1/auth/refresh` rotates the refresh session and revokes the previous one.
6. Role-based guards protect teacher/admin endpoints.

## Realtime design

- transport: raw WebSocket on `/ws`
- auth: access token via query string or `Authorization` header during websocket upgrade
- reconnect path: client reconnects, authenticates again, then requests `JOIN_SESSION` or `SYNC_FROM_SEQUENCE`
- source of truth: server-side session state, never client state
- conflict control: every persisted session event increments the session sequence number

## Security and reliability choices

- request validation via `class-validator` and Nest `ValidationPipe`
- centralized JSON error shape via `GlobalExceptionFilter`
- simple rate limiting on auth endpoints
- request logging without token body dumps
- explicit production-only secret requirements
- websocket origin allow-list driven by `WS_CORS_ORIGIN`
- retry-safe answer submission through upserts on `submissions` and `submission_answers`
