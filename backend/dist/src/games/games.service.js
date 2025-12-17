"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GamesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let GamesService = class GamesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(filters) {
        const where = {};
        if (filters?.platform) {
            where.platform = filters.platform;
        }
        if (filters?.genre) {
            where.genre = filters.genre;
        }
        if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
            where.price = {};
            if (filters?.minPrice !== undefined) {
                where.price.gte = filters.minPrice;
            }
            if (filters?.maxPrice !== undefined) {
                where.price.lte = filters.maxPrice;
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
                            where: { status: client_1.KeyStatus.AVAILABLE },
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
    async findOne(id) {
        const game = await this.prisma.game.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        cdKeys: {
                            where: { status: client_1.KeyStatus.AVAILABLE },
                        },
                    },
                },
            },
        });
        if (!game) {
            throw new common_1.NotFoundException('Game not found');
        }
        return {
            ...game,
            availableKeys: game._count.cdKeys,
            _count: undefined,
        };
    }
    async create(dto) {
        return this.prisma.game.create({
            data: {
                ...dto,
                price: dto.price,
            },
        });
    }
    async update(id, dto) {
        await this.findOne(id);
        return this.prisma.game.update({
            where: { id },
            data: dto,
        });
    }
    async delete(id) {
        await this.findOne(id);
        const soldKeys = await this.prisma.cdKey.count({
            where: { gameId: id, status: 'SOLD' },
        });
        if (soldKeys > 0) {
            throw new common_1.BadRequestException('ไม่สามารถลบเกมที่มี keys ขายแล้วได้');
        }
        const orders = await this.prisma.orderItem.count({
            where: { gameId: id },
        });
        if (orders > 0) {
            throw new common_1.BadRequestException('ไม่สามารถลบเกมที่มี orders ได้');
        }
        await this.prisma.cdKey.deleteMany({
            where: { gameId: id },
        });
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
};
exports.GamesService = GamesService;
exports.GamesService = GamesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GamesService);
//# sourceMappingURL=games.service.js.map