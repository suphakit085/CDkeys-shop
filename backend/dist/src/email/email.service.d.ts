import { PrismaService } from '../prisma/prisma.service';
interface OrderDetails {
    orderId: string;
    customerEmail: string;
    customerName: string;
    items: Array<{
        gameTitle: string;
        platform: string;
        cdKey: string;
    }>;
    total: number;
}
interface PendingPaymentDetails {
    orderId: string;
    customerEmail: string;
    customerName: string;
    total: number;
    slipUrl: string;
    items: Array<{
        gameTitle: string;
        platform: string;
    }>;
}
export declare class EmailService {
    private prisma;
    private readonly logger;
    private transporter;
    private resendApiKey;
    private useResend;
    constructor(prisma: PrismaService);
    private initializeTransporter;
    isConfigured(): boolean;
    private getStoreName;
    private getFrontendUrl;
    private getFromEmail;
    private getAdminEmail;
    private formatMoney;
    private escapeHtml;
    private sendWithResend;
    private sendEmail;
    private emailLayout;
    sendCdKeysEmail(order: OrderDetails): Promise<boolean>;
    sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<boolean>;
    sendMagicLinkEmail(email: string, magicToken: string, userName: string): Promise<boolean>;
    sendRegistrationMagicLinkEmail(email: string, magicToken: string, userName: string): Promise<boolean>;
    sendNewOrderNotification(order: OrderDetails): Promise<boolean>;
    sendPendingPaymentNotification(order: PendingPaymentDetails): Promise<boolean>;
}
export {};
