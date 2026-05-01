import { PaymentMethod } from '@prisma/client';
export declare class CartItemDto {
    gameId: string;
    quantity: number;
}
export declare class CreateOrderDto {
    items: CartItemDto[];
    paymentMethod?: PaymentMethod;
}
export declare class ProcessPaymentDto {
    orderId: string;
    simulateFail?: boolean;
}
