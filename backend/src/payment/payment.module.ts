import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { SlipOkService } from './slipok.service';

@Module({
    imports: [PrismaModule],
    providers: [PaymentService, SlipOkService],
    controllers: [PaymentController],
    exports: [PaymentService, SlipOkService],
})
export class PaymentModule { }

