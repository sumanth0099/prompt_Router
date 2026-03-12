# ── Stage 1: Dependencies ─────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files and install production deps only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# ── Stage 2: Production image ─────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy deps and source
COPY --from=deps /app/node_modules ./node_modules
COPY --chown=appuser:appgroup . .

# Create the log file with correct ownership so the app can write to it
RUN touch /app/route_log.jsonl && chown appuser:appgroup /app/route_log.jsonl

USER appuser

# Expose HTTP port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/logs || exit 1

ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "server.js"]
