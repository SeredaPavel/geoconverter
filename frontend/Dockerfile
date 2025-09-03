# /geoconverter/frontend/Dockerfile

# Один общий базовый слой с обновлением пакетов
FROM node:20.17.0-alpine3.20 AS base
RUN apk --no-cache update && apk --no-cache upgrade
WORKDIR /app

# deps: устанавливаем node_modules
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
