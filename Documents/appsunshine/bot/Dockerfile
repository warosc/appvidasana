# ============================================
# Vida Saludable Guatemala — WhatsApp Bot
# Node.js 20 Alpine, multi-stage build
# ============================================

# --- deps stage ---
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# --- runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app

# Non-root user for security
RUN addgroup -S botgroup && adduser -S botuser -G botgroup

COPY --from=deps /app/node_modules ./node_modules
COPY server.js flows.js ./

USER botuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
