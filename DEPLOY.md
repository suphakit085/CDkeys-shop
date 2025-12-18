# 🚀 CDKeys Marketplace - Deployment Guide

## 📋 Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname"

# JWT (ใช้ค่าที่ random)
JWT_SECRET="your-random-secret-32chars-minimum"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your-random-refresh-secret-32chars"
JWT_REFRESH_EXPIRES_IN="7d"

# Server
PORT=3001

# PromptPay
PROMPTPAY_ID=your-promptpay-number

# SlipOK (optional - for auto verification)
SLIPOK_API_KEY=your-slipok-key
SLIPOK_BRANCH_ID=your-branch-id

# Email SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
STORE_NAME="Your Store Name"

# Cloudinary (for image storage)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Frontend URL
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com/api
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com
```

---

## 🏗️ Build Commands

### Backend
```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
npm run start:prod
```

### Frontend
```bash
cd frontend
npm install
npm run build
npm run start
```

---

## 📦 Deploy Options

### Option 1: Railway / Render / Fly.io
- ง่ายที่สุด, มี free tier
- รองรับ PostgreSQL managed

### Option 2: VPS (DigitalOcean, Linode)
- ควบคุมเต็มที่
- ต้อง setup Docker หรือ PM2

### Option 3: Vercel + Railway
- Frontend → Vercel
- Backend → Railway

---

## ⚠️ Pre-deploy Checklist

- [ ] เปลี่ยน JWT_SECRET เป็นค่า random
- [ ] ตั้งค่า DATABASE_URL ให้ถูกต้อง
- [ ] ตั้งค่า Cloudinary (ถ้าต้องการ image storage)
- [ ] ตั้งค่า SMTP สำหรับ email
- [ ] ตั้งค่า FRONTEND_URL
- [ ] ตั้งค่า NEXT_PUBLIC_API_URL

---

## 🔒 Security Notes

1. **ไม่ commit .env** - ใช้ platform's secrets management
2. **เปลี่ยน JWT secrets** - ใช้ค่า random 32+ characters
3. **CORS** - ตั้งค่า allowed origins
4. **HTTPS** - ใช้ SSL certificate
