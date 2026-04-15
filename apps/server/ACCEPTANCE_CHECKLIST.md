# Acceptance Checklist

## Repository integration

- [x] Backend added as `apps/server` inside the existing `pnpm` monorepo
- [x] Shared DTOs and websocket contracts extended in `packages/shared`
- [x] Existing client package `packages/integration` updated to use the real backend
- [x] Mock server preserved as a fallback

## Auth and RBAC

- [x] `student`, `teacher`, `admin` roles implemented
- [x] `POST /api/v1/auth/login`
- [x] `POST /api/v1/auth/refresh`
- [x] `POST /api/v1/auth/logout`
- [x] `GET /api/v1/auth/me`
- [x] password hashing with `scrypt`
- [x] refresh token rotation with server-side hashed storage
- [x] role-based guards for admin and teacher flows

## Catalog and authoring

- [x] lecture catalog with visibility by role
- [x] lecture search by title, tags, and author
- [x] lecture filtering by subject, semester, and level
- [x] lecture details and lecture block retrieval
- [x] module library CRUD
- [x] lecture CRUD with ordered blocks and module composition
- [x] normalized `subjects`

## Sessions and realtime

- [x] session create/start/stop/join flows
- [x] join by active list or session code
- [x] current block persistence
- [x] participant status and connection status tracking
- [x] websocket gateway with reconnect-friendly session sync
- [x] visual module state persistence and broadcast

## Assessments and statistics

- [x] single choice questions
- [x] multiple choice questions
- [x] short text and numeric answers
- [x] optional formula answer field support in the shared model
- [x] checking block authoring from existing or inline questions
- [x] teacher-controlled checking block finish
- [x] grading service extracted and unit-tested
- [x] result publication, result retrieval, and CSV export
- [x] aggregated teacher statistics and answer distributions

## Data and operations

- [x] relational migration with all requested core tables
- [x] UUID identifiers, timestamps, foreign keys, and indexes
- [x] seed data for local demo flows
- [x] Swagger/OpenAPI
- [x] health endpoint
- [x] Dockerfile
- [x] Render blueprint
- [x] `.env.example`
- [x] local run and deploy documentation

## Tests

- [x] unit tests for grading
- [x] unit tests for auth helpers
- [x] unit tests for permission logic
- [x] unit tests for session state transitions
- [x] integration test for auth and lecture retrieval
- [x] e2e student happy-path
- [x] e2e teacher happy-path
