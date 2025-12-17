import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KeyStatus } from '@prisma/client';

@Injectable()
export class KeysService {
    constructor(private prisma: PrismaService) { }

    // Get all keys for a game (admin only)
    async findByGame(gameId: string) {
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

    // Bulk add keys
    async addKeys(gameId: string, keys: string[]) {
        // Check if game exists
        const game = await this.prisma.game.findUnique({ where: { id: gameId } });
        if (!game) {
            throw new NotFoundException('Game not found');
        }

        // Check for duplicate keys
        const existingKeys = await this.prisma.cdKey.findMany({
            where: {
                gameId,
                keyCode: { in: keys },
            },
            select: { keyCode: true },
        });

        const existingKeySet = new Set(existingKeys.map((k) => k.keyCode));
        const newKeys = keys.filter((k) => !existingKeySet.has(k));

        if (newKeys.length === 0) {
            throw new BadRequestException('All keys already exist');
        }

        // Create keys
        await this.prisma.cdKey.createMany({
            data: newKeys.map((keyCode) => ({
                gameId,
                keyCode,
                status: KeyStatus.AVAILABLE,
            })),
        });

        return {
            added: newKeys.length,
            duplicates: keys.length - newKeys.length,
        };
    }

    // Reserve a key for checkout
    async reserveKey(gameId: string): Promise<string | null> {
        const key = await this.prisma.cdKey.findFirst({
            where: {
                gameId,
                status: KeyStatus.AVAILABLE,
            },
        });

        if (!key) {
            return null;
        }

        await this.prisma.cdKey.update({
            where: { id: key.id },
            data: {
                status: KeyStatus.RESERVED,
                reservedAt: new Date(),
            },
        });

        return key.id;
    }

    // Release reserved key (on payment failure or cart abandonment)
    async releaseKey(keyId: string) {
        await this.prisma.cdKey.update({
            where: { id: keyId },
            data: {
                status: KeyStatus.AVAILABLE,
                reservedAt: null,
            },
        });
    }

    // Mark key as sold and link to order item
    async markAsSold(keyId: string, orderItemId: string) {
        return this.prisma.cdKey.update({
            where: { id: keyId },
            data: {
                status: KeyStatus.SOLD,
                orderItemId,
            },
        });
    }

    // Update key status (admin)
    async updateStatus(keyId: string, status: KeyStatus) {
        const key = await this.prisma.cdKey.findUnique({ where: { id: keyId } });
        if (!key) {
            throw new NotFoundException('Key not found');
        }

        return this.prisma.cdKey.update({
            where: { id: keyId },
            data: { status },
        });
    }

    // Delete a key (admin, only if not sold)
    async deleteKey(keyId: string) {
        const key = await this.prisma.cdKey.findUnique({ where: { id: keyId } });
        if (!key) {
            throw new NotFoundException('Key not found');
        }

        if (key.status === KeyStatus.SOLD) {
            throw new BadRequestException('Cannot delete a sold key');
        }

        return this.prisma.cdKey.delete({ where: { id: keyId } });
    }

    // Get key stats for a game
    async getStats(gameId?: string) {
        const where = gameId ? { gameId } : {};

        const stats = await this.prisma.cdKey.groupBy({
            by: ['status'],
            where,
            _count: { status: true },
        });

        return stats.reduce(
            (acc, curr) => {
                acc[curr.status.toLowerCase()] = curr._count.status;
                return acc;
            },
            { available: 0, reserved: 0, sold: 0 } as Record<string, number>,
        );
    }

    // Release expired reservations (called by cron or on demand)
    async releaseExpiredReservations(minutesOld = 15) {
        const cutoff = new Date(Date.now() - minutesOld * 60 * 1000);

        const result = await this.prisma.cdKey.updateMany({
            where: {
                status: KeyStatus.RESERVED,
                reservedAt: { lt: cutoff },
            },
            data: {
                status: KeyStatus.AVAILABLE,
                reservedAt: null,
            },
        });

        return { released: result.count };
    }
}
