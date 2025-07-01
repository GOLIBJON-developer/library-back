# Multi-stage build for Sambhram Library Application

# Stage 1: Build the frontend
FROM node:18-alpine AS frontend-builder

WORKDIR /app/client

# Copy package files
COPY client/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY client/ ./

# Build the application
RUN npm run build

# Stage 2: Build the backend
FROM node:18-alpine AS backend-builder

WORKDIR /app/server

# Copy package files
COPY server/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY server/ ./

# Stage 3: Production runtime
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built frontend
COPY --from=frontend-builder /app/client/dist ./client/dist

# Copy backend
COPY --from=backend-builder /app/server ./server

# Copy package files
COPY server/package*.json ./server/

# Install production dependencies
RUN cd server && npm ci --only=production

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to nodejs user
USER nodejs

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/app.js"] 