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
exports.KeysService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let KeysService = class KeysService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findByGame(gameId) {
        return this.prisma.cdKey.findMany({
            where: { gameId },
            include: {
                game: { select: { title: true, platform: true } },
                orderItem: {
                    select: {
                        order: { select: { id: true, createdAt: true, user: { select: { email: true } } } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async addKeys(gameId, keys) {
        const normalizedKeys = [...new Set(keys.map((key) => key.trim()).filter(Boolean))];
        if (normalizedKeys.length === 0) {
            throw new common_1.BadRequestException('At least one valid key is required');
        }
        const game = await this.prisma.game.findUnique({ where: { id: gameId } });
        if (!game) {
            throw new common_1.NotFoundException('Game not found');
        }
        const existingKeys = await this.prisma.cdKey.findMany({
            where: {
                gameId,
                keyCode: { in: normalizedKeys },
            },
            select: { keyCode: true },
        });
        const existingKeySet = new Set(existingKeys.map((k) => k.keyCode));
        const newKeys = normalizedKeys.filter((key) => !existingKeySet.has(key));
        if (newKeys.length === 0) {
            throw new common_1.BadRequestException('All keys already exist');
        }
        const result = await this.prisma.cdKey.createMany({
            data: newKeys.map((keyCode) => ({
                gameId,
                keyCode,
                status: client_1.KeyStatus.AVAILABLE,
            })),
            skipDuplicates: true,
        });
        return {
            added: result.count,
            duplicates: keys.length - result.count,
        };
    }
    async reserveKey(gameId) {
        for (let attempt = 0; attempt < 3; attempt++) {
            const key = await this.prisma.cdKey.findFirst({
                where: {
                    gameId,
                    status: client_1.KeyStatus.AVAILABLE,
                },
                orderBy: { createdAt: 'asc' },
            });
            if (!key) {
                return null;
            }
            const result = await this.prisma.cdKey.updateMany({
                where: {
                    id: key.id,
                    status: client_1.KeyStatus.AVAILABLE,
                },
                data: {
                    status: client_1.KeyStatus.RESERVED,
                    reservedAt: new Date(),
                },
            });
            if (result.count === 1) {
                return key.id;
            }
        }
        return null;
    }
    async releaseKey(keyId) {
        await this.prisma.cdKey.updateMany({
            where: {
                id: keyId,
                status: client_1.KeyStatus.RESERVED,
            },
            data: {
                status: client_1.KeyStatus.AVAILABLE,
                reservedAt: null,
                orderItemId: null,
            },
        });
    }
    async markAsSold(keyId, orderItemId) {
        return this.prisma.cdKey.update({
            where: { id: keyId },
            data: {
                status: client_1.KeyStatus.SOLD,
                orderItemId,
            },
        });
    }
    async updateStatus(keyId, status) {
        const key = await this.prisma.cdKey.findUnique({ where: { id: keyId } });
        if (!key) {
            throw new common_1.NotFoundException('Key not found');
        }
        return this.prisma.cdKey.update({
            where: { id: keyId },
            data: { status },
        });
    }
    async deleteKey(keyId) {
        const key = await this.prisma.cdKey.findUnique({ where: { id: keyId } });
        if (!key) {
            throw new common_1.NotFoundException('Key not found');
        }
        if (key.status === client_1.KeyStatus.SOLD) {
            throw new common_1.BadRequestException('Cannot delete a sold key');
        }
        return this.prisma.cdKey.delete({ where: { id: keyId } });
    }
    async getStats(gameId) {
        const where = gameId ? { gameId } : {};
        const stats = await this.prisma.cdKey.groupBy({
            by: ['status'],
            where,
            _count: { status: true },
        });
        return stats.reduce((acc, curr) => {
            acc[curr.status.toLowerCase()] = curr._count.status;
            return acc;
        }, { available: 0, reserved: 0, sold: 0 });
    }
    async releaseExpiredReservations(minutesOld = 15) {
        const cutoff = new Date(Date.now() - minutesOld * 60 * 1000);
        const result = await this.prisma.cdKey.updateMany({
            where: {
                status: client_1.KeyStatus.RESERVED,
                reservedAt: { lt: cutoff },
            },
            data: {
                status: client_1.KeyStatus.AVAILABLE,
                reservedAt: null,
            },
        });
        return { released: result.count };
    }
};
exports.KeysService = KeysService;
exports.KeysService = KeysService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], KeysService);
//# sourceMappingURL=keys.service.js.map