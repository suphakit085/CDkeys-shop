# CD Keys Marketplace

A full-stack digital game keys marketplace built with Next.js, NestJS, PostgreSQL, Prisma, PromptPay, and Stripe Hosted Checkout.

## Features

### Customer Features

- Browse game catalog with filters
- Search games
- Add games to cart
- Checkout with PromptPay or Stripe hosted card payment
- View purchased keys with reveal/copy
- Order history

### Admin Features

- Dashboard with sales stats
- Game management
- Bulk CD key upload
- Key status tracking
- Order monitoring
- Manual payment verification for PromptPay slips

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js App Router + Tailwind CSS |
| Backend | NestJS |
| Database | PostgreSQL + Prisma ORM |
| Auth | JWT access and refresh tokens |
| Payments | PromptPay + Stripe Checkout |

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
npm run db:generate
npm run db:migrate
npm run db:seed
npm run start:dev
```

Update `DATABASE_URL` and the payment environment variables in `backend/.env` before starting the backend.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Railway Backend Deployment

Use this when moving the backend from Render to Railway.

1. Create a new Railway project from the GitHub repository.
2. Add a PostgreSQL database service in the Railway project.
3. Create or select the backend service.
4. Set the backend service root directory to `/backend`.
5. Set the Railway config file path to `/backend/railway.json`.
6. Generate a public domain for the backend service.
7. Copy backend environment variables from Render into Railway.
8. Update Vercel frontend env to point at the new Railway backend URL.
9. Update Stripe webhook URL to the new Railway backend URL.

Railway will use [backend/railway.json](backend/railway.json) to build the Dockerfile, run Prisma migrations before deploy, start the NestJS server, and check `/api/health`.

Required Railway backend variables:

```bash
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
JWT_REFRESH_SECRET="..."
FRONTEND_URL="https://your-vercel-frontend-url"
PROMPTPAY_ID="..."
STRIPE_SECRET_KEY="sk_test_or_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_CURRENCY=usd
```

Recommended production variables when uploads/emails are enabled:

```bash
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
SMTP_HOST="..."
SMTP_PORT=587
SMTP_USER="..."
SMTP_PASS="..."
SMTP_FROM="..."
STORE_NAME="CD Keys Marketplace"
SLIPOK_API_KEY="..."
SLIPOK_BRANCH_ID="..."
```

After Railway generates a backend domain, update the frontend variables in Vercel:

```text
NEXT_PUBLIC_API_URL=https://your-railway-backend-domain/api
NEXT_PUBLIC_BACKEND_URL=https://your-railway-backend-domain
```

Then update the Stripe webhook endpoint to:

```text
https://your-railway-backend-domain/api/payment/stripe/webhook
```

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin@cdkeys.com | admin123 |
| Customer | demo@email.com | demo123 |

## Payment Setup

PromptPay remains the default payment method. Stripe is optional but needs these backend environment variables when enabled:

```bash
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_CURRENCY=usd
FRONTEND_URL="http://localhost:3000"
```

For Railway production, set `FRONTEND_URL` to the Vercel frontend URL and create a Stripe webhook that points to:

```text
https://your-railway-backend-domain/api/payment/stripe/webhook
```

Recommended Stripe webhook events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`

## Payment Flow

```text
Start Checkout
  -> Reserve key
  -> Choose payment method
     -> PromptPay: upload slip, verify payment, mark key as sold
     -> Stripe: redirect to hosted Checkout, confirm webhook, mark key as sold
```

## API Endpoints

### Auth

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Get profile

### Games

- `GET /api/games` - List games
- `GET /api/games/:id` - Get game details
- `POST /api/games` - Create game
- `PUT /api/games/:id` - Update game
- `DELETE /api/games/:id` - Delete game

### Orders

- `GET /api/orders` - My orders
- `POST /api/orders` - Create order
- `GET /api/orders/admin/stats` - Sales stats

### Payments

- `POST /api/payment/upload-slip/:orderId` - Upload PromptPay slip
- `POST /api/payment/verify/:orderId` - Verify payment manually
- `POST /api/payment/stripe/checkout/:orderId` - Create Stripe Checkout session
- `POST /api/payment/stripe/webhook` - Stripe webhook receiver

### Keys

- `GET /api/keys/game/:gameId` - Keys by game
- `POST /api/keys` - Bulk add keys
- `DELETE /api/keys/:id` - Delete key

## License

MIT
