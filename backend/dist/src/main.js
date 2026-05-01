"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const fs_1 = require("fs");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        rawBody: true,
    });
    const uploadRoot = (0, path_1.join)(process.cwd(), 'uploads');
    for (const folder of ['slips', 'banners', 'settings']) {
        (0, fs_1.mkdirSync)((0, path_1.join)(uploadRoot, folder), { recursive: true });
    }
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
        process.env.FRONTEND_URL,
    ].filter(Boolean);
    app.enableCors({
        origin: allowedOrigins,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Stripe-Signature'],
        credentials: true,
    });
    app.useStaticAssets(uploadRoot, {
        prefix: '/uploads/',
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.setGlobalPrefix('api');
    app
        .getHttpAdapter()
        .get('/health', (_req, res) => {
        res.status(200).json({
            status: 'ok',
            service: 'cdkeys-backend',
            timestamp: new Date().toISOString(),
        });
    });
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`🚀 Backend running on http://localhost:${port}/api`);
}
void bootstrap();
//# sourceMappingURL=main.js.map