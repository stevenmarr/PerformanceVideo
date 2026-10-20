FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NITRO_PRESET=node
ENV VITE_AUTH_ENABLED=true
ENV VITE_PUBLIC_BASE=/diagram
# npm puts node_modules/.bin on PATH. Calling the wrapper directly does not,
# so `vite` is missing and the build exits with ENOENT.
RUN npm run build:node
# The runtime only needs `pg` for the migrator. Installing it against the app
# package.json pulls every dependency and npm 10 crashes with "edgesOut".
RUN mkdir -p /opt/pg-runtime && \
    for p in pg pg-cloudflare pg-connection-string pg-int8 pg-pool pg-protocol \
             pg-types pgpass postgres-array postgres-bytea postgres-date \
             postgres-interval split2 xtend; do \
      cp -a "node_modules/$p" "/opt/pg-runtime/$p"; \
    done

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
COPY --from=build /app/.output ./.output
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=build /app/scripts/migration-plan.mjs ./scripts/migration-plan.mjs
COPY --from=build /opt/pg-runtime ./node_modules
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
EXPOSE 8080
CMD ["/entrypoint.sh"]
