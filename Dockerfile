FROM node:22-bookworm-slim

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY backend/package.json backend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile=false --prod=false

COPY backend backend
COPY packages/shared packages/shared

RUN pnpm --filter @vm/shared build
RUN pnpm --filter @vm/server build

EXPOSE 8787

CMD ["sh", "-c", "pnpm --filter @vm/server db:migrate && pnpm --filter @vm/server start"]
