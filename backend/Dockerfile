FROM node:22-alpine AS build
# Prisma's linux-musl query engine dynamically links against OpenSSL, which
# the base node:alpine image doesn't ship — without this, `prisma generate`
# still succeeds (it just fetches the engine binary), but the binary fails
# to load at runtime with "Error loading shared library libssl.so...".
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:22-alpine
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/dist ./dist
RUN mkdir -p /app/uploads && addgroup -S xra && adduser -S xra -G xra && chown -R xra:xra /app
USER xra
EXPOSE 4000
CMD ["node", "dist/index.js"]
