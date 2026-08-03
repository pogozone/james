FROM node:20-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV PORT=3003

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
    && npm cache clean --force

COPY --from=builder /app/build ./build
COPY server-mongo.js ./

RUN chown -R node:node /app

USER node

EXPOSE 3003

CMD ["node", "server-mongo.js"]