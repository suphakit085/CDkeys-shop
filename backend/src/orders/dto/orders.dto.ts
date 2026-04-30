import { IsArray, IsUUID, ValidateNested, IsInt, Min, Max, IsOptional, IsBoolean, ArrayNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class CartItemDto {
    @IsUUID()
    gameId: string;

    @IsInt()
    @Min(1)
    @Max(20)
    quantity: number;
}

export class CreateOrderDto {
    @IsArray()
    @ArrayNotEmpty()
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
