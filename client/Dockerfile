# syntax=docker/dockerfile:1

# ---------- build: Vite production bundle ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

# Commit pnpm-lock.yaml: it makes builds reproducible. The fallback below only
# exists so a build doesn't hard-fail if someone forgot to.
# --ignore-scripts: skips onnxruntime-node/sharp install scripts, which are irrelevant to the
# browser bundle (Whisper runs in the user's browser via onnxruntime-web).
COPY package.json pnpm-lock.yaml* ./
RUN if [ -f pnpm-lock.yaml ]; then \
      pnpm install --frozen-lockfile --ignore-scripts; \
    else \
      pnpm install --ignore-scripts; \
    fi

COPY . .

# Vite inlines VITE_* values at BUILD time (import.meta.env), exactly as in development.
# On Render, env vars of the same name are passed to the build automatically.
ARG VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_API_URL=$VITE_API_URL \
    VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

RUN pnpm run build \
 && test -f dist/index.html

# ---------- runtime: nginx serves the static bundle ----------
FROM nginx:1.27-alpine AS runtime

# Render injects PORT at runtime; the nginx image substitutes it into the template on start.
ENV PORT=10000
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${PORT}/healthz" || exit 1
