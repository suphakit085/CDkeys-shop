import { PaymentService } from './payment.service';
export declare class PaymentController {
    private paymentService;
    constructor(paymentService: PaymentService);
    uploadSlip(orderId: string, file: Express.Multer.File, req: any): Promise<{
        message: string;
        slipUrl: string;
        autoVerified: boolean;
        slipData: {
            amount?: number;
            transRef?: string;
        } | undefined;
    }>;
    verifyPayment(orderId: string, req: any): Promise<{
        message: string;
    }>;
    rejectPayment(orderId: string, reason: string, req: any): Promise<{
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
        userId: string;
        total: import("@prisma/client/runtime/library").Decimal;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        paymentStatus: import("@prisma/client").$Enums.PaymentStatus;
        paymentSlipUrl: string | null;
        qrCodeData: string | null;
        promptpayRef: string | null;
        paidAt: Date | null;
        verifiedBy: string | null;
        verifiedAt: Date | null;
    })[]>;
}
