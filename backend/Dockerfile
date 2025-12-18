# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy prisma schema AND migrations
COPY prisma ./prisma/

# Generate Prisma Client
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Copy all source
COPY . .

# Build TypeScript
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads/slips uploads/banners uploads/settings

# Verify migrations folder
RUN ls -la prisma/migrations/ || echo "No migrations folder!"

EXPOSE 3001

# Use db push instead of migrate deploy for first deploy
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run start:prod"]
