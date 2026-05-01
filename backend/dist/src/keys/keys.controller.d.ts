import { KeysService } from './keys.service';
import { AddKeysDto, UpdateKeyStatusDto } from './dto/keys.dto';
export declare class KeysController {
    private keysService;
    constructor(keysService: KeysService);
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
    getStats(gameId?: string): Promise<Record<string, number>>;
    addKeys(dto: AddKeysDto): Promise<{
        added: number;
        duplicates: number;
    }>;
    updateStatus(id: string, dto: UpdateKeyStatusDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        gameId: string;
        status: import("@prisma/client").$Enums.KeyStatus;
        keyCode: string;
        reservedAt: Date | null;
        orderItemId: string | null;
    }>;
    deleteKey(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        gameId: string;
        status: import("@prisma/client").$Enums.KeyStatus;
        keyCode: string;
        reservedAt: Date | null;
        orderItemId: string | null;
    }>;
    releaseExpired(minutes?: string): Promise<{
        released: number;
    }>;
}
