# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy prisma schema and generate
COPY prisma ./prisma/
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Copy all source
COPY . .

# Build TypeScript - show output for debugging
RUN echo "Building NestJS..." && npm run build && echo "Build complete" && ls -la dist/ && ls -la dist/src/ || echo "No dist/src folder"

# Create uploads directory
RUN mkdir -p uploads/slips uploads/banners uploads/settings

EXPOSE 3001

# Run migrations and start - try different paths
CMD ["sh", "-c", "npx prisma migrate deploy && (node dist/main.js || node dist/src/main.js || npm run start:prod)"]
