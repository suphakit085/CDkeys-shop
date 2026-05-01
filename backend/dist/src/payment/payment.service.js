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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const promptpay_qr_1 = __importDefault(require("promptpay-qr"));
const qrcode_1 = require("qrcode");
const prisma_service_1 = require("../prisma/prisma.service");
const slipok_service_1 = require("./slipok.service");
const email_service_1 = require("../email/email.service");
let PaymentService = PaymentService_1 = class PaymentService {
    prisma;
    slipOkService;
    emailService;
    logger = new common_1.Logger(PaymentService_1.name);
    constructor(prisma, slipOkService, emailService) {
        this.prisma = prisma;
        this.slipOkService = slipOkService;
        this.emailService = emailService;
    }
    async generatePromptPayQR(amount) {
        const promptpayId = process.env.PROMPTPAY_ID || '1409600385453';
        const payload = (0, promptpay_qr_1.default)(promptpayId, { amount });
        const qrCodeDataUrl = await (0, qrcode_1.toDataURL)(payload);
        return qrCodeDataUrl;
    }
    async uploadPaymentSlip(orderId, userId, slipUrl) {
        const order = await this.prisma.order.findFirst({
            where: {
                id: orderId,
                userId,
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.status !== 'PENDING') {
            throw new common_1.BadRequestException('Only pending orders can accept payment slips');
        }
        await this.prisma.order.update({
            where: { id: orderId },
            data: {
                paymentSlipUrl: slipUrl,
                paymentStatus: 'SLIP_UPLOADED',
            },
        });
        this.logger.log(`Attempting SlipOK verification for order ${orderId}, isConfigured: ${this.slipOkService.isConfigured()}`);
        if (this.slipOkService.isConfigured()) {
            const verification = await this.slipOkService.verifySlip(slipUrl);
            if (verification.success && verification.amount) {
                const orderTotal = Number(order.total);
                const slipAmount = verification.amount;
                if (Math.abs(slipAmount - orderTotal) <= 1) {
                    this.logger.log(`Auto-verifying order ${orderId}: slip amount ${slipAmount} matches order total ${orderTotal}`);
                    await this.markPaymentVerified(orderId, 'AUTO_SLIPOK', verification.transRef);
                    await this.sendCompletedOrderEmails(orderId);
                    return {
                        autoVerified: true,
                        message: 'ชำระเงินสำเร็จ! ระบบตรวจสอบยอดเงินถูกต้อง',
                        slipData: {
                            amount: slipAmount,
                            transRef: verification.transRef,
                        },
                    };
                }
                else {
                    this.logger.warn(`Amount mismatch for order ${orderId}: slip ${slipAmount}, order ${orderTotal}`);
                    return {
                        autoVerified: false,
                        message: `ยอดเงินไม่ตรง (สลิป: ฿${slipAmount}, คำสั่งซื้อ: ฿${orderTotal}) - รอ admin ตรวจสอบ`,
                        slipData: { amount: slipAmount },
                    };
                }
            }
            else {
                await this.notifyAdminPendingPayment(orderId, slipUrl);
                return {
                    autoVerified: false,
                    message: verification.message || 'รอ admin ตรวจสอบ',
                };
            }
        }
        await this.notifyAdminPendingPayment(orderId, slipUrl);
        return {
            autoVerified: false,
            message: 'อัปโหลดสลิปสำเร็จ รอ admin ตรวจสอบ',
        };
    }
    async notifyAdminPendingPayment(orderId, slipUrl) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: true,
                orderItems: {
                    include: {
                        game: true,
                    },
                },
            },
        });
        if (order && order.user && this.emailService.isConfigured()) {
            const items = order.orderItems.map((item) => ({
                gameTitle: item.game.title,
                platform: item.game.platform,
            }));
            await this.emailService.sendPendingPaymentNotification({
                orderId: order.id,
                customerEmail: order.user.email,
                customerName: order.user.name,
                total: Number(order.total),
                slipUrl,
                items,
            });
        }
    }
    async markPaymentVerified(orderId, verifiedBy, promptpayRef) {
        await this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: {
                    orderItems: {
                        select: { id: true },
                    },
                },
            });
            if (!order) {
                throw new common_1.NotFoundException('Order not found');
            }
            if (order.paymentStatus === 'VERIFIED') {
                throw new common_1.BadRequestException('Payment already verified');
            }
            const orderItemIds = order.orderItems.map((item) => item.id);
            if (orderItemIds.length > 0) {
                await tx.cdKey.updateMany({
                    where: {
                        orderItemId: { in: orderItemIds },
                    },
                    data: {
                        status: 'SOLD',
                    },
                });
            }
            await tx.order.update({
                where: { id: orderId },
                data: {
                    status: 'COMPLETED',
                    paymentStatus: 'VERIFIED',
                    paidAt: new Date(),
                    promptpayRef,
                    verifiedBy,
                    verifiedAt: new Date(),
                },
            });
        });
    }
    async sendCompletedOrderEmails(orderId) {
        if (!this.emailService.isConfigured()) {
            return;
        }
        const completedOrder = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                user: true,
                orderItems: {
                    include: {
                        game: true,
                        cdKey: true,
                    },
                },
            },
        });
        if (!completedOrder?.user) {
            return;
        }
        const emailItems = completedOrder.orderItems
            .filter((item) => item.cdKey)
            .map((item) => ({
            gameTitle: item.game.title,
            platform: item.game.platform,
            cdKey: item.cdKey.keyCode,
        }));
        try {
            await this.emailService.sendCdKeysEmail({
                orderId: completedOrder.id,
                customerEmail: completedOrder.user.email,
                customerName: completedOrder.user.name,
                items: emailItems,
                total: Number(completedOrder.total),
            });
            await this.emailService.sendNewOrderNotification({
                orderId: completedOrder.id,
                customerEmail: completedOrder.user.email,
                customerName: completedOrder.user.name,
                items: emailItems,
                total: Number(completedOrder.total),
            });
        }
        catch (error) {
            this.logger.error(`Failed to send completed order emails for ${orderId}`, error);
        }
    }
    async verifyPayment(orderId, adminId) {
        await this.markPaymentVerified(orderId, adminId);
        await this.sendCompletedOrderEmails(orderId);
    }
    async rejectPayment(orderId, adminId, reason) {
        await this.prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id: orderId },
                include: {
                    orderItems: {
                        select: { id: true },
                    },
                },
            });
            if (!order) {
                throw new common_1.NotFoundException('Order not found');
            }
            if (order.paymentStatus === 'VERIFIED') {
                throw new common_1.BadRequestException('Cannot reject a verified payment');
            }
            const orderItemIds = order.orderItems.map((item) => item.id);
            if (orderItemIds.length > 0) {
                await tx.cdKey.updateMany({
                    where: {
                        orderItemId: { in: orderItemIds },
                        status: 'RESERVED',
                    },
                    data: {
                        status: 'AVAILABLE',
                        reservedAt: null,
                        orderItemId: null,
                    },
                });
            }
            await tx.order.update({
                where: { id: orderId },
                data: {
                    status: 'FAILED',
                    paymentStatus: 'REJECTED',
                    verifiedBy: adminId,
                    verifiedAt: new Date(),
                    promptpayRef: reason,
                },
            });
        });
    }
    async getPendingPayments() {
        return this.prisma.order.findMany({
            where: {
                paymentStatus: {
                    in: ['SLIP_UPLOADED'],
                },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                    },
                },
                orderItems: {
                    include: {
                        game: {
                            select: {
                                id: true,
                                title: true,
                                imageUrl: true,
                                platform: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = PaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        slipok_service_1.SlipOkService,
        email_service_1.EmailService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map