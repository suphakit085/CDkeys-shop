import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GamesModule } from './games/games.module';
import { KeysModule } from './keys/keys.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentModule } from './payment/payment.module';
import { EmailModule } from './email/email.module';
import { BannersModule } from './banners/banners.module';
import { SettingsModule } from './settings/settings.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    CloudinaryModule,
    EmailModule,
    AuthModule,
    GamesModule,
    KeysModule,
    OrdersModule,
    PaymentModule,
    BannersModule,
    SettingsModule,
  ],
})
export class AppModule { }



