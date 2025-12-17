import { ConfigService } from '@nestjs/config';
export declare class CloudinaryService {
    private configService;
    private isConfigured;
    constructor(configService: ConfigService);
    isEnabled(): boolean;
    uploadImage(file: Express.Multer.File, folder?: string): Promise<{
        url: string;
        publicId: string;
    }>;
    deleteImage(publicId: string): Promise<void>;
}
