FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Remove dev dependencies
RUN npm prune --production

FROM node:20-alpine AS runner
WORKDIR /app

# Install build tools needed for better-sqlite3 native bindings
RUN apk add --no-cache python3 make g++

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Data directory for SQLite database volume mount
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["node", "dist/main"]
