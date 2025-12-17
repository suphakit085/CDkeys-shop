import { CloudinaryService } from './cloudinary.service';
export declare class UploadController {
    private cloudinaryService;
    constructor(cloudinaryService: CloudinaryService);
    uploadImage(file: Express.Multer.File, folder?: string): Promise<{
        url: string;
        publicId: string;
        provider: string;
        filename?: undefined;
    } | {
        url: string;
        filename: string;
        provider: string;
        publicId?: undefined;
    }>;
}
