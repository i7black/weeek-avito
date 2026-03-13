FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src/ ./src/
COPY public/ ./public/

RUN npx tsc

# Удаляем devDependencies после сборки
RUN npm prune --omit=dev

EXPOSE 3000

CMD ["node", "dist/server.js"]
