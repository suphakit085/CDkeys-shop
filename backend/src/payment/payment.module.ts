import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SlipOkService } from './slipok.service';
import { OrderExpirationService } from '../orders/order-expiration.service';

@Module({
  imports: [PrismaModule],
  providers: [PaymentService, SlipOkService, OrderExpirationService],
  controllers: [PaymentController],
  exports: [PaymentService, SlipOkService],
})
export class PaymentModule {}
