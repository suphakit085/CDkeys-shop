# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy prisma schema
COPY prisma ./prisma/

# Copy all source
COPY . .

# Build
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads/slips uploads/banners uploads/settings

EXPOSE 3001

# Run migrations and start (Prisma generate happens at runtime)
CMD npx prisma generate && npx prisma migrate deploy && npm run start:prod
