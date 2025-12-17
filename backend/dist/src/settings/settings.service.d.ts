import { PrismaService } from '../prisma/prisma.service';
export declare class SettingsService {
    private prisma;
    constructor(prisma: PrismaService);
    getSettings(): Promise<{
        id: string;
        updatedAt: Date;
        storeName: string;
        logoUrl: string | null;
        faviconUrl: string | null;
        tagline: string | null;
        primaryColor: string | null;
    }>;
    updateSettings(data: {
        storeName?: string;
        logoUrl?: string;
        faviconUrl?: string;
        tagline?: string;
        primaryColor?: string;
    }): Promise<{
        id: string;
        updatedAt: Date;
        storeName: string;
        logoUrl: string | null;
        faviconUrl: string | null;
        tagline: string | null;
        primaryColor: string | null;
    }>;
}
