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
export declare class EmailService {
    private readonly logger;
    private transporter;
    constructor();
    private initializeTransporter;
    isConfigured(): boolean;
    sendCdKeysEmail(order: OrderDetails): Promise<boolean>;
    sendPasswordResetEmail(email: string, resetToken: string, userName: string): Promise<boolean>;
    sendMagicLinkEmail(email: string, magicToken: string, userName: string): Promise<boolean>;
    sendRegistrationMagicLinkEmail(email: string, magicToken: string, userName: string): Promise<boolean>;
    sendNewOrderNotification(order: OrderDetails): Promise<boolean>;
    sendPendingPaymentNotification(order: {
        orderId: string;
        customerEmail: string;
        customerName: string;
        total: number;
        slipUrl: string;
        items: Array<{
            gameTitle: string;
            platform: string;
        }>;
    }): Promise<boolean>;
}
export {};
