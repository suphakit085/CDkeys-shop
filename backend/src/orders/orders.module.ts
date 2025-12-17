import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { KeysModule } from '../keys/keys.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
    imports: [KeysModule, PaymentModule],
    controllers: [OrdersController],
    providers: [OrdersService],
    exports: [OrdersService],
})
export class OrdersModule { }
