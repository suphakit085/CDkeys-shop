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
        createdAt: Date;
        updatedAt: Date;
        gameId: string;
        status: import("@prisma/client").$Enums.KeyStatus;
        keyCode: string;
        reservedAt: Date | null;
        orderItemId: string | null;
    })[]>;
    addKeys(gameId: string, keys: string[]): Promise<{
        added: number;
        duplicates: number;
    }>;
    reserveKey(gameId: string): Promise<string | null>;
    releaseKey(keyId: string): Promise<void>;
    markAsSold(keyId: string, orderItemId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        gameId: string;
        status: import("@prisma/client").$Enums.KeyStatus;
        keyCode: string;
        reservedAt: Date | null;
        orderItemId: string | null;
    }>;
    updateStatus(keyId: string, status: KeyStatus): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        gameId: string;
        status: import("@prisma/client").$Enums.KeyStatus;
        keyCode: string;
        reservedAt: Date | null;
        orderItemId: string | null;
    }>;
    deleteKey(keyId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        gameId: string;
        status: import("@prisma/client").$Enums.KeyStatus;
        keyCode: string;
        reservedAt: Date | null;
        orderItemId: string | null;
    }>;
    getStats(gameId?: string): Promise<Record<string, number>>;
    releaseExpiredReservations(minutesOld?: number): Promise<{
        released: number;
    }>;
}
