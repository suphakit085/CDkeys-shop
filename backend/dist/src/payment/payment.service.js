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
const crypto_1 = require("crypto");
const prisma_service_1 = require("../prisma/prisma.service");
const slipok_service_1 = require("./slipok.service");
const email_service_1 = require("../email/email.service");
const client_1 = require("@prisma/client");
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
                    const marked = await this.markPaymentVerified(orderId, 'AUTO_SLIPOK', { promptpayRef: verification.transRef });
                    if (marked) {
                        await this.sendCompletedOrderEmails(orderId);
                    }
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
    async markPaymentVerified(orderId, verifiedBy, options = {}) {
        return this.prisma.$transaction(async (tx) => {
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
                if (options.allowAlreadyVerified) {
                    return false;
                }
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
                    promptpayRef: options.promptpayRef,
                    stripeCheckoutSessionId: options.stripeCheckoutSessionId,
                    stripePaymentIntentId: options.stripePaymentIntentId,
                    stripePaymentStatus: options.stripePaymentStatus,
                    verifiedBy,
                    verifiedAt: new Date(),
                },
            });
            return true;
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
        const marked = await this.markPaymentVerified(orderId, adminId);
        if (marked) {
            await this.sendCompletedOrderEmails(orderId);
        }
    }
    async createStripeCheckoutSession(orderId, userId) {
        const order = await this.prisma.order.findFirst({
            where: {
                id: orderId,
                userId,
                status: 'PENDING',
            },
            include: {
                user: {
                    select: {
                        email: true,
                    },
                },
                orderItems: {
                    include: {
                        game: {
                            select: {
                                title: true,
                                platform: true,
                            },
                        },
                    },
                },
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Pending order not found');
        }
        if (order.paymentMethod !== client_1.PaymentMethod.CREDIT_CARD) {
            throw new common_1.BadRequestException('This order is not configured for Stripe');
        }
        if (order.paymentStatus === 'VERIFIED') {
            throw new common_1.BadRequestException('Payment already verified');
        }
        const frontendUrl = this.getFrontendUrl();
        const currency = this.getStripeCurrency();
        const body = new URLSearchParams({
            mode: 'payment',
            success_url: `${frontendUrl}/checkout/stripe/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
            cancel_url: `${frontendUrl}/checkout/stripe/cancel?order_id=${order.id}`,
            client_reference_id: order.id,
            customer_email: order.user.email,
            'metadata[orderId]': order.id,
            'metadata[userId]': userId,
            'payment_intent_data[metadata][orderId]': order.id,
            'payment_intent_data[metadata][userId]': userId,
        });
        order.orderItems.forEach((item, index) => {
            body.set(`line_items[${index}][quantity]`, '1');
            body.set(`line_items[${index}][price_data][currency]`, currency);
            body.set(`line_items[${index}][price_data][unit_amount]`, this.toStripeAmount(Number(item.price)).toString());
            body.set(`line_items[${index}][price_data][product_data][name]`, item.game.title);
            body.set(`line_items[${index}][price_data][product_data][metadata][platform]`, item.game.platform);
        });
        const session = await this.stripePost('/checkout/sessions', body);
        if (!session.url) {
            throw new common_1.InternalServerErrorException('Stripe did not return a checkout URL');
        }
        await this.prisma.order.update({
            where: { id: order.id },
            data: {
                stripeCheckoutSessionId: session.id,
                stripePaymentIntentId: session.payment_intent || undefined,
                stripePaymentStatus: session.payment_status || 'unpaid',
            },
        });
        return {
            url: session.url,
            sessionId: session.id,
        };
    }
    async handleStripeWebhook(rawBody, signature) {
        const event = this.parseStripeEvent(rawBody, signature);
        switch (event.type) {
            case 'checkout.session.completed':
            case 'checkout.session.async_payment_succeeded':
                await this.fulfillStripeCheckout(event.data.object);
                break;
            case 'checkout.session.expired':
                await this.expireStripeCheckout(event.data.object);
                break;
            default:
                this.logger.debug(`Unhandled Stripe event type: ${event.type}`);
        }
        return { received: true };
    }
    async fulfillStripeCheckout(session) {
        const orderId = session.metadata?.orderId || session.client_reference_id;
        if (!orderId) {
            throw new common_1.BadRequestException('Stripe session missing order reference');
        }
        if (session.payment_status && session.payment_status !== 'paid') {
            this.logger.warn(`Stripe checkout ${session.id} completed with payment_status=${session.payment_status}`);
            return;
        }
        const order = await this.prisma.order.findFirst({
            where: {
                OR: [{ id: orderId }, { stripeCheckoutSessionId: session.id }],
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found for Stripe checkout');
        }
        if (order.paymentMethod !== client_1.PaymentMethod.CREDIT_CARD) {
            throw new common_1.BadRequestException('Order is not a Stripe order');
        }
        if (session.amount_total !== null && session.amount_total !== undefined) {
            const expectedAmount = this.toStripeAmount(Number(order.total));
            if (session.amount_total !== expectedAmount) {
                throw new common_1.BadRequestException('Stripe amount does not match order total');
            }
        }
        const marked = await this.markPaymentVerified(order.id, 'STRIPE', {
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: session.payment_intent || undefined,
            stripePaymentStatus: session.payment_status || 'paid',
            allowAlreadyVerified: true,
        });
        if (marked) {
            await this.sendCompletedOrderEmails(order.id);
        }
    }
    async expireStripeCheckout(session) {
        const orderId = session.metadata?.orderId || session.client_reference_id;
        if (!orderId) {
            return;
        }
        await this.prisma.order.updateMany({
            where: {
                id: orderId,
                paymentMethod: client_1.PaymentMethod.CREDIT_CARD,
                paymentStatus: 'PENDING',
                status: 'PENDING',
            },
            data: {
                stripePaymentStatus: 'expired',
            },
        });
    }
    getStripeSecretKey() {
        const key = process.env.STRIPE_SECRET_KEY;
        if (!key) {
            throw new common_1.InternalServerErrorException('STRIPE_SECRET_KEY is not configured');
        }
        return key;
    }
    getStripeWebhookSecret() {
        const secret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!secret) {
            throw new common_1.InternalServerErrorException('STRIPE_WEBHOOK_SECRET is not configured');
        }
        return secret;
    }
    getStripeCurrency() {
        return (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();
    }
    getFrontendUrl() {
        return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    }
    toStripeAmount(amount) {
        return Math.round(amount * 100);
    }
    async stripePost(path, body) {
        const response = await fetch(`https://api.stripe.com/v1${path}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.getStripeSecretKey()}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
        });
        const data = (await response.json());
        if (!response.ok) {
            const message = typeof data?.error?.message === 'string'
                ? data.error.message
                : 'Stripe request failed';
            throw new common_1.BadRequestException(message);
        }
        return data;
    }
    parseStripeEvent(rawBody, signature) {
        if (!signature) {
            throw new common_1.BadRequestException('Missing Stripe signature');
        }
        const timestamp = this.extractStripeHeaderValue(signature, 't');
        const signatures = this.extractStripeHeaderValues(signature, 'v1');
        if (!timestamp || signatures.length === 0) {
            throw new common_1.BadRequestException('Invalid Stripe signature header');
        }
        const toleranceSeconds = 5 * 60;
        const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
        if (!Number.isFinite(ageSeconds) || ageSeconds > toleranceSeconds) {
            throw new common_1.BadRequestException('Expired Stripe signature');
        }
        const signedPayload = `${timestamp}.${rawBody}`;
        const expectedSignature = (0, crypto_1.createHmac)('sha256', this.getStripeWebhookSecret())
            .update(signedPayload, 'utf8')
            .digest('hex');
        const isValid = signatures.some((value) => this.safeCompareHex(value, expectedSignature));
        if (!isValid) {
            throw new common_1.BadRequestException('Invalid Stripe signature');
        }
        return JSON.parse(rawBody);
    }
    extractStripeHeaderValue(header, key) {
        return this.extractStripeHeaderValues(header, key)[0];
    }
    extractStripeHeaderValues(header, key) {
        return header
            .split(',')
            .map((part) => part.split('='))
            .filter(([name]) => name === key)
            .map(([, value]) => value)
            .filter(Boolean);
    }
    safeCompareHex(value, expected) {
        try {
            const valueBuffer = Buffer.from(value, 'hex');
            const expectedBuffer = Buffer.from(expected, 'hex');
            return (valueBuffer.length === expectedBuffer.length &&
                (0, crypto_1.timingSafeEqual)(valueBuffer, expectedBuffer));
        }
        catch {
            return false;
        }
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