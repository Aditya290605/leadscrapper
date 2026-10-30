# ── Stage 1: Build the React Frontend ──
FROM node:20-alpine AS client-builder
WORKDIR /app/client

# Install frontend dependencies
COPY client/package*.json ./
RUN npm ci || npm install

# Build static React production bundle
COPY client/ ./
RUN npm run build

# ── Stage 2: Production Server ──
FROM node:20-alpine
WORKDIR /app

# Install backend dependencies (production only)
COPY server/package*.json ./server/
RUN cd server && (npm ci --omit=dev || npm install --omit=dev)

# Copy backend code
COPY server/ ./server/

# Copy compiled frontend from Stage 1 into client/dist
COPY --from=client-builder /app/client/dist ./client/dist

# Cloud Run defaults to container port 8080
ENV PORT=8080
ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "server/index.js"]

