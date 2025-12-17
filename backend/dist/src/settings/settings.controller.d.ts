import { SettingsService } from './settings.service';
export declare class SettingsController {
    private settingsService;
    constructor(settingsService: SettingsService);
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
    uploadLogo(file: Express.Multer.File): Promise<{
        url: string;
        filename: string;
    }>;
}
