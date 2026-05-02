import {
  IsArray,
  IsUUID,
  ValidateNested,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  ArrayNotEmpty,
  IsEnum,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod } from '@prisma/client';

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

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;
}

export class ProcessPaymentDto {
  @IsUUID()
  orderId: string;

  // Mock payment - always succeeds unless explicitly set to fail
  @IsBoolean()
  @IsOptional()
  simulateFail?: boolean;
}

export class ChangePaymentMethodDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}

export class AdminCancelOrderDto {
  @IsString()
  @MaxLength(240)
  @IsOptional()
  reason?: string;
}
