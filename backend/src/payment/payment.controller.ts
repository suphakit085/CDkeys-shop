import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Param,
  Req,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { FileFilterCallback } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PaymentService, SlipUploadResult } from './payment.service';
import { extname } from 'path';
import { Request as ExpressRequest } from 'express';

type RawBodyRequest = ExpressRequest & {
  rawBody?: Buffer;
};

// Multer configuration
const multerOptions = {
  storage: diskStorage({
    destination: './uploads/slips',
    filename: (
      _req,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void,
    ) => {
      const randomName = Array(32)
        .fill(null)
        .map(() => Math.round(Math.random() * 16).toString(16))
        .join('');
      cb(null, `${randomName}${extname(file.originalname)}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      cb(null, true);
    } else {
      cb(new BadRequestException('Only image files allowed'));
    }
  },
};

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @UseGuards(JwtAuthGuard)
  @Post('promptpay/upload-slip/:orderId')
  @UseInterceptors(FileInterceptor('slip', multerOptions))
  async uploadSlip(
    @Param('orderId') orderId: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: { id: string } },
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const slipUrl = `/uploads/slips/${file.filename}`;
    let result: SlipUploadResult;
    try {
      result = await this.paymentService.uploadPaymentSlip(
        orderId,
        req.user.id,
        slipUrl,
      );
    } catch (error) {
      const fs = await import('fs/promises');
      const path = await import('path');
      await fs
        .unlink(path.join(process.cwd(), 'uploads', 'slips', file.filename))
        .catch(() => undefined);
      throw error;
    }

    return {
      message: result.message,
      slipUrl,
      autoVerified: result.autoVerified,
      slipData: result.slipData,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('stripe/checkout/:orderId')
  async createStripeCheckout(
    @Param('orderId') orderId: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.paymentService.createStripeCheckoutSession(
      orderId,
      req.user.id,
    );
  }

  @Post('stripe/webhook')
  async handleStripeWebhook(
    @Req() req: RawBodyRequest,
    @Headers('stripe-signature') signature?: string,
  ) {
    const rawBody = req.rawBody?.toString('utf8');
    if (!rawBody) {
      throw new BadRequestException('Missing raw request body');
    }

    return this.paymentService.handleStripeWebhook(rawBody, signature);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('verify/:orderId')
  async verifyPayment(
    @Param('orderId') orderId: string,
    @Request() req: { user: { id: string } },
  ) {
    await this.paymentService.verifyPayment(orderId, req.user.id);
    return { message: 'Payment verified successfully' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('reject/:orderId')
  async rejectPayment(
    @Param('orderId') orderId: string,
    @Body('reason') reason: string,
    @Request() req: { user: { id: string } },
  ) {
    await this.paymentService.rejectPayment(orderId, req.user.id, reason);
    return { message: 'Payment rejected' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('pending')
  async getPendingPayments() {
    return this.paymentService.getPendingPayments();
  }
}
