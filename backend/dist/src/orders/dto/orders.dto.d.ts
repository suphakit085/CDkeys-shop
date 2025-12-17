export declare class CartItemDto {
    gameId: string;
    quantity: number;
}
export declare class CreateOrderDto {
    items: CartItemDto[];
}
export declare class ProcessPaymentDto {
    orderId: string;
    simulateFail?: boolean;
}
