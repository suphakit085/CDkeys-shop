# 🎮 CD Keys Marketplace

A full-stack digital game keys marketplace built with Next.js, NestJS, and PostgreSQL.

## Features

### Customer Features
- 🛒 Browse game catalog with filters (platform, genre, price)
- 🔍 Search games
- 🛍️ Add to cart & checkout
- 💳 Mock payment processing
- 🔑 View purchased keys with reveal/copy
- 📦 Order history

### Admin Features
- 📊 Dashboard with sales stats
- 🎮 Game management (CRUD)
- 🔐 Bulk CD key upload
- 📈 Key status tracking
- 👥 Order monitoring

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | NestJS |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT (Access + Refresh tokens) |

## Setup

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update DATABASE_URL in .env with your PostgreSQL connection

# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database with sample data
npm run db:seed

# Start development server
npm run start:dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@cdkeys.com | admin123 |
| Customer | demo@email.com | demo123 |

## Payment Flow

```
Start Checkout
    → Reserve Key (status: RESERVED)
    → Mock Payment
        → Success → Mark SOLD
        → Fail → Release Key (status: AVAILABLE)
```

## API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get profile (auth required)

### Games
- `GET /api/games` - List games (with filters)
- `GET /api/games/:id` - Get game details
- `POST /api/games` - Create game (admin)
- `PUT /api/games/:id` - Update game (admin)
- `DELETE /api/games/:id` - Delete game (admin)

### Orders
- `GET /api/orders` - My orders
- `POST /api/orders` - Create order
- `POST /api/orders/pay` - Process payment
- `GET /api/orders/admin/stats` - Sales stats (admin)

### Keys (Admin)
- `GET /api/keys/game/:gameId` - Keys by game
- `POST /api/keys` - Bulk add keys
- `DELETE /api/keys/:id` - Delete key

## License

MIT
