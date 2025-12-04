# MCP Gateway Docker Image
# Provides centralized MCP server for 270+ external integrations
#
# Architecture:
#   Next.js App → HTTP/JSON-RPC → MCP Gateway → External APIs
#                                      ↓
#                              Redis (token cache)
#
# Build: docker build -t mcp-gateway .
# Run: docker run -p 3100:3100 mcp-gateway

FROM node:20-alpine AS base

# Install dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci --only=production

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3100

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 gateway

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules

# Copy application
COPY gateway.js ./
COPY providers ./providers

# Set ownership
RUN chown -R gateway:nodejs /app

USER gateway

EXPOSE 3100

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3100/health || exit 1

CMD ["node", "gateway.js"]
