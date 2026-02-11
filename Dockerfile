# JubitMind — Local AI Monitoring Dashboard
# Multi-stage build: install + build → lean production image

# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Accept build-time env for Vite
ARG VITE_DEMO_MODE=false
ENV VITE_DEMO_MODE=${VITE_DEMO_MODE}

COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Only copy production dependencies + built output
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/providers.json ./providers.json

# Include demo sessions data (used when DEMO_MODE=true)
COPY data/demo-sessions ./data/demo-sessions

# Create data directory for mounted volumes
RUN mkdir -p /data/.claude /data/.continue /data/conversations

EXPOSE 3000

# Health check — use 0.0.0.0 since Fly.io binds there
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:3000/api/system/health || exit 1

CMD ["node", "dist/server/index.js"]
