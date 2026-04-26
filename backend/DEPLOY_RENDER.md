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

If you create the service from that Blueprint, Render can auto-generate the JWT secrets for you.
If your existing service was created manually and currently builds from `Dockerfile`, update the
environment variables in the Render Dashboard directly. A `render.yaml` change does not backfill
old `sync: false` secrets into an already existing service.

## Required environment variables

- `PORT`
- `NODE_ENV=production`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `DATABASE_URL`

## Notes

- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `DATABASE_URL` are the only always-required production secrets.
- `APP_URL` and `API_BASE_URL` are optional on Render because the backend can derive them from Render's external URL.
- `CORS_ORIGIN` and `WS_CORS_ORIGIN` are optional unless you want to lock production down to a specific frontend origin list.
- `DATABASE_URL` must point to your real Supabase/Postgres instance. On Render it must not reference the local development address `127.0.0.1:54322`.
- `GOOGLE_OAUTH_CLIENT_IDS` is required only if you want Google sign-in. It is a comma-separated allowlist of Google client IDs whose ID tokens your backend accepts.
- `VK_APP_ID` is required only if you want VK ID sign-in. It must match the VK ID application used by the mobile/web client.
- Render should terminate HTTPS at the edge. The backend assumes HTTPS and WSS in production.
- Run the backend behind a Postgres instance backed by Supabase or another managed Postgres service.
- `teacher / teacher`, `student / student`, and `admin / admin` exist only after running `pnpm --filter @vm/server db:seed`. Migrations alone do not create demo users.

## Docker alternative

Build the image from the monorepo root:

```bash
docker build -t visualmath-server .
```

Run it with environment variables:

```bash
docker run --rm -p 8787:8787 --env-file .env visualmath-server
```
