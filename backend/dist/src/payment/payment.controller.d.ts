import { PaymentService } from './payment.service';
export declare class PaymentController {
    private paymentService;
    constructor(paymentService: PaymentService);
    uploadSlip(orderId: string, file: Express.Multer.File, req: {
        user: {
            id: string;
        };
    }): Promise<{
        message: any;
        slipUrl: string;
        autoVerified: any;
        slipData: any;
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
            orderId: string;
            gameId: string;
        })[];
    } & {
        id: string;
        userId: string;
        total: import("@prisma/client/runtime/library").Decimal;
        status: import("@prisma/client").$Enums.OrderStatus;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
        paymentSlipUrl: string | null;
        qrCodeData: string | null;
        promptpayRef: string | null;
        paidAt: Date | null;
        verifiedBy: string | null;
        verifiedAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
}
