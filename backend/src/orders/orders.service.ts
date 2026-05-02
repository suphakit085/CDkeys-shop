import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KeysService } from '../keys/keys.service';
import { PaymentService } from '../payment/payment.service';
import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { CreateOrderDto } from './dto/orders.dto';
import { OrderExpirationService } from './order-expiration.service';

interface AdminOrderFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private keysService: KeysService,
    private paymentService: PaymentService,
    private orderExpirationService: OrderExpirationService,
  ) {}

  // Get user's order history
  async findByUser(userId: string) {
    await this.orderExpirationService.expireUnpaidOrders(userId);

    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        orderItems: {
          include: {
            game: {
              select: { id: true, title: true, platform: true, imageUrl: true },
            },
            cdKey: { select: { keyCode: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.hideUndeliveredKeys(order));
  }

  // Get single order details
  async findOne(orderId: string, userId: string) {
    await this.orderExpirationService.expireOrderIfNeeded(orderId, userId);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        orderItems: {
          include: {
            game: {
              select: { id: true, title: true, platform: true, imageUrl: true },
            },
            cdKey: { select: { keyCode: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.hideUndeliveredKeys(order);
  }

  // Step 1: Create order and reserve keys
  async createOrder(userId: string, dto: CreateOrderDto) {
    await this.orderExpirationService.expireUnpaidOrders();

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

      const paymentMethod = dto.paymentMethod || PaymentMethod.PROMPTPAY;
      const qrCodeData =
        paymentMethod === PaymentMethod.PROMPTPAY
          ? await this.paymentService.generatePromptPayQR(total)
          : null;

      // Create order with items
      const order = await this.prisma.order.create({
        data: {
          userId,
          total,
          status: OrderStatus.PENDING,
          paymentMethod,
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
    await this.orderExpirationService.expireOrderIfNeeded(orderId, userId);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, status: OrderStatus.PENDING },
      include: {
        orderItems: {
          select: { id: true },
        },
      },
    });

    if (!order) {
      const cancelledOrder = await this.prisma.order.findFirst({
        where: { id: orderId, userId, status: OrderStatus.CANCELLED },
        include: this.customerOrderInclude(),
      });

      if (cancelledOrder) {
        return this.hideUndeliveredKeys(cancelledOrder);
      }

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
        data: {
          status: OrderStatus.FAILED,
          paymentStatus: PaymentStatus.REJECTED,
        },
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
      data: {
        status: OrderStatus.COMPLETED,
        paymentStatus: PaymentStatus.VERIFIED,
        paidAt: new Date(),
      },
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

  async changePaymentMethod(
    orderId: string,
    userId: string,
    paymentMethod: PaymentMethod,
  ) {
    await this.orderExpirationService.expireOrderIfNeeded(orderId, userId);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, status: OrderStatus.PENDING },
    });

    if (!order) {
      throw new NotFoundException('Pending order not found');
    }

    if (order.paymentStatus !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        'Payment method can only be changed before payment is submitted',
      );
    }

    const total = Number(order.total);
    const qrCodeData =
      paymentMethod === PaymentMethod.PROMPTPAY
        ? await this.paymentService.generatePromptPayQR(total)
        : null;

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        paymentSlipUrl: null,
        qrCodeData,
        promptpayRef: null,
        stripeCheckoutSessionId: null,
        stripePaymentIntentId: null,
        stripePaymentStatus:
          paymentMethod === PaymentMethod.CREDIT_CARD ? 'unpaid' : null,
      },
      include: this.customerOrderInclude(),
    });

    return this.hideUndeliveredKeys(updatedOrder);
  }

  // Cancel a pending order (releases keys)
  async cancelOrder(orderId: string, userId: string) {
    await this.orderExpirationService.expireOrderIfNeeded(orderId, userId);

    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId, status: OrderStatus.PENDING },
      include: {
        orderItems: { select: { id: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Pending order not found');
    }

    if (order.paymentStatus !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        'Only unpaid orders can be cancelled by the customer',
      );
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
    const cancelledOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.CANCELLED,
        paymentStatus: PaymentStatus.CANCELLED,
        paymentSlipUrl: null,
        qrCodeData: null,
        stripePaymentStatus: 'cancelled_by_customer',
      },
      include: this.customerOrderInclude(),
    });

    return this.hideUndeliveredKeys(cancelledOrder);
  }

  async cancelOrderAsAdmin(orderId: string, adminId: string, reason?: string) {
    await this.orderExpirationService.expireOrderIfNeeded(orderId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderItems: { select: { id: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.CANCELLED) {
      return this.prisma.order.findUnique({
        where: { id: orderId },
        include: this.adminOrderInclude(),
      });
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    if (order.paymentStatus !== PaymentStatus.PENDING) {
      throw new BadRequestException(
        'Uploaded slips should be rejected from payment review instead',
      );
    }

    const orderItemIds = order.orderItems.map((item) => item.id);

    await this.prisma.$transaction(async (tx) => {
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
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.CANCELLED,
          paymentSlipUrl: null,
          qrCodeData: null,
          promptpayRef: reason || null,
          stripePaymentStatus: 'cancelled_by_admin',
          verifiedBy: adminId,
          verifiedAt: new Date(),
        },
      });
    });

    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: this.adminOrderInclude(),
    });
  }

  private customerOrderInclude() {
    return {
      orderItems: {
        include: {
          game: {
            select: { id: true, title: true, platform: true, imageUrl: true },
          },
          cdKey: { select: { keyCode: true } },
        },
      },
    } satisfies Prisma.OrderInclude;
  }

  private hideUndeliveredKeys<
    T extends {
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      orderItems: Array<{ cdKey?: { keyCode: string } | null }>;
    },
  >(order: T) {
    if (
      order.status === OrderStatus.COMPLETED &&
      order.paymentStatus === PaymentStatus.VERIFIED
    ) {
      return order;
    }

    return {
      ...order,
      orderItems: order.orderItems.map((item) => ({
        ...item,
        cdKey: null,
      })),
    };
  }

  private adminOrderInclude() {
    return {
      user: { select: { email: true, name: true } },
      orderItems: {
        include: {
          game: {
            select: { id: true, title: true, platform: true, imageUrl: true },
          },
          cdKey: { select: { keyCode: true } },
        },
      },
    } satisfies Prisma.OrderInclude;
  }

  // Admin: get all orders
  async findAll(filters?: AdminOrderFilters) {
    await this.orderExpirationService.expireUnpaidOrders();

    const where: Prisma.OrderWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.paymentStatus) {
      where.paymentStatus = filters.paymentStatus;
    }

    if (filters?.search) {
      where.OR = [
        { id: { contains: filters.search, mode: 'insensitive' } },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
        { user: { name: { contains: filters.search, mode: 'insensitive' } } },
        {
          orderItems: {
            some: {
              game: {
                title: { contains: filters.search, mode: 'insensitive' },
              },
            },
          },
        },
      ];
    }

    const include = this.adminOrderInclude();

    const pagination = this.getPagination(filters);

    if (!pagination) {
      return this.prisma.order.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
      });
    }

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include,
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / pagination.limit));

    return {
      data: orders,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages,
        hasNext: pagination.page < totalPages,
        hasPrevious: pagination.page > 1,
      },
    };
  }

  private getPagination(options?: AdminOrderFilters) {
    if (options?.page === undefined && options?.limit === undefined) {
      return null;
    }

    const page = Number.isFinite(options?.page)
      ? Math.max(1, Math.floor(options?.page || 1))
      : 1;
    const limit = Number.isFinite(options?.limit)
      ? Math.max(1, Math.min(100, Math.floor(options?.limit || 20)))
      : 20;

    return { page, limit };
  }

  // Admin: get sales stats
  async getSalesStats() {
    await this.orderExpirationService.expireUnpaidOrders();

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
