import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { BannersService } from './banners.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { createImageFileFilter } from '../common/image-file-filter';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('banners')
export class BannersController {
  constructor(
    private bannersService: BannersService,
    private cloudinaryService: CloudinaryService,
  ) {}

  // Public: Get active banners (for homepage)
  @Get()
  async findAll() {
    return this.bannersService.findAll();
  }

  // Admin: Get all banners (including inactive)
  @Get('admin')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async findAllAdmin() {
    return this.bannersService.findAllAdmin();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.bannersService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async create(
    @Body()
    data: {
      title: string;
      subtitle?: string;
      description?: string;
      imageUrl?: string;
      bgColor?: string;
      link?: string;
      buttonText?: string;
      isActive?: boolean;
      order?: number;
    },
  ) {
    return this.bannersService.create(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(
    @Param('id') id: string,
    @Body()
    data: {
      title?: string;
      subtitle?: string;
      description?: string;
      imageUrl?: string;
      bgColor?: string;
      link?: string;
      buttonText?: string;
      isActive?: boolean;
      order?: number;
    },
  ) {
    return this.bannersService.update(id, data);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async delete(@Param('id') id: string) {
    return this.bannersService.delete(id);
  }

  @Post('upload-image')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      fileFilter: createImageFileFilter(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (this.cloudinaryService.isEnabled()) {
      const result = await this.cloudinaryService.uploadImage(file, 'banners');
      return {
        url: result.url,
        filename: result.publicId,
      };
    }

    const fs = await import('fs/promises');
    const path = await import('path');
    const uploadDir = path.join(process.cwd(), 'uploads', 'banners');
    await fs.mkdir(uploadDir, { recursive: true });

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `banner-${uniqueSuffix}${extname(file.originalname)}`;
    await fs.writeFile(path.join(uploadDir, filename), file.buffer);

    return {
      url: `/uploads/banners/${filename}`,
      filename,
    };
  }
}
