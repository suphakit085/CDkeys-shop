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
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PaymentService, SlipUploadResult } from './payment.service';
import { extname } from 'path';
import { Request as ExpressRequest } from 'express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { createImageFileFilter } from '../common/image-file-filter';

type RawBodyRequest = ExpressRequest & {
  rawBody?: Buffer;
};

// Multer configuration
const multerOptions = {
  storage: memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: createImageFileFilter(),
};

@Controller('payment')
export class PaymentController {
  constructor(
    private paymentService: PaymentService,
    private cloudinaryService: CloudinaryService,
  ) {}

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

    const slipUpload = await this.storeSlip(file);
    let result: SlipUploadResult;
    try {
      result = await this.paymentService.uploadPaymentSlip(
        orderId,
        req.user.id,
        slipUpload.url,
      );
    } catch (error) {
      await this.cleanupStoredSlip(slipUpload);
      throw error;
    }

    return {
      message: result.message,
      slipUrl: slipUpload.url,
      autoVerified: result.autoVerified,
      slipData: result.slipData,
    };
  }

  private async storeSlip(file: Express.Multer.File) {
    if (this.cloudinaryService.isEnabled()) {
      const result = await this.cloudinaryService.uploadImage(file, 'slips');
      return {
        url: result.url,
        publicId: result.publicId,
        provider: 'cloudinary' as const,
      };
    }

    const fs = await import('fs/promises');
    const path = await import('path');
    const uploadDir = path.join(process.cwd(), 'uploads', 'slips');
    await fs.mkdir(uploadDir, { recursive: true });

    const randomName = Array(32)
      .fill(null)
      .map(() => Math.round(Math.random() * 16).toString(16))
      .join('');
    const filename = `${randomName}${extname(file.originalname)}`;
    await fs.writeFile(path.join(uploadDir, filename), file.buffer);

    return {
      url: `/uploads/slips/${filename}`,
      filename,
      provider: 'local' as const,
    };
  }

  private async cleanupStoredSlip(slip: {
    provider: 'cloudinary' | 'local';
    publicId?: string;
    filename?: string;
  }) {
    if (slip.provider === 'cloudinary' && slip.publicId) {
      await this.cloudinaryService.deleteImage(slip.publicId);
      return;
    }

    if (slip.provider === 'local' && slip.filename) {
      const fs = await import('fs/promises');
      const path = await import('path');
      await fs
        .unlink(path.join(process.cwd(), 'uploads', 'slips', slip.filename))
        .catch(() => undefined);
    }
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
