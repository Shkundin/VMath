# Session Event Contracts

## Transport

- WebSocket path: `/ws`
- Authentication: access token in the websocket query string or `Authorization: Bearer <token>`
- Origin control: validated against `WS_CORS_ORIGIN`

## Client commands

- `JOIN_SESSION`
  - payload: `{ "sessionId": string, "lastSequence"?: number }`
- `LEAVE_SESSION`
  - payload: `{ "sessionId": string }`
- `SET_ACTIVE_BLOCK`
  - payload: `{ "sessionId": string, "blockId": string }`
- `UPDATE_VISUAL_MODULE_STATE`
  - payload: `{ "sessionId": string, "blockId": string, "schemaVersion": number, "state": object }`
- `START_CHECKING_BLOCK`
  - payload: `{ "sessionId": string, "blockId": string, "timeLimitSec"?: number }`
- `FINISH_CHECKING_BLOCK`
  - payload: `{ "sessionId": string, "blockId": string }`
- `SYNC_FROM_SEQUENCE`
  - payload: `{ "sessionId": string, "lastSequence": number }`

## Server events

- `SESSION_SYNC`
  - full snapshot for reconnect or initial join
- `SESSION_STARTED`
- `SESSION_STOPPED`
- `PARTICIPANT_JOINED`
- `PARTICIPANT_STATUS`
- `BLOCK_CHANGED`
- `VISUAL_MODULE_STATE_UPDATED`
- `CHECKING_BLOCK_STARTED`
- `ANSWER_SUBMITTED`
- `CHECKING_BLOCK_FINISHED`
- `RESULTS_PUBLISHED`
- `ERROR`

Every server event carries a timestamp and, when applicable, a monotonically increasing `sequence`.

## Reconnect behavior

1. Client reconnects and authenticates again.
2. Client sends `JOIN_SESSION` or `SYNC_FROM_SEQUENCE`.
3. Server returns `SESSION_SYNC` with the current canonical session state.
4. Client should treat the server snapshot as authoritative.
5. Client should ignore stale events whose sequence is lower than or equal to the last processed sequence.

## Idempotency guidance

- repeated `JOIN_SESSION` calls are safe because participant rows are upserted
- repeated answer submissions are safe because submission rows and answer rows are upserted
- client reducers should be sequence-aware and last-write-wins by sequence
