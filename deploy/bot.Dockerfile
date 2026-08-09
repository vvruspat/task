FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY . .
RUN npm ci --include=dev
RUN npx turbo run build --filter=@task/tg-bot...
RUN npm prune --omit=dev && rm -rf .turbo

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
ENV NODE_ENV=production
EXPOSE 3001
CMD ["sh", "-lc", "exec node apps/tg-bot/dist/main.js"]
