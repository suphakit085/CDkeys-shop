"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const client_1 = require("@prisma/client");
const payment_service_1 = require("./payment.service");
const path_1 = require("path");
const cloudinary_service_1 = require("../cloudinary/cloudinary.service");
const multerOptions = {
    storage: (0, multer_1.memoryStorage)(),
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
            cb(null, true);
        }
        else {
            cb(new common_1.BadRequestException('Only image files allowed'));
        }
    },
};
let PaymentController = class PaymentController {
    paymentService;
    cloudinaryService;
    constructor(paymentService, cloudinaryService) {
        this.paymentService = paymentService;
        this.cloudinaryService = cloudinaryService;
    }
    async uploadSlip(orderId, file, req) {
        if (!file) {
            throw new common_1.BadRequestException('No file uploaded');
        }
        const slipUpload = await this.storeSlip(file);
        let result;
        try {
            result = await this.paymentService.uploadPaymentSlip(orderId, req.user.id, slipUpload.url);
        }
        catch (error) {
            await this.cleanupStoredSlip(slipUpload);
            throw error;
        }
        return {
            message: result.message,
            slipUrl: slipUpload.url,
            autoVerified: result.autoVerified,
            slipData: result.slipData,
        };
    }
    async storeSlip(file) {
        if (this.cloudinaryService.isEnabled()) {
            const result = await this.cloudinaryService.uploadImage(file, 'slips');
            return {
                url: result.url,
                publicId: result.publicId,
                provider: 'cloudinary',
            };
        }
        const fs = await import('fs/promises');
        const path = await import('path');
        const uploadDir = path.join(process.cwd(), 'uploads', 'slips');
        await fs.mkdir(uploadDir, { recursive: true });
        const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
        const filename = `${randomName}${(0, path_1.extname)(file.originalname)}`;
        await fs.writeFile(path.join(uploadDir, filename), file.buffer);
        return {
            url: `/uploads/slips/${filename}`,
            filename,
            provider: 'local',
        };
    }
    async cleanupStoredSlip(slip) {
        if (slip.provider === 'cloudinary' && slip.publicId) {
            await this.cloudinaryService.deleteImage(slip.publicId);
            return;
        }
        if (slip.provider === 'local' && slip.filename) {
            const fs = await import('fs/promises');
            const path = await import('path');
            await fs
                .unlink(path.join(process.cwd(), 'uploads', 'slips', slip.filename))
                .catch(() => undefined);
        }
    }
    async createStripeCheckout(orderId, req) {
        return this.paymentService.createStripeCheckoutSession(orderId, req.user.id);
    }
    async handleStripeWebhook(req, signature) {
        const rawBody = req.rawBody?.toString('utf8');
        if (!rawBody) {
            throw new common_1.BadRequestException('Missing raw request body');
        }
        return this.paymentService.handleStripeWebhook(rawBody, signature);
    }
    async verifyPayment(orderId, req) {
        await this.paymentService.verifyPayment(orderId, req.user.id);
        return { message: 'Payment verified successfully' };
    }
    async rejectPayment(orderId, reason, req) {
        await this.paymentService.rejectPayment(orderId, req.user.id, reason);
        return { message: 'Payment rejected' };
    }
    async getPendingPayments() {
        return this.paymentService.getPendingPayments();
    }
};
exports.PaymentController = PaymentController;
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('promptpay/upload-slip/:orderId'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('slip', multerOptions)),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "uploadSlip", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Post)('stripe/checkout/:orderId'),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "createStripeCheckout", null);
__decorate([
    (0, common_1.Post)('stripe/webhook'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Headers)('stripe-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "handleStripeWebhook", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, common_1.Post)('verify/:orderId'),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "verifyPayment", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, common_1.Post)('reject/:orderId'),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Body)('reason')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "rejectPayment", null);
__decorate([
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)(client_1.Role.ADMIN),
    (0, common_1.Get)('pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PaymentController.prototype, "getPendingPayments", null);
exports.PaymentController = PaymentController = __decorate([
    (0, common_1.Controller)('payment'),
    __metadata("design:paramtypes", [payment_service_1.PaymentService,
        cloudinary_service_1.CloudinaryService])
], PaymentController);
//# sourceMappingURL=payment.controller.js.map