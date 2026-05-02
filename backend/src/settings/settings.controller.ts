import {
  Controller,
  Get,
  Put,
  Body,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { createImageFileFilter } from '../common/image-file-filter';

@Controller('settings')
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  // Public: Get store settings
  @Get()
  async getSettings() {
    return this.settingsService.getSettings();
  }

  // Admin: Update settings
  @Put()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateSettings(
    @Body()
    data: {
      storeName?: string;
      logoUrl?: string;
      faviconUrl?: string;
      tagline?: string;
      primaryColor?: string;
    },
  ) {
    return this.settingsService.updateSettings(data);
  }

  // Admin: Upload logo
  @Post('upload-logo')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/settings',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now();
          cb(null, `logo-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: createImageFileFilter({ allowSvg: true }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    }),
  )
  uploadLogo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    return {
      url: `/uploads/settings/${file.filename}`,
      filename: file.filename,
    };
  }
}
