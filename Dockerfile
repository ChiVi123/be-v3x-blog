# ============================================
# Base: Bun dependencies
# ============================================
FROM oven/bun:1 AS base

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile


# ============================================
# Development: Bun
# ============================================
FROM base AS development

COPY . .

ENV NODE_ENV=development

EXPOSE 4000

CMD ["bun", "run", "start:dev"]


# ============================================
# Builder: Bun
# ============================================
FROM base AS builder

COPY . .

ENV NODE_ENV=production

RUN bun run build


# ============================================
# Production dependencies
# ============================================
FROM oven/bun:1 AS production-deps

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --production --frozen-lockfile


# ============================================
# Production: Node.js
# ============================================
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY package.json ./
COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY drizzle ./drizzle

USER node

EXPOSE 4000

CMD ["node", "dist/src/main.js"]
