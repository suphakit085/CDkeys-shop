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
        gameId: string;
        keyCode: string;
        status: import("@prisma/client").$Enums.KeyStatus;
        reservedAt: Date | null;
        orderItemId: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    getStats(gameId?: string): Promise<Record<string, number>>;
    addKeys(dto: AddKeysDto): Promise<{
        added: number;
        duplicates: number;
    }>;
    updateStatus(id: string, dto: UpdateKeyStatusDto): Promise<{
        id: string;
        gameId: string;
        keyCode: string;
        status: import("@prisma/client").$Enums.KeyStatus;
        reservedAt: Date | null;
        orderItemId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteKey(id: string): Promise<{
        id: string;
        gameId: string;
        keyCode: string;
        status: import("@prisma/client").$Enums.KeyStatus;
        reservedAt: Date | null;
        orderItemId: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    releaseExpired(minutes?: string): Promise<{
        released: number;
    }>;
}
