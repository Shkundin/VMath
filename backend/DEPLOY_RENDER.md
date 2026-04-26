# Render Deployment

## Recommended Render service

Use a Render Web Service pointed at the monorepo root.

- Build command:

```bash
corepack enable && pnpm install --frozen-lockfile=false --prod=false && pnpm --filter @vm/shared build && pnpm --filter @vm/server build
```

- Start command:

```bash
pnpm --filter @vm/server start
```

- Pre-deploy command:

```bash
pnpm --filter @vm/server db:migrate
```

- Health check path:

```text
/api/v1/health
```

The repository already contains a matching [render.yaml](../../render.yaml).

## Required environment variables

- `PORT`
- `NODE_ENV=production`
- `APP_URL`
- `API_BASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `DATABASE_URL`
- `GOOGLE_OAUTH_CLIENT_IDS`
- `VK_APP_ID`
- `CORS_ORIGIN`
- `WS_CORS_ORIGIN`

## Notes

- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `DATABASE_URL` must be explicitly configured in production. The backend refuses to use development fallbacks in production mode.
- `DATABASE_URL` must point to your real Supabase/Postgres instance. On Render it must not reference the local development address `127.0.0.1:54322`.
- `GOOGLE_OAUTH_CLIENT_IDS` is a comma-separated allowlist of Google client IDs whose ID tokens your backend accepts.
- `VK_APP_ID` must match the VK ID application used by the mobile/web client.
- Render should terminate HTTPS at the edge. The backend assumes HTTPS and WSS in production.
- Run the backend behind a Postgres instance backed by Supabase or another managed Postgres service.

## Docker alternative

Build the image from the monorepo root:

```bash
docker build -t visualmath-server .
```

Run it with environment variables:

```bash
docker run --rm -p 8787:8787 --env-file .env visualmath-server
```
