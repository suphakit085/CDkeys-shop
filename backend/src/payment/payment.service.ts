import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import generatePayload from 'promptpay-qr';
import { toDataURL } from 'qrcode';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SlipOkService } from './slipok.service';
import { EmailService } from '../email/email.service';
import {
  KeyStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';
import { OrderExpirationService } from '../orders/order-expiration.service';

export interface SlipUploadResult {
  autoVerified: boolean;
  message: string;
  slipData?: {
    amount?: number;
    transRef?: string;
  };
}

interface StripeCheckoutSessionResponse {
  id: string;
  url: string | null;
  payment_intent?: string | null;
  payment_status?: string | null;
}

interface StripeCheckoutSessionEvent {
  id: string;
  client_reference_id?: string | null;
  metadata?: {
    orderId?: string;
    userId?: string;
  };
  amount_total?: number | null;
  currency?: string | null;
  payment_intent?: string | null;
  payment_status?: string | null;
}

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: StripeCheckoutSessionEvent & {
      metadata?: Record<string, string | undefined>;
    };
  };
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private prisma: PrismaService,
    private slipOkService: SlipOkService,
    private emailService: EmailService,
    private orderExpirationService: OrderExpirationService,
  ) {}

  async generatePromptPayQR(amount: number): Promise<string> {
    const promptpayId = process.env.PROMPTPAY_ID || '1409600385453';

    // Generate PromptPay payload
    const payload = generatePayload(promptpayId, { amount });

    // Convert to QR code (base64 data URL)
    const qrCodeDataUrl = await toDataURL(payload);

    return qrCodeDataUrl;
  }

  async uploadPaymentSlip(
    orderId: string,
    userId: string,
    slipUrl: string,
  ): Promise<SlipUploadResult> {
    await this.orderExpirationService.expireOrderIfNeeded(orderId, userId);

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
      throw new BadRequestException(
        'Only pending orders can accept payment slips',
      );
    }

    if (order.paymentMethod !== PaymentMethod.PROMPTPAY) {
      throw new BadRequestException(
        'This order is not configured for PromptPay',
      );
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
    this.logger.log(
      `Attempting SlipOK verification for order ${orderId}, isConfigured: ${this.slipOkService.isConfigured()}`,
    );

    if (this.slipOkService.isConfigured()) {
      const verification = await this.slipOkService.verifySlip(slipUrl);

      if (verification.success && verification.amount) {
        const orderTotal = Number(order.total);
        const slipAmount = verification.amount;

        // Allow 1 THB tolerance for rounding
        if (Math.abs(slipAmount - orderTotal) <= 1) {
          this.logger.log(
            `Auto-verifying order ${orderId}: slip amount ${slipAmount} matches order total ${orderTotal}`,
          );

          const marked = await this.markPaymentVerified(
            orderId,
            'AUTO_SLIPOK',
            { promptpayRef: verification.transRef },
          );
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
        } else {
          this.logger.warn(
            `Amount mismatch for order ${orderId}: slip ${slipAmount}, order ${orderTotal}`,
          );
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

  private async notifyAdminPendingPayment(
    orderId: string,
    slipUrl: string,
  ): Promise<void> {
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

  private async markPaymentVerified(
    orderId: string,
    verifiedBy: string,
    options: {
      promptpayRef?: string;
      stripeCheckoutSessionId?: string;
      stripePaymentIntentId?: string;
      stripePaymentStatus?: string;
      paymentMethod?: PaymentMethod;
      allowAlreadyVerified?: boolean;
    } = {},
  ): Promise<boolean> {
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
        throw new NotFoundException('Order not found');
      }

      if (order.paymentStatus === 'VERIFIED') {
        if (options.allowAlreadyVerified) {
          return false;
        }
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
          promptpayRef: options.promptpayRef,
          stripeCheckoutSessionId: options.stripeCheckoutSessionId,
          stripePaymentIntentId: options.stripePaymentIntentId,
          stripePaymentStatus: options.stripePaymentStatus,
          paymentMethod: options.paymentMethod,
          verifiedBy,
          verifiedAt: new Date(),
        },
      });

      return true;
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
      .filter((item) => item.cdKey)
      .map((item) => ({
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
      this.logger.error(
        `Failed to send completed order emails for ${orderId}`,
        error,
      );
    }
  }

  async verifyPayment(orderId: string, adminId: string): Promise<void> {
    const marked = await this.markPaymentVerified(orderId, adminId);
    if (marked) {
      await this.sendCompletedOrderEmails(orderId);
    }
  }

  async resendCompletedOrderEmails(
    orderId: string,
    adminId: string,
  ): Promise<void> {
    const order = await this.prisma.order.findUnique({
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

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (
      order.status !== OrderStatus.COMPLETED ||
      order.paymentStatus !== PaymentStatus.VERIFIED
    ) {
      throw new BadRequestException(
        'Only completed paid orders can resend CD keys',
      );
    }

    const deliveredKeyCount = order.orderItems.filter(
      (item) => item.cdKey,
    ).length;

    if (deliveredKeyCount === 0) {
      throw new BadRequestException('This order has no delivered CD keys');
    }

    if (!this.emailService.isConfigured()) {
      throw new BadRequestException('Email service is not configured');
    }

    await this.emailService.sendCdKeysEmail({
      orderId: order.id,
      customerEmail: order.user.email,
      customerName: order.user.name,
      items: order.orderItems
        .filter((item) => item.cdKey)
        .map((item) => ({
          gameTitle: item.game.title,
          platform: item.game.platform,
          cdKey: item.cdKey!.keyCode,
        })),
      total: Number(order.total),
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        verifiedBy: adminId,
        verifiedAt: new Date(),
      },
    });
  }

  async createStripeCheckoutSession(
    orderId: string,
    userId: string,
  ): Promise<{ url: string; sessionId: string }> {
    await this.orderExpirationService.expireOrderIfNeeded(orderId, userId);

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
      throw new NotFoundException('Pending order not found');
    }

    if (order.paymentMethod !== PaymentMethod.CREDIT_CARD) {
      throw new BadRequestException('This order is not configured for Stripe');
    }

    if (order.paymentStatus === 'VERIFIED') {
      throw new BadRequestException('Payment already verified');
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
      body.set(
        `line_items[${index}][price_data][unit_amount]`,
        this.toStripeAmount(Number(item.price)).toString(),
      );
      body.set(
        `line_items[${index}][price_data][product_data][name]`,
        item.game.title,
      );
      body.set(
        `line_items[${index}][price_data][product_data][metadata][platform]`,
        item.game.platform,
      );
    });

    const session = await this.stripePost<StripeCheckoutSessionResponse>(
      '/checkout/sessions',
      body,
    );

    if (!session.url) {
      throw new InternalServerErrorException(
        'Stripe did not return a checkout URL',
      );
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

  async handleStripeWebhook(
    rawBody: string,
    signature: string | undefined,
  ): Promise<{ received: true }> {
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

  private async fulfillStripeCheckout(
    session: StripeCheckoutSessionEvent,
  ): Promise<void> {
    const orderId = session.metadata?.orderId || session.client_reference_id;

    if (!orderId) {
      throw new BadRequestException('Stripe session missing order reference');
    }

    if (session.payment_status && session.payment_status !== 'paid') {
      this.logger.warn(
        `Stripe checkout ${session.id} completed with payment_status=${session.payment_status}`,
      );
      return;
    }

    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { stripeCheckoutSessionId: session.id }],
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found for Stripe checkout');
    }

    if (order.status !== 'PENDING') {
      this.logger.warn(
        `Ignoring Stripe checkout ${session.id} for non-pending order ${order.id}`,
      );
      return;
    }

    if (session.amount_total !== null && session.amount_total !== undefined) {
      const expectedAmount = this.toStripeAmount(Number(order.total));
      if (session.amount_total !== expectedAmount) {
        throw new BadRequestException(
          'Stripe amount does not match order total',
        );
      }
    }

    const marked = await this.markPaymentVerified(order.id, 'STRIPE', {
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: session.payment_intent || undefined,
      stripePaymentStatus: session.payment_status || 'paid',
      paymentMethod: PaymentMethod.CREDIT_CARD,
      allowAlreadyVerified: true,
    });
    if (marked) {
      await this.sendCompletedOrderEmails(order.id);
    }
  }

  private async expireStripeCheckout(
    session: StripeCheckoutSessionEvent,
  ): Promise<void> {
    const orderId = session.metadata?.orderId || session.client_reference_id;

    if (!orderId) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: {
          id: orderId,
          paymentMethod: PaymentMethod.CREDIT_CARD,
          paymentStatus: PaymentStatus.PENDING,
          status: OrderStatus.PENDING,
        },
        include: {
          orderItems: {
            select: { id: true },
          },
        },
      });

      if (!order) {
        return;
      }

      const orderItemIds = order.orderItems.map((item) => item.id);

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
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELLED,
          paymentStatus: PaymentStatus.CANCELLED,
          stripePaymentStatus: 'expired',
        },
      });
    });
  }

  private getStripeSecretKey(): string {
    const key = process.env.STRIPE_SECRET_KEY;

    if (!key) {
      throw new InternalServerErrorException(
        'STRIPE_SECRET_KEY is not configured',
      );
    }

    return key;
  }

  private getStripeWebhookSecret(): string {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret) {
      throw new InternalServerErrorException(
        'STRIPE_WEBHOOK_SECRET is not configured',
      );
    }

    return secret;
  }

  private getStripeCurrency(): string {
    return (process.env.STRIPE_CURRENCY || 'thb').toLowerCase();
  }

  private getFrontendUrl(): string {
    return (process.env.FRONTEND_URL || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
  }

  private toStripeAmount(amount: number): number {
    return Math.round(amount * 100);
  }

  private async stripePost<T>(path: string, body: URLSearchParams): Promise<T> {
    const response = await fetch(`https://api.stripe.com/v1${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.getStripeSecretKey()}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
    const data = (await response.json()) as {
      error?: {
        message?: string;
      };
    } & T;

    if (!response.ok) {
      const message =
        typeof data?.error?.message === 'string'
          ? data.error.message
          : 'Stripe request failed';
      throw new BadRequestException(message);
    }

    return data as T;
  }

  private parseStripeEvent(
    rawBody: string,
    signature: string | undefined,
  ): StripeEvent {
    if (!signature) {
      throw new BadRequestException('Missing Stripe signature');
    }

    const timestamp = this.extractStripeHeaderValue(signature, 't');
    const signatures = this.extractStripeHeaderValues(signature, 'v1');

    if (!timestamp || signatures.length === 0) {
      throw new BadRequestException('Invalid Stripe signature header');
    }

    const toleranceSeconds = 5 * 60;
    const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(ageSeconds) || ageSeconds > toleranceSeconds) {
      throw new BadRequestException('Expired Stripe signature');
    }

    const signedPayload = `${timestamp}.${rawBody}`;
    const expectedSignature = createHmac(
      'sha256',
      this.getStripeWebhookSecret(),
    )
      .update(signedPayload, 'utf8')
      .digest('hex');

    const isValid = signatures.some((value) =>
      this.safeCompareHex(value, expectedSignature),
    );

    if (!isValid) {
      throw new BadRequestException('Invalid Stripe signature');
    }

    return JSON.parse(rawBody) as StripeEvent;
  }

  private extractStripeHeaderValue(header: string, key: string) {
    return this.extractStripeHeaderValues(header, key)[0];
  }

  private extractStripeHeaderValues(header: string, key: string) {
    return header
      .split(',')
      .map((part) => part.split('='))
      .filter(([name]) => name === key)
      .map(([, value]) => value)
      .filter(Boolean);
  }

  private safeCompareHex(value: string, expected: string) {
    try {
      const valueBuffer = Buffer.from(value, 'hex');
      const expectedBuffer = Buffer.from(expected, 'hex');

      return (
        valueBuffer.length === expectedBuffer.length &&
        timingSafeEqual(valueBuffer, expectedBuffer)
      );
    } catch {
      return false;
    }
  }

  async rejectPayment(
    orderId: string,
    adminId: string,
    reason?: string,
  ): Promise<void> {
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
