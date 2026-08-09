FROM node:22-bookworm-slim AS build

ARG SOURCE_COMMIT
WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN test -n "$SOURCE_COMMIT" \
  && git init . \
  && git remote add origin https://github.com/vvruspat/task.git \
  && git fetch --depth 1 origin "$SOURCE_COMMIT" \
  && git checkout --detach FETCH_HEAD
RUN npm ci --include=dev
RUN npx turbo run build --filter=@task/api...
RUN npm prune --omit=dev && rm -rf .git .turbo

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
ENV NODE_ENV=production
EXPOSE 3000
CMD ["sh", "-lc", "node apps/api/dist/run-migrations.js && exec node apps/api/dist/main.js"]
