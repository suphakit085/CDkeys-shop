import { PrismaService } from '../prisma/prisma.service';
import { KeysService } from '../keys/keys.service';
import { PaymentService } from '../payment/payment.service';
import { CreateOrderDto } from './dto/orders.dto';
export declare class OrdersService {
    private prisma;
    private keysService;
    private paymentService;
    constructor(prisma: PrismaService, keysService: KeysService, paymentService: PaymentService);
    findByUser(userId: string): Promise<({
        orderItems: ({
            game: {
                id: string;
                title: string;
                platform: import("@prisma/client").$Enums.Platform;
                imageUrl: string | null;
            };
            cdKey: {
                keyCode: string;
            } | null;
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
    findOne(orderId: string, userId: string): Promise<{
        orderItems: ({
            game: {
                id: string;
                title: string;
                platform: import("@prisma/client").$Enums.Platform;
                imageUrl: string | null;
            };
            cdKey: {
                keyCode: string;
            } | null;
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
    }>;
    createOrder(userId: string, dto: CreateOrderDto): Promise<{
        orderItems: ({
            game: {
                title: string;
                platform: import("@prisma/client").$Enums.Platform;
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
    }>;
    processPayment(orderId: string, userId: string, simulateFail?: boolean): Promise<{
        success: boolean;
        message: string;
        order?: undefined;
    } | {
        success: boolean;
        message: string;
        order: {
            orderItems: ({
                game: {
                    title: string;
                    platform: import("@prisma/client").$Enums.Platform;
                    imageUrl: string | null;
                };
                cdKey: {
                    keyCode: string;
                } | null;
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
        };
    }>;
    cancelOrder(orderId: string, userId: string): Promise<{
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
    }>;
    findAll(): Promise<({
        user: {
            email: string;
            name: string;
        };
        orderItems: ({
            game: {
                title: string;
                platform: import("@prisma/client").$Enums.Platform;
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
    getSalesStats(): Promise<{
        totalRevenue: number | import("@prisma/client/runtime/library").Decimal;
        completedOrders: number;
        ordersByStatus: Record<string, number>;
        recentOrders: ({
            user: {
                email: string;
            };
            orderItems: ({
                game: {
                    title: string;
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
        })[];
    }>;
}
