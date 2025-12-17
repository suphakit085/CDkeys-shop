import { IsArray, IsUUID, ValidateNested, IsNumber, Min, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CartItemDto {
    @IsUUID()
    gameId: string;

    @IsNumber()
    @Min(1)
    quantity: number;
}

export class CreateOrderDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CartItemDto)
    items: CartItemDto[];
}

export class ProcessPaymentDto {
    @IsUUID()
    orderId: string;

    // Mock payment - always succeeds unless explicitly set to fail
    @IsBoolean()
    @IsOptional()
    simulateFail?: boolean;
}
