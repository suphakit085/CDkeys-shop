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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const keys_service_1 = require("../keys/keys.service");
const payment_service_1 = require("../payment/payment.service");
const client_1 = require("@prisma/client");
let OrdersService = class OrdersService {
    prisma;
    keysService;
    paymentService;
    constructor(prisma, keysService, paymentService) {
        this.prisma = prisma;
        this.keysService = keysService;
        this.paymentService = paymentService;
    }
    async findByUser(userId) {
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
    async findOne(orderId, userId) {
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
            throw new common_1.NotFoundException('Order not found');
        }
        return order;
    }
    async createOrder(userId, dto) {
        const reservedKeys = [];
        try {
            for (const item of dto.items) {
                const game = await this.prisma.game.findUnique({
                    where: { id: item.gameId },
                });
                if (!game) {
                    throw new common_1.BadRequestException(`Game ${item.gameId} not found`);
                }
                for (let i = 0; i < item.quantity; i++) {
                    const keyId = await this.keysService.reserveKey(item.gameId);
                    if (!keyId) {
                        throw new common_1.BadRequestException(`Not enough keys available for ${game.title}`);
                    }
                    reservedKeys.push({
                        gameId: item.gameId,
                        keyId,
                        price: Number(game.price),
                    });
                }
            }
            const total = reservedKeys.reduce((sum, item) => sum + item.price, 0);
            const qrCodeData = await this.paymentService.generatePromptPayQR(total, '');
            const order = await this.prisma.order.create({
                data: {
                    userId,
                    total,
                    status: client_1.OrderStatus.PENDING,
                    qrCodeData,
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
            for (let i = 0; i < reservedKeys.length; i++) {
                await this.prisma.cdKey.update({
                    where: { id: reservedKeys[i].keyId },
                    data: { orderItemId: order.orderItems[i].id },
                });
            }
            return order;
        }
        catch (error) {
            for (const item of reservedKeys) {
                await this.keysService.releaseKey(item.keyId);
            }
            throw error;
        }
    }
    async processPayment(orderId, userId, simulateFail = false) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, userId, status: client_1.OrderStatus.PENDING },
            include: {
                orderItems: {
                    select: { id: true },
                },
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Pending order not found');
        }
        if (simulateFail) {
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
                data: { status: client_1.OrderStatus.FAILED },
            });
            return { success: false, message: 'Payment failed' };
        }
        await this.prisma.cdKey.updateMany({
            where: {
                orderItemId: { in: order.orderItems.map((i) => i.id) },
            },
            data: { status: 'SOLD' },
        });
        const completedOrder = await this.prisma.order.update({
            where: { id: orderId },
            data: { status: client_1.OrderStatus.COMPLETED },
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
    async cancelOrder(orderId, userId) {
        const order = await this.prisma.order.findFirst({
            where: { id: orderId, userId, status: client_1.OrderStatus.PENDING },
            include: {
                orderItems: { select: { id: true } },
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Pending order not found');
        }
        const keys = await this.prisma.cdKey.findMany({
            where: {
                orderItemId: { in: order.orderItems.map((i) => i.id) },
            },
        });
        for (const key of keys) {
            await this.keysService.releaseKey(key.id);
        }
        return this.prisma.order.update({
            where: { id: orderId },
            data: { status: client_1.OrderStatus.FAILED },
        });
    }
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
    async getSalesStats() {
        const [totalSales, totalOrders, recentOrders] = await Promise.all([
            this.prisma.order.aggregate({
                where: { status: client_1.OrderStatus.COMPLETED },
                _sum: { total: true },
                _count: true,
            }),
            this.prisma.order.groupBy({
                by: ['status'],
                _count: { status: true },
            }),
            this.prisma.order.findMany({
                where: { status: client_1.OrderStatus.COMPLETED },
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
            ordersByStatus: totalOrders.reduce((acc, curr) => {
                acc[curr.status.toLowerCase()] = curr._count.status;
                return acc;
            }, {}),
            recentOrders,
        };
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        keys_service_1.KeysService,
        payment_service_1.PaymentService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map