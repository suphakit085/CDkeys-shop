import { Injectable } from '@nestjs/common';
import { KeyStatus, OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_EXPIRATION_MINUTES = 30;

type ExpirableOrder = Prisma.OrderGetPayload<{
  include: {
    orderItems: {
      select: {
        id: true;
      };
    };
  };
}>;

@Injectable()
export class OrderExpirationService {
  constructor(private prisma: PrismaService) {}

  async expireUnpaidOrders(userId?: string) {
    const cutoff = this.getExpirationCutoff();

    if (!cutoff) {
      return { expired: 0 };
    }

    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        createdAt: { lt: cutoff },
      },
      include: this.expirableOrderInclude(),
    });

    let expired = 0;

    for (const order of orders) {
      if (await this.expireOrder(order)) {
        expired += 1;
      }
    }

    return { expired };
  }

  async expireOrderIfNeeded(orderId: string, userId?: string) {
    const cutoff = this.getExpirationCutoff();

    if (!cutoff) {
      return false;
    }

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
        status: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
        createdAt: { lt: cutoff },
      },
      include: this.expirableOrderInclude(),
    });

    if (!order) {
      return false;
    }

    return this.expireOrder(order);
  }

  getExpirationMinutes() {
    const configured = Number(process.env.ORDER_PAYMENT_EXPIRES_MINUTES);

    if (!Number.isFinite(configured)) {
      return DEFAULT_EXPIRATION_MINUTES;
    }

    return Math.max(0, Math.floor(configured));
  }

  private getExpirationCutoff() {
    const minutes = this.getExpirationMinutes();

    if (minutes <= 0) {
      return null;
    }

    return new Date(Date.now() - minutes * 60 * 1000);
  }

  private async expireOrder(order: ExpirableOrder) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.order.findFirst({
        where: {
          id: order.id,
          status: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
        },
        include: this.expirableOrderInclude(),
      });

      if (!current) {
        return false;
      }

      const orderItemIds = current.orderItems.map((item) => item.id);

      if (orderItemIds.length > 0) {
        await tx.cdKey.updateMany({
          where: {
            orderItemId: { in: orderItemIds },
            status: KeyStatus.RESERVED,
          },
          data: {
            status: KeyStatus.AVAILABLE,
            reservedAt: null,
            orderItemId: null,
          },
        });
      }

      await tx.order.update({
        where: { id: current.id },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.CANCELLED,
          paymentSlipUrl: null,
          qrCodeData: null,
          stripePaymentStatus: 'expired',
        },
      });

      return true;
    });
  }

  private expirableOrderInclude() {
    return {
      orderItems: {
        select: {
          id: true,
        },
      },
    } satisfies Prisma.OrderInclude;
  }
}
