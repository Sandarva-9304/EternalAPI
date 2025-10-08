# 1️⃣ Base image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json tsconfig*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project
COPY . .

# Build TypeScript
RUN npm run build

# 2️⃣ Production image
FROM node:18-alpine

WORKDIR /app

# Copy only the built files and dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy dist folder from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.env ./.env

# Expose the port your server uses
EXPOSE 3000

# Start the server
CMD ["node", "dist/server.js"]
