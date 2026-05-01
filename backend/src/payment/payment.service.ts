import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import generatePayload from 'promptpay-qr';
import QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { SlipOkService } from './slipok.service';
import { EmailService } from '../email/email.service';

export interface SlipUploadResult {
    autoVerified: boolean;
    message: string;
    slipData?: {
        amount?: number;
        transRef?: string;
    };
}

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);

    constructor(
        private prisma: PrismaService,
        private slipOkService: SlipOkService,
        private emailService: EmailService,
    ) { }

    async generatePromptPayQR(amount: number, orderId: string): Promise<string> {
        const promptpayId = process.env.PROMPTPAY_ID || '1409600385453';

        // Generate PromptPay payload
        const payload = generatePayload(promptpayId, { amount });

        // Convert to QR code (base64 data URL)
        const qrCodeDataUrl = await QRCode.toDataURL(payload);

        return qrCodeDataUrl;
    }

    async uploadPaymentSlip(orderId: string, userId: string, slipUrl: string): Promise<SlipUploadResult> {
        const order = await this.prisma.order.findFirst({
            where: {
                id: orderId,
                userId,
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.status !== 'PENDING') {
            throw new BadRequestException('Only pending orders can accept payment slips');
        }

        // Update slip URL first
        await this.prisma.order.update({
            where: { id: orderId },
            data: {
                paymentSlipUrl: slipUrl,
                paymentStatus: 'SLIP_UPLOADED',
            },
        });

        // Try auto verification with SlipOK
        this.logger.log(`Attempting SlipOK verification for order ${orderId}, isConfigured: ${this.slipOkService.isConfigured()}`);

        if (this.slipOkService.isConfigured()) {
            const verification = await this.slipOkService.verifySlip(slipUrl);

            if (verification.success && verification.amount) {
                const orderTotal = Number(order.total);
                const slipAmount = verification.amount;

                // Allow 1 THB tolerance for rounding
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
                } else {
                    this.logger.warn(`Amount mismatch for order ${orderId}: slip ${slipAmount}, order ${orderTotal}`);
                    return {
                        autoVerified: false,
                        message: `ยอดเงินไม่ตรง (สลิป: ฿${slipAmount}, คำสั่งซื้อ: ฿${orderTotal}) - รอ admin ตรวจสอบ`,
                        slipData: { amount: slipAmount },
                    };
                }
            } else {
                // SlipOK failed - notify admin
                await this.notifyAdminPendingPayment(orderId, slipUrl);
                return {
                    autoVerified: false,
                    message: verification.message || 'รอ admin ตรวจสอบ',
                };
            }
        }

        // No SlipOK - notify admin
        await this.notifyAdminPendingPayment(orderId, slipUrl);
        return {
            autoVerified: false,
            message: 'อัปโหลดสลิปสำเร็จ รอ admin ตรวจสอบ',
        };
    }

    private async notifyAdminPendingPayment(orderId: string, slipUrl: string): Promise<void> {
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
            const items = order.orderItems.map(item => ({
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

    private async markPaymentVerified(orderId: string, verifiedBy: string, promptpayRef?: string): Promise<void> {
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
                throw new NotFoundException('Order not found');
            }

            if (order.paymentStatus === 'VERIFIED') {
                throw new BadRequestException('Payment already verified');
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

    private async sendCompletedOrderEmails(orderId: string): Promise<void> {
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
            .filter(item => item.cdKey)
            .map(item => ({
                gameTitle: item.game.title,
                platform: item.game.platform,
                cdKey: item.cdKey!.keyCode,
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
        } catch (error) {
            this.logger.error(`Failed to send completed order emails for ${orderId}`, error);
        }
    }

    async verifyPayment(orderId: string, adminId: string): Promise<void> {
        await this.markPaymentVerified(orderId, adminId);
        await this.sendCompletedOrderEmails(orderId);
    }

    async rejectPayment(orderId: string, adminId: string, reason?: string): Promise<void> {
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
                throw new NotFoundException('Order not found');
            }

            if (order.paymentStatus === 'VERIFIED') {
                throw new BadRequestException('Cannot reject a verified payment');
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
}
