import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
    Request,
    UseInterceptors,
    UploadedFile,
    BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PaymentService } from './payment.service';
import { extname } from 'path';

// Multer configuration
const multerOptions = {
    storage: diskStorage({
        destination: './uploads/slips',
        filename: (req, file, cb) => {
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
    fileFilter: (req, file, cb) => {
        if (file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
            cb(null, true);
        } else {
            cb(new BadRequestException('Only image files allowed'), false);
        }
    },
};

@Controller('payment')
export class PaymentController {
    constructor(private paymentService: PaymentService) { }

    @UseGuards(JwtAuthGuard)
    @Post('promptpay/upload-slip/:orderId')
    @UseInterceptors(FileInterceptor('slip', multerOptions))
    async uploadSlip(
        @Param('orderId') orderId: string,
        @UploadedFile() file: Express.Multer.File,
        @Request() req,
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        const slipUrl = `/uploads/slips/${file.filename}`;
        const result = await this.paymentService.uploadPaymentSlip(orderId, slipUrl);

        return {
            message: result.message,
            slipUrl,
            autoVerified: result.autoVerified,
            slipData: result.slipData,
        };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @Post('verify/:orderId')
    async verifyPayment(@Param('orderId') orderId: string, @Request() req) {
        await this.paymentService.verifyPayment(orderId, req.user.userId);
        return { message: 'Payment verified successfully' };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @Post('reject/:orderId')
    async rejectPayment(
        @Param('orderId') orderId: string,
        @Body('reason') reason: string,
        @Request() req,
    ) {
        await this.paymentService.rejectPayment(orderId, req.user.userId, reason);
        return { message: 'Payment rejected' };
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles(Role.ADMIN)
    @Get('pending')
    async getPendingPayments() {
        return this.paymentService.getPendingPayments();
    }
}
