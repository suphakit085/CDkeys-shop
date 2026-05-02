import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { KeysModule } from '../keys/keys.module';
import { PaymentModule } from '../payment/payment.module';
import { OrderExpirationService } from './order-expiration.service';

@Module({
  imports: [KeysModule, PaymentModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderExpirationService],
  exports: [OrdersService, OrderExpirationService],
})
export class OrdersModule {}
