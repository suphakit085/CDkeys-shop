# Backend Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production

# Generate Prisma Client
RUN npx prisma generate

# Copy source
COPY . .

# Build
RUN npm run build

# Create uploads directory
RUN mkdir -p uploads/slips uploads/banners uploads/settings

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
