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
export declare class PaymentService {
    private prisma;
    private slipOkService;
    private emailService;
    private readonly logger;
    constructor(prisma: PrismaService, slipOkService: SlipOkService, emailService: EmailService);
    generatePromptPayQR(amount: number, orderId: string): Promise<string>;
    uploadPaymentSlip(orderId: string, userId: string, slipUrl: string): Promise<SlipUploadResult>;
    private notifyAdminPendingPayment;
    private markPaymentVerified;
    private sendCompletedOrderEmails;
    verifyPayment(orderId: string, adminId: string): Promise<void>;
    rejectPayment(orderId: string, adminId: string, reason?: string): Promise<void>;
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
