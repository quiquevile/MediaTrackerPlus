# Build server and client.
# sharp ships prebuilt libvips binaries (x64 + arm64 musl), so there is no
# need to compile libvips from source.
FROM node:20-alpine3.20 AS build

WORKDIR /app

COPY server/ /app/server
COPY client/ /app/client
COPY rest-api/ /app/rest-api
COPY ["package.json", "package-lock.json*", "./"]

RUN apk add --no-cache python3 g++ make
RUN npm ci
RUN npm run build

# Prune dev dependencies for production
FROM node:20-alpine3.20 AS server-build-production

WORKDIR /server
COPY ["server/package.json", "server/package-lock.json*", "./"]
RUN apk add --no-cache python3 g++ make
RUN npm ci --omit=dev

# Runtime image
FROM node:20-alpine3.20

RUN apk add --no-cache curl shadow

WORKDIR /storage
VOLUME /storage

WORKDIR /assets
VOLUME /assets

WORKDIR /logs
VOLUME /logs

WORKDIR /app

COPY --from=build /app/server/public public
COPY --from=build /app/server/build build

COPY --from=server-build-production /server/node_modules node_modules

COPY server/package.json ./
COPY docker/entrypoint.sh /docker/entrypoint.sh

ENV PORT=7481
EXPOSE $PORT

ENV PUID=1000
ENV PGID=1000

RUN groupadd --non-unique --gid 1000 abc
RUN useradd --non-unique --create-home --uid 1000 --gid abc abc

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 CMD curl -f http://127.0.0.1:${PORT:-7481}/api/configuration || exit 1

ENV DATABASE_PATH="/storage/data.db"
ENV ASSETS_PATH="/assets"
ENV LOGS_PATH="/logs"
ENV NODE_ENV=production

ENTRYPOINT  ["sh", "/docker/entrypoint.sh"]
