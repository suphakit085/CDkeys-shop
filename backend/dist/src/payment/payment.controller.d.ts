import { PaymentService } from './payment.service';
import { Request as ExpressRequest } from 'express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
type RawBodyRequest = ExpressRequest & {
    rawBody?: Buffer;
};
export declare class PaymentController {
    private paymentService;
    private cloudinaryService;
    constructor(paymentService: PaymentService, cloudinaryService: CloudinaryService);
    uploadSlip(orderId: string, file: Express.Multer.File, req: {
        user: {
            id: string;
        };
    }): Promise<{
        message: string;
        slipUrl: string;
        autoVerified: boolean;
        slipData: {
            amount?: number;
            transRef?: string;
        } | undefined;
    }>;
    private storeSlip;
    private cleanupStoredSlip;
    createStripeCheckout(orderId: string, req: {
        user: {
            id: string;
        };
    }): Promise<{
        url: string;
        sessionId: string;
    }>;
    handleStripeWebhook(req: RawBodyRequest, signature?: string): Promise<{
        received: true;
    }>;
    verifyPayment(orderId: string, req: {
        user: {
            id: string;
        };
    }): Promise<{
        message: string;
    }>;
    rejectPayment(orderId: string, reason: string, req: {
        user: {
            id: string;
        };
    }): Promise<{
        message: string;
    }>;
    getPendingPayments(): Promise<({
        user: {
            id: string;
            email: string;
            name: string;
        };
        orderItems: ({
            game: {
                id: string;
                title: string;
                platform: import("@prisma/client").$Enums.Platform;
                imageUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            price: import("@prisma/client/runtime/library").Decimal;
            gameId: string;
            orderId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import("@prisma/client").$Enums.OrderStatus;
        total: import("@prisma/client/runtime/library").Decimal;
        userId: string;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
        paymentSlipUrl: string | null;
        qrCodeData: string | null;
        promptpayRef: string | null;
        stripeCheckoutSessionId: string | null;
        stripePaymentIntentId: string | null;
        stripePaymentStatus: string | null;
        paidAt: Date | null;
        verifiedBy: string | null;
        verifiedAt: Date | null;
    })[]>;
}
export {};
