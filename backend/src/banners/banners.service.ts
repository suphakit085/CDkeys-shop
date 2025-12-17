import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BannersService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.banner.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' },
        });
    }

    async findAllAdmin() {
        return this.prisma.banner.findMany({
            orderBy: { order: 'asc' },
        });
    }

    async findOne(id: string) {
        const banner = await this.prisma.banner.findUnique({ where: { id } });
        if (!banner) {
            throw new NotFoundException('Banner not found');
        }
        return banner;
    }

    async create(data: {
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
        return this.prisma.banner.create({ data });
    }

    async update(id: string, data: {
        title?: string;
        subtitle?: string;
        description?: string;
        imageUrl?: string;
        bgColor?: string;
        link?: string;
        buttonText?: string;
        isActive?: boolean;
        order?: number;
    }) {
        const banner = await this.prisma.banner.findUnique({ where: { id } });
        if (!banner) {
            throw new NotFoundException('Banner not found');
        }
        return this.prisma.banner.update({
            where: { id },
            data,
        });
    }

    async delete(id: string) {
        const banner = await this.prisma.banner.findUnique({ where: { id } });
        if (!banner) {
            throw new NotFoundException('Banner not found');
        }
        return this.prisma.banner.delete({ where: { id } });
    }
}
