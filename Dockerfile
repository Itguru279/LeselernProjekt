# Leselern-App: ein Container, keine npm-Abhängigkeiten.
# Node 24 bringt SQLite (node:sqlite), Zeitzonen und TypeScript-Ausführung bereits mit.
# Die App startet als root, gibt /data an PUID:PGID (Unraid: 99:100) und
# läuft danach ohne Root-Rechte weiter (siehe src/privileges.ts).
FROM node:24-alpine

WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
COPY public ./public
COPY scripts ./scripts

# Wird von GitHub Actions gesetzt (Commit), steht beim Start im Log
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION

ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/data \
    TZ=Europe/Berlin \
    PUID=99 \
    PGID=100 \
    NODE_NO_WARNINGS=1 \
    LOG_LEVEL=info

VOLUME ["/data"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/health || exit 1

CMD ["node", "src/server.ts"]
