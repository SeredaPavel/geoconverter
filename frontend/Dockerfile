# /geoconverter/frontend/Dockerfile
# Multi-stage Next.js с обновлением индексov пакетов (без тяжелого upgrade)

# Общий базовый слой
FROM node:20.17.0-alpine3.20 AS base
WORKDIR /app
# Держим индекс пакетов свежим (без апгрейда всего дистрибутива)
RUN apk --no-cache update

# deps: ставим node_modules
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# builder: собираем Next.js
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# runner: минимальный рантайм
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app ./
EXPOSE 3000
CMD ["npm", "run", "start"]
