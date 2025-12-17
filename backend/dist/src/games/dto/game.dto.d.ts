import { Platform } from '@prisma/client';
export declare class CreateGameDto {
    title: string;
    description?: string;
    platform: Platform;
    genre: string;
    price: number;
    imageUrl?: string;
    developer?: string;
    publisher?: string;
    releaseDate?: string;
    systemRequirements?: string;
    screenshots?: string[];
}
export declare class UpdateGameDto {
    title?: string;
    description?: string;
    platform?: Platform;
    genre?: string;
    price?: number;
    imageUrl?: string;
    developer?: string;
    publisher?: string;
    releaseDate?: string;
    systemRequirements?: string;
    screenshots?: string[];
}
