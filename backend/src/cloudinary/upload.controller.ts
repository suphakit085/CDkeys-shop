import {
    Controller,
    Post,
    UseGuards,
    UseInterceptors,
    UploadedFile,
    Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage, diskStorage } from 'multer';
import { extname } from 'path';
import { CloudinaryService } from './cloudinary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('upload')
export class UploadController {
    constructor(private cloudinaryService: CloudinaryService) { }

    @Post('image')
    @UseGuards(JwtAuthGuard, AdminGuard)
    @UseInterceptors(
        FileInterceptor('image', {
            storage: memoryStorage(), // Use memory for Cloudinary
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
                    cb(new Error('Only image files are allowed!'), false);
                }
                cb(null, true);
            },
            limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
        }),
    )
    async uploadImage(
        @UploadedFile() file: Express.Multer.File,
        @Query('folder') folder: string = 'general',
    ) {
        if (!file) {
            throw new Error('No file uploaded');
        }

        // Use Cloudinary if configured
        if (this.cloudinaryService.isEnabled()) {
            const result = await this.cloudinaryService.uploadImage(file, folder);
            return {
                url: result.url,
                publicId: result.publicId,
                provider: 'cloudinary',
            };
        }

        // Fallback to local storage (for development)
        const fs = await import('fs/promises');
        const path = await import('path');

        const uploadDir = path.join(process.cwd(), 'uploads', folder);
        await fs.mkdir(uploadDir, { recursive: true });

        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
        const filepath = path.join(uploadDir, filename);

        await fs.writeFile(filepath, file.buffer);

        return {
            url: `/uploads/${folder}/${filename}`,
            filename,
            provider: 'local',
        };
    }
}
