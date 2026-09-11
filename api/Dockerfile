# ---------------------------------------------------------------------------
# Estagio base: dependencias comuns a dev e prod.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS base
WORKDIR /app
# openssl e exigido pelos engines do Prisma em imagens alpine.
RUN apk add --no-cache openssl
COPY package*.json ./

# ---------------------------------------------------------------------------
# Estagio dev: usado pelo docker-compose (hot reload via tsx watch).
# ---------------------------------------------------------------------------
FROM base AS dev
ENV NODE_ENV=development
RUN npm install
COPY . .
EXPOSE 3333
CMD ["npm", "run", "dev"]

# ---------------------------------------------------------------------------
# Estagio build: compila TypeScript e gera o Prisma Client.
# ---------------------------------------------------------------------------
FROM base AS build
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

# ---------------------------------------------------------------------------
# Estagio prod: runtime enxuto, apenas dependencias de producao.
# ---------------------------------------------------------------------------
FROM node:22-alpine AS prod
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/prisma ./prisma
EXPOSE 3333
CMD ["node", "dist/server.js"]
