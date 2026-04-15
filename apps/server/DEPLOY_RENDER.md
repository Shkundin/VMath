# Render Deployment

## Recommended Render service

Use a Render Web Service pointed at the monorepo root.

- Build command:

```bash
corepack enable && pnpm install --frozen-lockfile=false --prod=false && pnpm --filter @vm/shared build && pnpm --filter @vm/server build
```

- Start command:

```bash
pnpm --filter @vm/server db:migrate && pnpm --filter @vm/server start
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
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DATABASE_URL`
- `CORS_ORIGIN`
- `WS_CORS_ORIGIN`

## Notes

- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` must be explicitly configured in production. The backend refuses to use development fallbacks in production mode.
- Render should terminate HTTPS at the edge. The backend assumes HTTPS and WSS in production.
- Run the backend behind a Postgres instance backed by Supabase or another managed Postgres service.
- `SUPABASE_SERVICE_ROLE_KEY` must stay backend-only and must never be exposed to clients.

## Docker alternative

Build the image from the monorepo root:

```bash
docker build -t visualmath-server .
```

Run it with environment variables:

```bash
docker run --rm -p 8787:8787 --env-file .env visualmath-server
```
