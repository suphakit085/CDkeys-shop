import { PrismaService } from '../prisma/prisma.service';
import { KeyStatus } from '@prisma/client';
export declare class KeysService {
    private prisma;
    constructor(prisma: PrismaService);
    findByGame(gameId: string): Promise<({
        game: {
            title: string;
            platform: import("@prisma/client").$Enums.Platform;
        };
        orderItem: {
            order: {
                id: string;
                createdAt: Date;
                user: {
                    email: string;
                };
            };
        } | null;
    } & {
        id: string;
        gameId: string;
        keyCode: string;
        status: import("@prisma/client").$Enums.KeyStatus;
        reservedAt: Date | null;
        orderItemId: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    addKeys(gameId: string, keys: string[]): Promise<{
        added: number;
        duplicates: number;
    }>;
    reserveKey(gameId: string): Promise<string | null>;
    releaseKey(keyId: string): Promise<void>;
    markAsSold(keyId: string, orderItemId: string): Promise<{
        id: string;
        gameId: string;
        keyCode: string;
        status: import("@prisma/client").$Enums.KeyStatus;
        reservedAt: Date | null;
        orderItemId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateStatus(keyId: string, status: KeyStatus): Promise<{
        id: string;
        gameId: string;
        keyCode: string;
        status: import("@prisma/client").$Enums.KeyStatus;
        reservedAt: Date | null;
        orderItemId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteKey(keyId: string): Promise<{
        id: string;
        gameId: string;
        keyCode: string;
        status: import("@prisma/client").$Enums.KeyStatus;
        reservedAt: Date | null;
        orderItemId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    getStats(gameId?: string): Promise<Record<string, number>>;
    releaseExpiredReservations(minutesOld?: number): Promise<{
        released: number;
    }>;
}
