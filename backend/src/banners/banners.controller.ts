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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { BannersService } from './banners.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('banners')
export class BannersController {
    constructor(private bannersService: BannersService) { }

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
    async create(@Body() data: {
        title: string;
        subtitle?: string;
        description?: string;
        imageUrl?: string;
        bgColor?: string;
        link?: string;
        buttonText?: string;
        isActive?: boolean;
        order?: number;
    }) {
        return this.bannersService.create(data);
    }

    @Put(':id')
    @UseGuards(JwtAuthGuard, AdminGuard)
    async update(
        @Param('id') id: string,
        @Body() data: {
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
            storage: diskStorage({
                destination: './uploads/banners',
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    cb(null, `banner-${uniqueSuffix}${extname(file.originalname)}`);
                },
            }),
            fileFilter: (req, file, cb) => {
                if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
                    cb(new Error('Only image files are allowed!'), false);
                }
                cb(null, true);
            },
            limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
        }),
    )
    async uploadImage(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new Error('No file uploaded');
        }
        return {
            url: `/uploads/banners/${file.filename}`,
            filename: file.filename,
        };
    }
}
