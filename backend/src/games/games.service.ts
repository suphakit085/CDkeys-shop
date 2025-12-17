import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGameDto, UpdateGameDto } from './dto/game.dto';
import { Platform, KeyStatus } from '@prisma/client';

@Injectable()
export class GamesService {
    constructor(private prisma: PrismaService) { }

    async findAll(filters?: {
        platform?: Platform;
        genre?: string;
        minPrice?: number;
        maxPrice?: number;
        search?: string;
    }) {
        const where: Record<string, unknown> = {};

        if (filters?.platform) {
            where.platform = filters.platform;
        }

        if (filters?.genre) {
            where.genre = filters.genre;
        }

        if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
            where.price = {};
            if (filters?.minPrice !== undefined) {
                (where.price as Record<string, number>).gte = filters.minPrice;
            }
            if (filters?.maxPrice !== undefined) {
                (where.price as Record<string, number>).lte = filters.maxPrice;
            }
        }

        if (filters?.search) {
            where.title = {
                contains: filters.search,
                mode: 'insensitive',
            };
        }

        const games = await this.prisma.game.findMany({
            where,
            include: {
                _count: {
                    select: {
                        cdKeys: {
                            where: { status: KeyStatus.AVAILABLE },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return games.map((game) => ({
            ...game,
            availableKeys: game._count.cdKeys,
            _count: undefined,
        }));
    }

    async findOne(id: string) {
        const game = await this.prisma.game.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        cdKeys: {
                            where: { status: KeyStatus.AVAILABLE },
                        },
                    },
                },
            },
        });

        if (!game) {
            throw new NotFoundException('Game not found');
        }

        return {
            ...game,
            availableKeys: game._count.cdKeys,
            _count: undefined,
        };
    }

    async create(dto: CreateGameDto) {
        return this.prisma.game.create({
            data: {
                ...dto,
                price: dto.price,
            },
        });
    }

    async update(id: string, dto: UpdateGameDto) {
        await this.findOne(id);

        return this.prisma.game.update({
            where: { id },
            data: dto,
        });
    }

    async delete(id: string) {
        await this.findOne(id);

        // Check if game has sold keys (can't delete)
        const soldKeys = await this.prisma.cdKey.count({
            where: { gameId: id, status: 'SOLD' },
        });

        if (soldKeys > 0) {
            throw new BadRequestException('ไม่สามารถลบเกมที่มี keys ขายแล้วได้');
        }

        // Check if game has orders
        const orders = await this.prisma.orderItem.count({
            where: { gameId: id },
        });

        if (orders > 0) {
            throw new BadRequestException('ไม่สามารถลบเกมที่มี orders ได้');
        }

        // Delete all cdKeys first (available/reserved ones)
        await this.prisma.cdKey.deleteMany({
            where: { gameId: id },
        });

        // Then delete game
        return this.prisma.game.delete({
            where: { id },
        });
    }

    async getGenres() {
        const games = await this.prisma.game.findMany({
            select: { genre: true },
            distinct: ['genre'],
        });
        return games.map((g) => g.genre);
    }
}
