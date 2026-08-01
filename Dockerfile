## ================================================================
## KadriLex Next.js — Dockerfile multi-stage standalone
## Usage : docker build -t kadrilex-app .
##         docker run --network supabase_default -p 3000:3000 \
##           -e DATABASE_URL=postgresql://postgres:PWD@db:5432/postgres \
##           -e AUTH_JWT_SECRET=... \
##           kadrilex-app
## ================================================================

# ---------- 1) Deps ----------
FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --include=dev

# ---------- 2) Build ----------
FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables d'env pour le build (peuvent être placeholders, écrasées au runtime)
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"

# Génère le client Prisma + build Next.js (output: standalone)
RUN npx prisma generate
RUN npm run build

# ---------- 3) Runner ----------
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# User non-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copie le build standalone + assets statiques + prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/fix-db.js ./fix-db.js
# node_modules complet : le tracing de Next.js standalone rate les modules à
# require() dynamique (ex: exceljs) — on écrase avec le node_modules complet
# de la stage deps pour garantir que tout est présent au runtime.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules ./node_modules

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/me || exit 1

CMD ["node", "server.js"]
