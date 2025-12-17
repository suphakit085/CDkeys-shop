import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
    private isConfigured = false;

    constructor(private configService: ConfigService) {
        const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
        const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
        const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

        if (cloudName && apiKey && apiSecret) {
            cloudinary.config({
                cloud_name: cloudName,
                api_key: apiKey,
                api_secret: apiSecret,
            });
            this.isConfigured = true;
            console.log('✅ Cloudinary configured successfully');
        } else {
            console.log('⚠️ Cloudinary not configured - using local storage fallback');
        }
    }

    isEnabled(): boolean {
        return this.isConfigured;
    }

    async uploadImage(
        file: Express.Multer.File,
        folder: string = 'cdkeys'
    ): Promise<{ url: string; publicId: string }> {
        if (!this.isConfigured) {
            throw new BadRequestException('Cloudinary is not configured');
        }

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: `cdkeys/${folder}`,
                    resource_type: 'image',
                    transformation: [
                        { width: 1200, height: 800, crop: 'limit' },
                        { quality: 'auto:good' },
                        { fetch_format: 'auto' },
                    ],
                },
                (error, result: UploadApiResponse | undefined) => {
                    if (error) {
                        reject(new BadRequestException('Failed to upload image to Cloudinary'));
                    } else if (result) {
                        resolve({
                            url: result.secure_url,
                            publicId: result.public_id,
                        });
                    }
                }
            );

            streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });
    }

    async deleteImage(publicId: string): Promise<void> {
        if (!this.isConfigured) {
            return;
        }

        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            console.error('Failed to delete image from Cloudinary:', error);
        }
    }
}
