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

    async uploadPaymentSlip(orderId: string, slipUrl: string): Promise<SlipUploadResult> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                orderItems: {
                    include: {
                        cdKey: true,
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
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

                    // Auto verify payment
                    for (const item of order.orderItems) {
                        if (item.cdKey) {
                            await this.prisma.cdKey.update({
                                where: { id: item.cdKey.id },
                                data: { status: 'SOLD' },
                            });
                        }
                    }

                    await this.prisma.order.update({
                        where: { id: orderId },
                        data: {
                            status: 'COMPLETED',
                            paymentStatus: 'VERIFIED',
                            paidAt: new Date(),
                            promptpayRef: verification.transRef,
                            verifiedBy: 'AUTO_SLIPOK',
                            verifiedAt: new Date(),
                        },
                    });

                    // Send emails for auto-verified orders
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

                    if (completedOrder && completedOrder.user && this.emailService.isConfigured()) {
                        const emailItems = completedOrder.orderItems
                            .filter(item => item.cdKey)
                            .map(item => ({
                                gameTitle: item.game.title,
                                platform: item.game.platform,
                                cdKey: item.cdKey!.keyCode,
                            }));

                        // Send CD Keys to customer
                        await this.emailService.sendCdKeysEmail({
                            orderId: completedOrder.id,
                            customerEmail: completedOrder.user.email,
                            customerName: completedOrder.user.name,
                            items: emailItems,
                            total: Number(completedOrder.total),
                        });

                        // Notify store about new order
                        await this.emailService.sendNewOrderNotification({
                            orderId: completedOrder.id,
                            customerEmail: completedOrder.user.email,
                            customerName: completedOrder.user.name,
                            items: emailItems,
                            total: Number(completedOrder.total),
                        });
                    }

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

    async verifyPayment(orderId: string, adminId: string): Promise<void> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                orderItems: {
                    include: {
                        cdKey: true,
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        if (order.paymentStatus === 'VERIFIED') {
            throw new BadRequestException('Payment already verified');
        }

        // Mark keys as SOLD
        for (const item of order.orderItems) {
            if (item.cdKey) {
                await this.prisma.cdKey.update({
                    where: { id: item.cdKey.id },
                    data: { status: 'SOLD' },
                });
            }
        }

        // Update order
        await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: 'COMPLETED',
                paymentStatus: 'VERIFIED',
                paidAt: new Date(),
                verifiedBy: adminId,
                verifiedAt: new Date(),
            },
        });

        // Send CD Keys via email
        const fullOrder = await this.prisma.order.findUnique({
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

        if (fullOrder && fullOrder.user && this.emailService.isConfigured()) {
            const emailItems = fullOrder.orderItems
                .filter(item => item.cdKey)
                .map(item => ({
                    gameTitle: item.game.title,
                    platform: item.game.platform,
                    cdKey: item.cdKey!.keyCode,
                }));

            await this.emailService.sendCdKeysEmail({
                orderId: fullOrder.id,
                customerEmail: fullOrder.user.email,
                customerName: fullOrder.user.name,
                items: emailItems,
                total: Number(fullOrder.total),
            });

            // Notify store about new order
            await this.emailService.sendNewOrderNotification({
                orderId: fullOrder.id,
                customerEmail: fullOrder.user.email,
                customerName: fullOrder.user.name,
                items: emailItems,
                total: Number(fullOrder.total),
            });
        }
    }

    async rejectPayment(orderId: string, adminId: string, reason?: string): Promise<void> {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                orderItems: {
                    include: {
                        cdKey: true,
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        // Release reserved keys back to AVAILABLE
        for (const item of order.orderItems) {
            if (item.cdKey && item.cdKey.status === 'RESERVED') {
                await this.prisma.cdKey.update({
                    where: { id: item.cdKey.id },
                    data: { status: 'AVAILABLE' },
                });
            }
        }

        // Update order status to FAILED
        await this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: 'FAILED',
                paymentStatus: 'REJECTED',
                verifiedBy: adminId,
                verifiedAt: new Date(),
                promptpayRef: reason,
            },
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
