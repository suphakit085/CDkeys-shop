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
    uploadPaymentSlip(orderId: string, slipUrl: string): Promise<SlipUploadResult>;
    private notifyAdminPendingPayment;
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
