# Production Security Checklist

## Auth Rate Limits

Set these in Railway backend environment variables:

```env
AUTH_LOGIN_MAX_ATTEMPTS=5
AUTH_LOGIN_WINDOW_SECONDS=900
AUTH_LOGIN_LOCK_SECONDS=900
AUTH_REQUEST_MAX_ATTEMPTS=10
AUTH_REQUEST_WINDOW_SECONDS=600
```

Login is locked per IP and email after repeated failed attempts. Register,
refresh, password reset, and magic-link endpoints are also throttled per IP.

The current limiter is in-memory, which is fine for a single Railway backend
instance. If you scale to multiple replicas, move these counters to Redis so
every replica shares the same lock state.

## Admin Endpoints

Admin-only write actions are protected by JWT plus admin role checks:

- `/api/games/import/*`
- `/api/games` write endpoints
- `/api/keys/*`
- `/api/orders/admin/*`
- `/api/payment/pending`
- `/api/payment/verify/*`
- `/api/payment/reject/*`
- `/api/payment/resend-keys/*`
- `/api/banners/admin`
- `/api/banners` write endpoints
- `/api/settings` write endpoints
- `/api/upload/image`

Public read endpoints remain open for storefront browsing.

## CD Key Visibility

Customer order responses hide `cdKey` unless:

- `order.status` is `COMPLETED`
- `order.paymentStatus` is `VERIFIED`

Admins can still view delivered keys in the admin console.

## Railway Postgres Backup

From your computer, use Railway's public database URL, not the internal
`postgres.railway.internal` URL.

```powershell
$env:DATABASE_PUBLIC_URL="postgresql://..."
.\scripts\backup-railway-postgres.ps1
```

The script creates a custom-format `.dump` file in `.\backups`.

To restore into another Postgres database:

```powershell
pg_restore --clean --if-exists --no-owner --no-acl --dbname "postgresql://..." .\backups\railway-postgres-YYYYMMDD-HHMMSS.dump
```

Recommended cadence before launch:

- Manual backup before every deploy that touches Prisma/database logic.
- Scheduled daily backup through Railway cron, GitHub Actions, or a trusted
  backup service.
- Keep at least 7 daily backups and 4 weekly backups.
