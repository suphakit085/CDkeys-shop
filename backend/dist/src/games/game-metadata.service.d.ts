import { Platform } from '@prisma/client';
export type GameMetadataSearchResult = {
    source: 'rawg';
    sourceId: string;
    title: string;
    imageUrl?: string;
    releaseDate?: string;
    genres: string[];
    platforms: string[];
    rating?: number;
};
export type GameMetadataImport = {
    source: 'rawg';
    sourceId: string;
    sourceUrl: string;
    title: string;
    description?: string;
    platform: Platform;
    genre: string;
    imageUrl?: string;
    developer?: string;
    publisher?: string;
    releaseDate?: string;
    systemRequirements?: string;
    minimumSystemRequirements?: string;
    recommendedSystemRequirements?: string;
    features: string[];
    supportedLanguages: string[];
    activationRegion: string;
    ageRating?: string;
    screenshots: string[];
};
export declare class GameMetadataService {
    private readonly logger;
    private readonly rawgBaseUrl;
    searchRawgGames(query: string, pageSize?: number): Promise<GameMetadataSearchResult[]>;
    getRawgGame(rawgId: string): Promise<GameMetadataImport>;
    private fetchRawg;
    private getRawgApiKey;
    private names;
    private platformNames;
    private mapPlatform;
    private getPcRequirements;
    private getFeatureList;
    private toDateInputValue;
    private cleanText;
}
