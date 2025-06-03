# Build stage
FROM node:20 AS builder

# Install specific pnpm version
RUN corepack enable && corepack prepare pnpm@10.11.1 --activate

# Create app directory
WORKDIR /usr/src/app

# Copy package files and Prisma schema
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma

# Install dependencies including Prisma
RUN pnpm install
RUN pnpm add prisma @prisma/client

# Generate Prisma client (works without DB connection)
RUN pnpm exec prisma generate

# Copy remaining source code
COPY src ./src
COPY tsconfig.json ./
COPY vitest.config.ts ./
COPY test ./test

# Production stage
FROM node:20 AS production
WORKDIR /usr/src/app

# Install specific pnpm version
RUN corepack enable && corepack prepare pnpm@10.11.1 --activate

# Copy from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/package.json ./

# Expose ports
EXPOSE 3000
EXPOSE 9229

# Set production environment
ENV NODE_ENV=production

# Start command
CMD ["sh", "-c", "pnpm exec prisma db push --accept-data-loss && pnpm run prod"]

# Development stage
FROM node:20 AS development
WORKDIR /usr/src/app

# Install specific pnpm version
RUN corepack enable && corepack prepare pnpm@10.11.1 --activate

# Install nodemon locally
RUN pnpm add -D nodemon

# Copy from builder
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/node_modules/.bin ./node_modules/.bin
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/tsconfig.json ./
COPY --from=builder /usr/src/app/vitest.config.ts ./
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/test ./test

# Expose ports
EXPOSE 3000
EXPOSE 9229

# Set development environment
ENV NODE_ENV=development

# Start command
CMD ["sh", "-c", "pnpm exec prisma db push --accept-data-loss && pnpm exec nodemon"]
