import { Module, Global } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { UploadController } from './upload.controller';

@Global()
@Module({
    controllers: [UploadController],
    providers: [CloudinaryService],
    exports: [CloudinaryService],
})
export class CloudinaryModule { }
