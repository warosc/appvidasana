FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production

FROM node:20-alpine AS runtime
WORKDIR /app

RUN addgroup -S admingroup && adduser -S adminuser -G admingroup
RUN mkdir -p /uploads && chown adminuser:admingroup /uploads

COPY --from=deps /app/node_modules ./node_modules
COPY src/ ./src/
COPY public/ ./public/

USER adminuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["node", "src/server.js"]
