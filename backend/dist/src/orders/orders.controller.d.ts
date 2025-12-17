import { OrdersService } from './orders.service';
import { CreateOrderDto, ProcessPaymentDto } from './dto/orders.dto';
export declare class OrdersController {
    private ordersService;
    constructor(ordersService: OrdersService);
    findMyOrders(req: {
        user: {
            id: string;
        };
    }): Promise<({
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
    findOne(id: string, req: {
        user: {
            id: string;
        };
    }): Promise<{
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
    createOrder(dto: CreateOrderDto, req: {
        user: {
            id: string;
        };
    }): Promise<{
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
    processPayment(dto: ProcessPaymentDto, req: {
        user: {
            id: string;
        };
    }): Promise<{
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
    cancelOrder(id: string, req: {
        user: {
            id: string;
        };
    }): Promise<{
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
