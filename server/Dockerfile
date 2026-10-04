# syntax=docker/dockerfile:1

# ---------- build: install deps, compile TypeScript, strip devDependencies ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app

# pnpm via corepack (the repo's lockfile is pnpm lockfileVersion 9)
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Skip native downloads we don't want at build time: Puppeteer's Chrome (installed
# explicitly in the runtime stage) and mongodb-memory-server's mongod binary (tests only).
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    MONGOMS_DISABLE_POSTINSTALL=1

# Lockfile is optional (it is listed in .gitignore): use it when present.
COPY package.json pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile --ignore-scripts; \
    else \
      pnpm install --ignore-scripts; \
    fi

COPY . .
RUN pnpm run build \
 && test -f dist/server.js
RUN pnpm prune --prod --ignore-scripts

# ---------- runtime ----------
FROM node:22-bookworm-slim AS runtime

# Shared libraries Chrome needs (PDF export + OCR rasterisation), plus fonts so exported
# PDFs resemble the on-screen templates (Inter / Arial / Georgia / monospace fallbacks).
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates dumb-init \
      fonts-inter fonts-liberation fonts-dejavu-core fonts-noto-color-emoji \
      libasound2 libatk-bridge2.0-0 libatk1.0-0 libcairo2 libcups2 libdbus-1-3 \
      libdrm2 libgbm1 libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 \
      libx11-6 libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 \
      libxkbcommon0 libxrandr2 \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PUPPETEER_CACHE_DIR=/opt/puppeteer \
    # Leave most of Render free tier's 512MB for Chrome (and OCR)
    NODE_OPTIONS=--max-old-space-size=256

# /app must be writable by the unprivileged user: tesseract.js caches its language
# data (eng.traineddata) in the working directory on first OCR use.
RUN mkdir -p /app && chown node:node /app
WORKDIR /app

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

# Chrome build that exactly matches the installed Puppeteer version
RUN node_modules/.bin/puppeteer browsers install chrome \
 && CHROME="$(find "$PUPPETEER_CACHE_DIR" -type f -name chrome | head -n 1)" \
 && test -n "$CHROME" \
 && if ldd "$CHROME" | grep "not found"; then \
      echo "ERROR: Chrome is missing shared libraries (listed above)" >&2; exit 1; \
    fi

# pdf-parse@1.1.1's index.js enters a "debug mode" when imported from native ESM (which is
# how `node dist/server.js` runs) and reads ./test/data/05-versions-space.pdf relative to the
# working directory at import time. Provide that file so startup can't fail with ENOENT.
RUN mkdir -p test/data \
 && ( cp -L node_modules/pdf-parse/test/data/05-versions-space.pdf test/data/ 2>/dev/null \
      || : > test/data/05-versions-space.pdf ) \
 && chown -R node:node test

USER node

# Render sets PORT (10000 by default); the app reads process.env.PORT.
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# dumb-init reaps Chrome's child processes and forwards SIGTERM to server.ts' graceful shutdown
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
