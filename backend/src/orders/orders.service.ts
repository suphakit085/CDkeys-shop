import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KeysService } from '../keys/keys.service';
import { PaymentService } from '../payment/payment.service';
import { OrderStatus } from '@prisma/client';
import { CreateOrderDto } from './dto/orders.dto';

@Injectable()
export class OrdersService {
    constructor(
        private prisma: PrismaService,
        private keysService: KeysService,
        private paymentService: PaymentService,
    ) { }

    // Get user's order history
    async findByUser(userId: string) {
        return this.prisma.order.findMany({
            where: { userId },
            include: {
                orderItems: {
                    include: {
                        game: { select: { id: true, title: true, platform: true, imageUrl: true } },
                        cdKey: { select: { keyCode: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Get single order details
    async findOne(orderId: string, userId: string) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, userId },
            include: {
                orderItems: {
                    include: {
                        game: { select: { id: true, title: true, platform: true, imageUrl: true } },
                        cdKey: { select: { keyCode: true } },
                    },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return order;
    }

    // Step 1: Create order and reserve keys
    async createOrder(userId: string, dto: CreateOrderDto) {
        const reservedKeys: { gameId: string; keyId: string; price: number }[] = [];

        try {
            // Get game prices and reserve keys
            for (const item of dto.items) {
                const game = await this.prisma.game.findUnique({
                    where: { id: item.gameId },
                });

                if (!game) {
                    throw new BadRequestException(`Game ${item.gameId} not found`);
                }

                // Reserve keys for each quantity
                for (let i = 0; i < item.quantity; i++) {
                    const keyId = await this.keysService.reserveKey(item.gameId);

                    if (!keyId) {
                        throw new BadRequestException(
                            `Not enough keys available for ${game.title}`,
                        );
                    }

                    reservedKeys.push({
                        gameId: item.gameId,
                        keyId,
                        price: Number(game.price),
                    });
                }
            }

            // Calculate total
            const total = reservedKeys.reduce((sum, item) => sum + item.price, 0);

            // Generate PromptPay QR code
            const qrCodeData = await this.paymentService.generatePromptPayQR(total, '');

            // Create order with items
            const order = await this.prisma.order.create({
                data: {
                    userId,
                    total,
                    status: OrderStatus.PENDING,
                    qrCodeData, // Save QR code
                    orderItems: {
                        create: reservedKeys.map((item) => ({
                            gameId: item.gameId,
                            price: item.price,
                        })),
                    },
                },
                include: {
                    orderItems: {
                        include: {
                            game: { select: { title: true, platform: true } },
                        },
                    },
                },
            });

            // Link reserved keys to order items
            for (let i = 0; i < reservedKeys.length; i++) {
                await this.prisma.cdKey.update({
                    where: { id: reservedKeys[i].keyId },
                    data: { orderItemId: order.orderItems[i].id },
                });
            }

            return order;
        } catch (error) {
            // Release all reserved keys on failure
            for (const item of reservedKeys) {
                await this.keysService.releaseKey(item.keyId);
            }
            throw error;
        }
    }

    // Step 2: Process mock payment
    async processPayment(orderId: string, userId: string, simulateFail = false) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, userId, status: OrderStatus.PENDING },
            include: {
                orderItems: {
                    select: { id: true },
                },
            },
        });

        if (!order) {
            throw new NotFoundException('Pending order not found');
        }

        if (simulateFail) {
            // Payment failed - release keys and mark order as failed
            const keys = await this.prisma.cdKey.findMany({
                where: {
                    orderItemId: { in: order.orderItems.map((i) => i.id) },
                },
            });

            for (const key of keys) {
                await this.keysService.releaseKey(key.id);
            }

            await this.prisma.order.update({
                where: { id: orderId },
                data: { status: OrderStatus.FAILED },
            });

            return { success: false, message: 'Payment failed' };
        }

        // Payment success - mark keys as sold
        await this.prisma.cdKey.updateMany({
            where: {
                orderItemId: { in: order.orderItems.map((i) => i.id) },
            },
            data: { status: 'SOLD' },
        });

        // Update order status
        const completedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.COMPLETED },
            include: {
                orderItems: {
                    include: {
                        game: { select: { title: true, platform: true, imageUrl: true } },
                        cdKey: { select: { keyCode: true } },
                    },
                },
            },
        });

        return {
            success: true,
            message: 'Payment successful',
            order: completedOrder,
        };
    }

    // Cancel a pending order (releases keys)
    async cancelOrder(orderId: string, userId: string) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, userId, status: OrderStatus.PENDING },
            include: {
                orderItems: { select: { id: true } },
            },
        });

        if (!order) {
            throw new NotFoundException('Pending order not found');
        }

        // Release keys
        const keys = await this.prisma.cdKey.findMany({
            where: {
                orderItemId: { in: order.orderItems.map((i) => i.id) },
            },
        });

        for (const key of keys) {
            await this.keysService.releaseKey(key.id);
        }

        // Update order status
        return this.prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.FAILED },
        });
    }

    // Admin: get all orders
    async findAll() {
        return this.prisma.order.findMany({
            include: {
                user: { select: { email: true, name: true } },
                orderItems: {
                    include: {
                        game: { select: { title: true, platform: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Admin: get sales stats
    async getSalesStats() {
        const [totalSales, totalOrders, recentOrders] = await Promise.all([
            this.prisma.order.aggregate({
                where: { status: OrderStatus.COMPLETED },
                _sum: { total: true },
                _count: true,
            }),
            this.prisma.order.groupBy({
                by: ['status'],
                _count: { status: true },
            }),
            this.prisma.order.findMany({
                where: { status: OrderStatus.COMPLETED },
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { email: true } },
                    orderItems: {
                        include: { game: { select: { title: true } } },
                    },
                },
            }),
        ]);

        return {
            totalRevenue: totalSales._sum.total || 0,
            completedOrders: totalSales._count,
            ordersByStatus: totalOrders.reduce(
                (acc, curr) => {
                    acc[curr.status.toLowerCase()] = curr._count.status;
                    return acc;
                },
                {} as Record<string, number>,
            ),
            recentOrders,
        };
    }
}
